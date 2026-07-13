import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test SNS-to-SQS Filter Policies with LocalStack',
  description:
    'Test SNS-to-SQS filter policies with LocalStack, prove accepted and rejected message attributes, and catch routing defects before AWS deployment.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test SNS-to-SQS Filter Policies with LocalStack

The payments queue has one job: receive completed card payments from a shared SNS topic. Yet a refund notification appears in it during staging, and the consumer begins a capture workflow with the wrong event. The JSON payload looks harmless. The defect lives in the subscription's filter policy, where a missing attribute, an incorrect data type, or one permissive value changes routing before application code runs.

This is an integration boundary worth testing directly. A useful test creates an SNS topic and SQS queue, attaches the real JSON policy, publishes deliberately chosen message attributes, and observes which notifications cross the boundary. LocalStack makes that loop fast enough for a pull request while boto3 keeps the calls close to production AWS APIs.

This tutorial builds such a test in Python with pytest and Testcontainers. It covers positive and negative cases, exact and numeric matching, attribute versus body scope, queue isolation, eventual delivery, and the points where an emulator cannot replace an AWS smoke test.

## The routing decision SNS makes before SQS

An SQS subscription without a filter receives every notification published to its SNS topic. Once a filter policy is attached, SNS evaluates the policy independently for that subscription. Delivery occurs only when every policy key matches. Within one key's array, any listed condition can match. That distinction is the basis of a good test matrix: policy keys are ANDed, alternatives for one key are ORed.

Consider a queue that should receive high-value card payments from the EU or UK:

