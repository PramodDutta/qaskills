import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Toxiproxy Network Failure Testing Guide',
  description:
    'Run Toxiproxy network failure testing for latency, resets, bandwidth limits, and dependency resilience without fragile staging outages in CI.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# Toxiproxy Network Failure Testing Guide

Your service does not need a dramatic outage to fail badly. A payment API that responds in nine seconds instead of ninety milliseconds can tie up worker pools, exhaust HTTP clients, and turn a small dependency wobble into a customer-visible incident. Toxiproxy is useful because it lets you put those ugly network conditions between your application and a real dependency while the test remains local, repeatable, and specific.

Toxiproxy is a TCP proxy with an HTTP API. You create a proxy that listens on one host and port, points it at the real upstream, then add "toxics" such as latency, bandwidth limits, timeouts, slow close behavior, or connection resets. The application still talks to a normal endpoint. The test changes the network between the app and dependency.

This guide is practical Toxiproxy usage for QA and SDET teams. It covers proxy topology, latency injection, connection resets, database dependency checks, CI cleanup, and when to stop at Toxiproxy versus using a broader chaos platform. For resilience strategy beyond local dependency tests, see [chaos engineering resilience testing](/blog/chaos-engineering-resilience-testing). For a managed platform approach to fault experiments, compare the workflow in the [Gremlin chaos engineering tutorial](/blog/gremlin-chaos-engineering-tutorial-2026).

## Putting the Proxy in the Right Place

Toxiproxy belongs between the code under test and the dependency whose network behavior you want to disturb. If your service calls Postgres at \`postgres:5432\`, the test points the service at \`toxiproxy:15432\`, and Toxiproxy forwards traffic to \`postgres:5432\`. The database is still real. The network path is controlled.

That placement gives you a clean test boundary:

| Dependency | Proxy listens on | Upstream target | Failure worth testing |
|---|---|---|---|
| Postgres | \`127.0.0.1:15432\` | \`postgres:5432\` | Query timeout, reconnect, transaction rollback |
| Redis | \`127.0.0.1:16379\` | \`redis:6379\` | Cache miss fallback, circuit breaker behavior |
| Payment API sandbox | \`127.0.0.1:18080\` | \`sandbox-payments:8080\` | Client timeout, idempotent retry |
| SMTP server | \`127.0.0.1:10250\` | \`mailhog:1025\` | Queueing and retry of outbound mail |

The proxy should be created by the test or by a test fixture that can clean it up. Long-lived manually configured proxies become another shared environment hazard. If a developer leaves a latency toxic enabled, the next test failure looks mysterious.

## Creating Proxies Through the HTTP API

The HTTP API is the most portable way to drive Toxiproxy. The examples below use \`curl\` so the shape is unambiguous. A proxy definition needs a name, a listen address, and an upstream address.

\`\`\`bash
curl -sS -X POST http://127.0.0.1:8474/proxies \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "payments",
    "listen": "127.0.0.1:18080",
    "upstream": "127.0.0.1:8080",
    "enabled": true
  }'

curl -sS http://127.0.0.1:8474/proxies/payments
\`\`\`

If the service under test reads \`PAYMENT_BASE_URL=http://127.0.0.1:18080\`, every payment call now passes through the proxy. With no toxics, the proxy should behave transparently. Always prove the no-toxic path first. If the application cannot pass through a clean proxy, a later latency test will waste your time.

For test isolation, use unique proxy names or reset the proxy state before each scenario. Many teams name proxies after the test process, for example \`payments-pr-1827\`, when tests run in parallel.

## Injecting Latency Toxics

Latency is the fault that finds most client mistakes. It exposes missing deadlines, worker starvation, queue buildup, retry storms, and confused UI loading states. Toxiproxy's latency toxic adds delay to the downstream or upstream stream. Downstream means traffic from upstream back to the client. For HTTP responses, downstream latency often models a slow dependency response.

\`\`\`bash
curl -sS -X POST http://127.0.0.1:8474/proxies/payments/toxics \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "slow-payment-response",
    "type": "latency",
    "stream": "downstream",
    "toxicity": 1.0,
    "attributes": {
      "latency": 2500,
      "jitter": 250
    }
  }'
\`\`\`

The \`toxicity\` value controls how often the toxic applies. A value of 1.0 means every matching connection is affected. For deterministic regression tests, use 1.0. Partial toxicity is useful for exploratory resilience experiments, but it can make automated assertions flaky if the test expects every call to be delayed.

A good latency test asserts behavior, not only elapsed time. For a payment call, you might assert that the application returns a controlled timeout response, does not charge twice on retry, and records a metric. The clock assertion should be a guardrail, not the only signal.

| Latency scenario | Expected application behavior | Assertion target |
|---|---|---|
| Response exceeds client timeout | Request fails with mapped timeout error | HTTP status, error code, log event |
| First attempt slow, second normal | Retry uses same idempotency key | Payment sandbox received one charge |
| Cache service slow | Application falls back to database or stale value | Response body and cache metrics |
| Database commit slow | API does not return success before transaction resolves | Database state after response |

Remove toxics after each test:

\`\`\`bash
curl -sS -X DELETE \
  http://127.0.0.1:8474/proxies/payments/toxics/slow-payment-response
\`\`\`

Cleanup is not optional. Network fault tests are powerful because they alter shared paths. That same power makes leftovers hazardous.

## Simulating Connection Resets and Timeouts

Latency is not the same as a broken connection. Many clients handle slow responses but fail awkwardly when a socket is reset or a dependency accepts a connection and then stops responding. Toxiproxy provides toxics such as \`reset_peer\` and \`timeout\` for these cases.

\`\`\`bash
curl -sS -X POST http://127.0.0.1:8474/proxies/payments/toxics \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "reset-payment-socket",
    "type": "reset_peer",
    "stream": "downstream",
    "toxicity": 1.0,
    "attributes": {
      "timeout": 0
    }
  }'
\`\`\`

A reset test is especially useful for idempotency. If the client sends a payment request and the connection drops before the response is read, the application may not know whether the upstream processed it. Retrying without an idempotency key can double-charge. Retrying with a key lets the upstream return the original result.

Timeout toxics model a connection that stops moving data. That is different from a quick reset. It finds missing socket timeouts and operations that hang until an external orchestrator kills the process. If your HTTP client has no request deadline, a timeout toxic will expose it immediately.

## Java Integration Tests With Testcontainers

For JVM services, Testcontainers has a Toxiproxy module that can keep the dependency, proxy, and application configuration in the same test lifecycle. The example below places a proxy in front of Postgres and then adds downstream latency before running repository code.

\`\`\`java
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import eu.rekawek.toxiproxy.model.ToxicDirection;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.ToxiproxyContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers
class AccountRepositoryNetworkTest {
  @Container
  static PostgreSQLContainer<?> postgres =
      new PostgreSQLContainer<>("postgres:16-alpine");

  @Container
  static ToxiproxyContainer toxiproxy =
      new ToxiproxyContainer(DockerImageName.parse("ghcr.io/shopify/toxiproxy:2.9.0"));

  @Test
  void queryTimesOutWhenDatabaseResponseIsDelayed() throws Exception {
    ToxiproxyContainer.ContainerProxy proxy = toxiproxy.getProxy(postgres, 5432);
    proxy.toxics().latency("postgres-latency", ToxicDirection.DOWNSTREAM, 3_000);

    String jdbcUrl = "jdbc:postgresql://" + proxy.getContainerIpAddress() + ":"
        + proxy.getProxyPort() + "/" + postgres.getDatabaseName();

    AccountRepository repository = AccountRepository.connect(
        jdbcUrl,
        postgres.getUsername(),
        postgres.getPassword(),
        500
    );

    assertThatThrownBy(() -> repository.findAccount("acct-123"))
        .hasMessageContaining("timed out");

    proxy.toxics().get("postgres-latency").remove();
  }
}
\`\`\`

This is a dependency resilience test, not a mock. Postgres is real, the driver is real, and the network has the fault. That makes the failure more trustworthy than a unit test that throws a made-up exception from a repository mock.

## Bandwidth Limits and Backpressure

Bandwidth toxics are useful when payload size matters: report downloads, object storage reads, image uploads, backup streams, and event consumers that pull large batches. A service that behaves well with a quick 200 response can still fail when the body trickles in slowly.

Use bandwidth tests to verify backpressure and cancellation. If a user cancels a large export, does the server stop reading? If an object store download slows to a crawl, does the API keep worker threads occupied forever? If an event consumer receives data slowly, does it extend leases correctly or create duplicate processing?

| Toxic type | Best used for | Common bug revealed |
|---|---|---|
| \`latency\` | Slow request or response start | Missing deadlines, bad retry policy |
| \`bandwidth\` | Slow body transfer | Memory buffering, no cancellation |
| \`timeout\` | Connection that stops moving | Hung client operations |
| \`reset_peer\` | Abrupt socket failure | Non-idempotent retries |
| \`slow_close\` | Connections that close slowly | Pool exhaustion |

Do not mix many toxics in a first regression test. One fault per scenario gives you a cleaner failure. Combined faults are useful later, after the application's expected behavior under each single fault is already clear.

## CI Hygiene for Network Fault Suites

Network fault tests need stricter cleanup than ordinary API tests. Reset proxies after each test, use unique names in parallel runs, and fail fast when Toxiproxy's control API is unavailable. If the proxy process is down, the application may fail with connection refused before the test has even applied a toxic.

Keep timeouts tight. A test that waits thirty seconds to prove a two-second client deadline is broken will slow every failure. Configure the client with small test-only deadlines and assert those deadlines. The production timeout can still be longer, but the resilience behavior should be the same.

The best CI artifact is not a screenshot. It is a small bundle: the toxic definition, application logs for the request id, dependency logs if available, and the final assertion. When a reset test fails, the reviewer needs to know whether the app retried, whether the upstream saw two calls, and which error reached the caller.

## Choosing Faults From Real Incidents

The best Toxiproxy scenarios come from incidents and near misses. If production once saw Redis latency during failover, write a Redis latency test. If a vendor API reset connections during deploys, write a reset test around that client. If object downloads slowed during a region issue, write a bandwidth test for the export path. Real history keeps the suite grounded.

Do not create an enormous matrix of every toxic against every dependency. That looks thorough and usually becomes slow noise. Pick faults that match a dependency's failure profile and the application's responsibility. A cache can degrade to a miss. A payment provider must preserve idempotency. A database timeout may require transaction cleanup. An email service outage may queue work and return accepted.

Name scenarios after expected behavior rather than toxic type. "Payment retry reuses idempotency key after socket reset" is better than "reset peer toxic test." The first name tells the reviewer what product risk is covered. The second name only describes the mechanism.

Keep a mapping from incidents to tests. When an incident action item says "add network resilience coverage," link the resulting Toxiproxy test. During later cleanup, that link explains why the test exists and which failure it protects against.

This mapping also helps prune old scenarios. If a dependency is retired or a client library changes its timeout model, revisit the related test instead of carrying it forever. Resilience suites age like any other suite. They should track the current architecture, not the architecture that existed during last year's outage.

Document the expected fallback beside each scenario. A slow Redis test might expect stale data, while a slow payment provider might expect a pending order and no duplicate charge. That expectation tells future maintainers whether a changed response is a regression or an intentional resilience policy update.

Without that note, teams often "fix" a resilience test by weakening the assertion instead of preserving the user-facing contract.

That is how resilience coverage loses its purpose.

## Retrying Without Creating a Second Incident

Toxiproxy is excellent at exposing retry policies that look sensible in code review and dangerous in production. A client that retries three times with no jitter may amplify a dependency slowdown. Ten application instances doing that together can turn a partial outage into a traffic spike against the unhealthy service.

Test retries with observable upstream calls. For HTTP services, record the idempotency key and request count at the dependency. For databases, inspect whether the transaction was committed once, rolled back, or repeated. For queues, check whether the message was acknowledged before the retry path ran. The important assertion is not "retry happened." The important assertion is "retry happened safely."

Use Toxiproxy to create a first-attempt failure, then remove the toxic before the second attempt when you want to test recovery. That pattern proves the application can move from failure to success without manual restart. For a payment workflow, the expected behavior might be: first call resets, second call uses the same idempotency key, user sees a pending state, reconciliation later confirms one charge. For a cache workflow, the expected behavior may be no retry at all because stale data is safer than blocking the request.

Backoff timing deserves a small number of direct tests. You do not need to verify every millisecond, but you should catch zero-delay loops and retry counts that exceed the budget. If the production policy allows three attempts over two seconds, a test with a 300 millisecond dependency timeout can verify the same shape at smaller scale.

Circuit breakers need a different style. Add latency or reset toxics until the breaker opens, assert the application fails fast, then remove the toxic and verify half-open recovery. A breaker that opens and never recovers is an outage. A breaker that never opens is a resource exhaustion risk. Toxiproxy gives you the repeatable fault needed to test both sides.

Finally, make retry tests single-threaded before you make them concurrent. A single request should be safe before you test a burst. After that, run a small parallel scenario to catch pool exhaustion and thundering herd behavior. Keep the assertions tied to real user outcomes: controlled error, no duplicate side effect, no unbounded latency, and recovery after the dependency is healthy.

## Frequently Asked Questions

### Should Toxiproxy replace mocks for dependency failures?

No. Use mocks for fast unit-level branches and Toxiproxy for integration behavior where the real client, protocol, timeout, and retry settings matter. If the bug depends on sockets, pools, or deadlines, a proxy test is more credible.

### Which direction should I use for latency toxics?

For slow responses, start with downstream because that delays bytes returning from the upstream to your client. For slow request uploads, use upstream. The direction depends on the traffic stream you want to disturb, so name the scenario around the user-visible symptom.

### Can Toxiproxy test UDP services?

Toxiproxy is designed for TCP connections. It is a good fit for HTTP, Postgres, Redis, SMTP, and similar TCP dependencies. For UDP protocols, use a different network simulation approach.

### Why do my Toxiproxy tests pass locally but fail in parallel CI?

Shared proxy names and ports are common causes. Give each test process its own proxy name and listen port, or create the proxy inside an isolated container network. Also verify that toxics are removed even when assertions fail.

### How much network chaos belongs in a pull request gate?

Keep PR gates narrow: one or two deterministic faults for critical dependencies. Run broader combinations, partial toxicity, and longer degradation experiments in scheduled jobs or dedicated resilience environments.
`,
};