| Policy key | Accepted condition | Rejection boundary to test |
| --- | --- | --- |
| \`event_type\` | Exact string \`payment.completed\` | Similar \`payment.refunded\` must not arrive |
| \`method\` | Exact string \`card\` | Missing method and \`bank_transfer\` both reject |
| \`region\` | Either \`eu-west-1\` or \`eu-west-2\` | Case variant \`EU-WEST-1\` rejects because matching is case-sensitive |
| \`amount\` | Number greater than or equal to 100 | String type \`String\` is not a substitute for \`Number\` |

Message attributes not named by the policy are ignored. Policy keys absent from the published attributes are not ignored, they make the notification ineligible. For attribute filtering, nested JSON is not a supported policy shape. If the routing decision depends on nested payload fields, use \`FilterPolicyScope=MessageBody\` and publish a well-formed JSON object.

The distinction between the SNS envelope and the business payload also matters. By default, an SQS subscriber receives an SNS notification envelope whose \`Message\` field contains the original body. Enabling \`RawMessageDelivery\` places the published body directly in SQS. Filtering happens in SNS either way, so choose raw delivery based on the consumer contract, not as a workaround for a filter.

## Starting an isolated AWS surface with Testcontainers

A developer-wide LocalStack process invites state leakage: yesterday's subscription can still receive today's publish, and an old queue message can make a rejection case look accepted. Testcontainers gives each test session a container lifecycle. The Python LocalStack module exposes \`get_client(service_name)\`, returning boto3 clients already pointed at the mapped edge endpoint.

Install the small set of test dependencies:

\`\`\`bash
python -m pip install boto3 pytest testcontainers[localstack]
\`\`\`

Docker must be available to the test process. In a team repository, pin a LocalStack image version that the team has validated rather than silently following \`latest\`. Recent LocalStack image releases can also require authentication, so treat the image tag and any required token as explicit CI inputs. The example below uses the Python module's configured default to keep the API example independent of a guessed release tag.

## Provisioning the topic, queue, policy, and subscription

The fixture should return the resource identifiers and clients, not hide the topology behind a large test helper. When a routing assertion fails, those identifiers make diagnostics and one-off API inspection straightforward.

\`\`\`python
import json
import time
import uuid

import pytest
from testcontainers.localstack import LocalStackContainer


FILTER_POLICY = {
    "event_type": ["payment.completed"],
    "method": ["card"],
    "region": ["eu-west-1", "eu-west-2"],
    "amount": [{"numeric": [">=", 100]}],
}


@pytest.fixture(scope="session")
def local_aws():
    with LocalStackContainer() as localstack:
        yield {
            "sns": localstack.get_client("sns"),
            "sqs": localstack.get_client("sqs"),
        }


@pytest.fixture
def payment_route(local_aws):
    sns = local_aws["sns"]
    sqs = local_aws["sqs"]
    suffix = uuid.uuid4().hex[:8]

    topic_arn = sns.create_topic(Name=f"commerce-events-{suffix}")["TopicArn"]
    queue_url = sqs.create_queue(
        QueueName=f"high-value-card-payments-{suffix}"
    )["QueueUrl"]
    queue_arn = sqs.get_queue_attributes(
        QueueUrl=queue_url,
        AttributeNames=["QueueArn"],
    )["Attributes"]["QueueArn"]

    queue_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "sns.amazonaws.com"},
            "Action": "sqs:SendMessage",
            "Resource": queue_arn,
            "Condition": {"ArnEquals": {"aws:SourceArn": topic_arn}},
        }],
    }
    sqs.set_queue_attributes(
        QueueUrl=queue_url,
        Attributes={"Policy": json.dumps(queue_policy)},
    )

    subscription_arn = sns.subscribe(
        TopicArn=topic_arn,
        Protocol="sqs",
        Endpoint=queue_arn,
        Attributes={
            "FilterPolicy": json.dumps(FILTER_POLICY),
            "FilterPolicyScope": "MessageAttributes",
            "RawMessageDelivery": "true",
        },
        ReturnSubscriptionArn=True,
    )["SubscriptionArn"]

    route = {
        "sns": sns,
        "sqs": sqs,
        "topic_arn": topic_arn,
        "queue_url": queue_url,
        "subscription_arn": subscription_arn,
    }
    yield route
    sns.unsubscribe(SubscriptionArn=subscription_arn)
    sns.delete_topic(TopicArn=topic_arn)
    sqs.delete_queue(QueueUrl=queue_url)


def receive_until(sqs, queue_url, expected, timeout_seconds=4.0):
    messages = []
    deadline = time.monotonic() + timeout_seconds
    while len(messages) < expected and time.monotonic() < deadline:
        response = sqs.receive_message(
            QueueUrl=queue_url,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=1,
            MessageAttributeNames=["All"],
        )
        messages.extend(response.get("Messages", []))
    return messages
\`\`\`

The SQS resource policy is not decoration. In AWS, it authorizes the specific topic to call \`sqs:SendMessage\`. Keeping it in the LocalStack setup prevents the test environment from teaching an incomplete deployment pattern. Restricting \`aws:SourceArn\` also proves that the intended topic owns the route.

The short UUID prevents collisions among parallel pytest workers. Yielding the route lets the fixture unsubscribe and delete both resources after every case, so a positive message or duplicate subscription cannot contaminate the next negative assertion. Teardown can still be interrupted by a killed process, which is why unique names remain useful even when cleanup exists.

## Proving a matching notification crosses the subscription

The first test should demonstrate the exact business route, including data types. SNS message attributes use a nested structure with \`DataType\` and \`StringValue\`. A numeric value still travels through \`StringValue\`, but its \`DataType\` is \`Number\`, which controls how SNS evaluates the numeric operator.

\`\`\`python
def publish_payment(route, **overrides):
    attributes = {
        "event_type": {"DataType": "String", "StringValue": "payment.completed"},
        "method": {"DataType": "String", "StringValue": "card"},
        "region": {"DataType": "String", "StringValue": "eu-west-1"},
        "amount": {"DataType": "Number", "StringValue": "149.95"},
    }
    attributes.update(overrides)
    return route["sns"].publish(
        TopicArn=route["topic_arn"],
        Message='{"payment_id":"pay-481","currency":"EUR"}',
        MessageAttributes=attributes,
    )


def test_matching_attributes_reach_payment_queue(payment_route):
    publish_payment(payment_route)

    messages = receive_until(
        payment_route["sqs"],
        payment_route["queue_url"],
        expected=1,
    )

    assert len(messages) == 1
    assert json.loads(messages[0]["Body"]) == {
        "payment_id": "pay-481",
        "currency": "EUR",
    }
    assert messages[0]["MessageAttributes"]["amount"] == {
        "StringValue": "149.95",
        "DataType": "Number",
    }
\`\`\`

The body assertion confirms raw delivery and prevents a test from passing on some unrelated queue message. The attribute assertion protects the consumer-facing metadata contract in addition to the routing rule. Do not assert the generated message ID or receipt handle, because those values are intentionally variable.

## Demonstrating rejection without a false green

A negative routing test is harder than a positive one. Receiving no message at one instant does not establish that no message will arrive. The test must first establish an empty queue, publish exactly one ineligible notification, and poll for a bounded interval. Local emulation keeps that interval short. AWS smoke tests need a timeout chosen from observed delivery behavior rather than copied from this local value.

\`\`\`python
@pytest.mark.parametrize(
    "attribute_name,replacement",
    [
        (
            "event_type",
            {"DataType": "String", "StringValue": "payment.refunded"},
        ),
        (
            "method",
            {"DataType": "String", "StringValue": "bank_transfer"},
        ),
        (
            "region",
            {"DataType": "String", "StringValue": "EU-WEST-1"},
        ),
        (
            "amount",
            {"DataType": "Number", "StringValue": "99.99"},
        ),
    ],
)
def test_one_policy_mismatch_blocks_delivery(
    payment_route,
    attribute_name,
    replacement,
):
    assert receive_until(
        payment_route["sqs"],
        payment_route["queue_url"],
        expected=1,
        timeout_seconds=0.2,
    ) == []

    publish_payment(payment_route, **{attribute_name: replacement})

    rejected = receive_until(
        payment_route["sqs"],
        payment_route["queue_url"],
        expected=1,
        timeout_seconds=1.5,
    )
    assert rejected == []


def test_missing_required_attribute_blocks_delivery(payment_route):
    attributes = {
        "event_type": {"DataType": "String", "StringValue": "payment.completed"},
        "region": {"DataType": "String", "StringValue": "eu-west-2"},
        "amount": {"DataType": "Number", "StringValue": "250"},
    }
    payment_route["sns"].publish(
        TopicArn=payment_route["topic_arn"],
        Message='{"payment_id":"pay-482"}',
        MessageAttributes=attributes,
    )

    assert receive_until(
        payment_route["sqs"],
        payment_route["queue_url"],
        expected=1,
        timeout_seconds=1.5,
    ) == []
\`\`\`

Parameterization is appropriate here because each row mutates one dimension of the same policy. Keep the row names and failure output legible. Separate a missing-key case because it represents a different class of producer regression from a wrong value.

An even stronger suite creates a second, unfiltered audit queue on the same topic. For a rejected payment, assert that the audit queue receives the message while the payment queue does not. That control proves the publish succeeded and isolates the failure to filtering rather than topic delivery. It costs extra setup but pays for itself when diagnosing intermittent infrastructure tests.

## Exercising exact, anything-but, prefix, and numeric operators

Real policies often go beyond exact values. Test operators at their boundaries, not with arbitrary interior examples. A numeric range needs the lower boundary, a value just below it, and usually a representative value above it. A prefix rule needs a matching prefix, a near miss, and case variation if producers are inconsistent.

| Filter expression | One accepted attribute | One rejected attribute | Defect it exposes |
| --- | --- | --- | --- |
| \`{"numeric":[">=",100,"<",1000]}\` | Number \`100\` | Number \`99.99\` | Wrong inclusivity at the lower edge |
| \`{"anything-but":"test"}\` | String \`production\` | String \`test\` | Deny value accidentally allowed |
| \`{"prefix":"invoice-"}\` | String \`invoice-781\` | String \`invoices-781\` | Prefix widened by one character |
| \`{"exists":false}\` | Attribute omitted | Attribute present with any value | Producer starts sending forbidden metadata |

Do not turn an operator test into a combinatorial explosion. First give every condition one direct boundary test. Then add a few business-significant combinations, such as exactly 100 EUR in an accepted region. Pairwise generation can help with a large policy, but the final cases should still carry names that explain the routing risk.

\`String.Array\` deserves its own test when used. Its \`StringValue\` is a JSON array encoded as a string, for example \`["fraud-review","vip"]\`. Publishing a comma-separated value is not equivalent. Also remember that binary message attributes are ignored for attribute-based filter comparisons, so they are unsuitable routing inputs.

## Switching the policy to message-body scope

Payload filtering is the right choice when publishers already emit canonical JSON and duplicating routing data into attributes would create drift. Set the subscription attribute \`FilterPolicyScope\` to \`MessageBody\`. The same \`FilterPolicy\` attribute then addresses properties in the parsed message body. Unlike attribute scope, payload policies can describe nested objects.

A body-scope test should publish no routing attributes at all. That absence is intentional: it proves the body, not accidentally duplicated metadata, controls delivery. Include a malformed or non-JSON body rejection case because payload filtering assumes a well-formed JSON object. If the application sometimes publishes plain text, body scope is a product contract change, not merely a subscription setting.

When migrating scopes, run two subscriptions temporarily in a test topology: one attribute-scoped and one body-scoped, each targeting a different queue. Send a corpus of representative events and compare route decisions. This is more revealing than rewriting assertions one at a time, particularly where \`String.Array\` attributes become native JSON arrays.

For a broader view of event schemas, channels, and consumer expectations, the [AsyncAPI event-driven testing guide](/blog/asyncapi-event-driven-testing-guide-2026) complements these transport-level checks. AsyncAPI describes the contract, while the LocalStack test executes the broker decision.

## Queue hygiene for deterministic negative cases

SQS is stateful and uses visibility timeouts. Calling \`receive_message\` does not delete a message, it makes that message temporarily invisible. A later test can see it again. Either provision a fresh queue per case or delete every received control message with its receipt handle. Fresh queues give the cleanest rejection semantics; explicit deletion is faster for a large matrix.

Avoid using \`purge_queue\` before every example. In AWS, purge behavior has timing constraints, and building a suite around repeated purges produces poor parity. Unique queue names or fixture teardown are less surprising. If tests share one topic, each queue should have its own subscription ARN and cleanup path.

Parallel workers add another risk. A static queue name lets two pytest workers consume each other's evidence. Include the worker ID or a UUID in resource names, and never infer acceptance from approximate queue depth. \`ApproximateNumberOfMessages\` is useful diagnostic information, but receiving and inspecting a uniquely identified body is the stronger assertion.

## What LocalStack proves, and what AWS must still prove

LocalStack is excellent for rapid feedback on resource wiring, JSON serialization, supported filter operators, message attribute types, raw envelopes, and consumer-visible messages. It is not AWS, and a passing local suite is not proof of IAM, regional quotas, service propagation, CloudFormation behavior, encryption permissions, or every edge operator.

There is also a specific parity boundary: LocalStack documentation lists the \`cidr\` filter operator as unsupported. A route that depends on CIDR matching requires an AWS integration test. Treat unsupported behavior as an explicit test-layer decision, not as a reason to delete the policy test entirely.

| Test environment | Keep here | Do not claim from it |
| --- | --- | --- |
| Pure unit test of policy builder | JSON shape, key names, chosen operators | Actual SNS evaluation or SQS delivery |
| LocalStack integration | Topic-to-queue wiring and supported match decisions | Complete AWS parity, IAM propagation, quota enforcement |
| Dedicated AWS test account | Deployed policy, permissions, unsupported operators, encryption | Production traffic behavior under every consumer load |
| Production observability | Rejected/delivered counts and real event mix | Safe experimentation with knowingly wrong routes |

Use the cheapest layer that can detect a defect, but preserve one thin AWS check for the assumptions an emulator cannot own. If your team already standardizes ephemeral cloud dependencies, the [Testcontainers LocalStack AWS mocking guide](/blog/testcontainers-localstack-aws-mocking-guide) shows how this pattern fits a wider service test strategy.

## Comparing practical ways to test this route

Several tools can participate, but they answer different questions. Calling them interchangeable obscures gaps.

| Approach | Strength for SNS-to-SQS filtering | Limitation for this scenario | Best placement |
| --- | --- | --- | --- |
| LocalStack plus Testcontainers | Executes SNS and SQS APIs in an isolated Docker lifecycle | Some AWS behaviors and operators differ or are unsupported | Pull-request integration suite |
| Moto | Fast Python mocks for many AWS calls | In-process mocking is less representative of cross-service transport | Unit and component tests around AWS client code |
| AWS SAM local tooling | Useful for invoking Lambda handlers and local serverless workflows | Not a general SNS filter-policy emulator for this queue route | Lambda-focused developer workflow |
| Real AWS sandbox | Highest fidelity for policies, IAM, KMS, and deployment templates | Slower, costs money, requires cleanup and account controls | Post-deploy smoke or scheduled integration |

For this particular route, LocalStack earns its place because the behavior spans two managed services and a subscription resource. A hand-written fake that returns \`True\` from \`matches(policy, attributes)\` mostly tests your reimplementation of AWS logic. It cannot reveal that your deployment serialized \`Number\` as \`String\` or attached the policy to the wrong subscription.

## Making the route test useful in CI

Pin Python dependencies and the container image, cache image layers where your runner permits it, and expose container logs on failure. Run the narrow filter suite on changes to infrastructure templates, publisher attribute construction, or event contracts. A full repository build need not gate every policy edit if the targeted integration job provides quicker, clearer evidence.

Emit the filter policy, subscription ARN, topic ARN, queue URL, published message ID, and received bodies when a case fails. Do not print credentials or arbitrary production payloads. In LocalStack the credentials are synthetic, but the same logger may later execute against an AWS test account.

Keep policy creation in one production-owned function or infrastructure artifact if possible, then have the test consume that output. Copying JSON from Terraform into the test creates two documents that can agree while deployment drifts elsewhere. If direct reuse is impractical, add a small assertion that the deployed artifact's normalized policy equals the case matrix's policy.

Finally, classify failures. Container startup and Docker availability are harness failures. A publish that reaches the audit control but not the expected queue is a routing failure. A message that reaches both audit and a supposedly rejecting queue is a policy regression. This vocabulary turns a red CI job into an actionable ownership signal.

## Frequently Asked Questions

### Does RawMessageDelivery need to be true for SNS filter policies to work?

No. SNS evaluates the subscription filter before delivery. Raw delivery only changes the SQS message shape: with it enabled, the published body is delivered directly; without it, SQS receives the SNS notification envelope. Test whichever form your consumer parses.

### Why does a numeric rule reject an attribute containing the same digits?

Check \`DataType\`. For a numeric comparison, publish the attribute as \`Number\` even though boto3 carries the textual representation in \`StringValue\`. Also test the exact inclusive and exclusive boundaries written in the policy.

### How long should a rejected-message assertion wait in LocalStack?

Use a short bounded poll derived from your runner performance, and first prove the queue is empty. The 1.5-second window in the example is a local test choice, not an AWS delivery guarantee. A control queue makes the negative conclusion substantially stronger.

### Can one filter policy inspect both message attributes and the JSON body?

No. The subscription's \`FilterPolicyScope\` selects \`MessageAttributes\` or \`MessageBody\` for that policy. If migration requires comparing both models, create separate temporary subscriptions and compare their deliveries.

### Which LocalStack filter behavior requires an AWS test?

Any production route using an unsupported operator must be verified in AWS. LocalStack currently documents \`cidr\` as unsupported. IAM, KMS permissions, infrastructure deployment, quotas, and service propagation also deserve a thin AWS test even when matching passes locally.
`,
};
