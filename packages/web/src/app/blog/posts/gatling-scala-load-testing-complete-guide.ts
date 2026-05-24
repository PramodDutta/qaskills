import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Gatling Scala Load Testing Complete Guide for 2026',
  description:
    'Master Gatling for JVM teams in 2026. Cover Scala and Java DSL, simulation lifecycle, feeders, checks, throttling, HTTP/2, Maven/Gradle, and Gatling Enterprise.',
  date: '2026-05-07',
  category: 'Performance',
  content: `
# Gatling Scala Load Testing Complete Guide for 2026

Gatling is the load testing tool that JVM-heavy teams pick when they want the highest single-machine throughput, the cleanest HTML report, and a strongly-typed DSL that catches errors at compile time. Built on Akka and Netty, Gatling routinely sustains 20,000 to 30,000 RPS per machine on commodity hardware. The simulation DSL reads naturally, the post-test HTML report is good enough to paste into release notes without editing, and the 2026 Java DSL means you no longer need to learn Scala if your team is purely Java.

This guide covers Gatling end-to-end in 2026. We walk through the simulation lifecycle, the Scala and Java DSLs, feeders for parameterization, checks and assertions, throttling and pacing, HTTP/2 support, the gRPC and Kafka plugins, Maven and Gradle integration, the bundled HTML report, distributed runs, and Gatling Enterprise (the commercial offering, formerly FrontLine). We compare to JMeter and k6 where it matters. For broader comparisons see [JMeter vs Locust vs Gatling](/blog/jmeter-vs-locust-vs-gatling-comparison) and browse the [skills directory](/skills).

## Why Gatling

Three reasons drive teams to Gatling. First, throughput. The Netty-based async core sustains an order of magnitude more RPS than JMeter for the same machine. If your test budget is fixed and your scale target is high, Gatling stretches the budget furthest. Second, report quality. Out of the box you get an interactive HTML report with percentile distributions, error breakdowns, and request timelines. Many teams stop building custom dashboards entirely. Third, type safety. The DSL is compiled. Typos, missing variables, and mis-shaped requests fail at build time, not at the start of a 30-minute test run.

The trade-off is the Scala compile cycle. The first build of a Scala project takes a couple of minutes. Subsequent incremental builds are fast, but the cold start cost discourages quick iteration. The Java DSL added in Gatling 3.7 mitigates this for teams that prefer Java tooling.

| Feature | Gatling | JMeter | k6 |
|---|---|---|---|
| Throughput per machine | 20k-30k RPS | 5k-8k RPS | 30k-40k RPS |
| Language | Scala or Java | Java/XML | JavaScript |
| Type safety | Compiled | Runtime | Runtime |
| HTML report | Excellent | Basic | None (cloud only) |
| Distributed OSS | Manual | Master-slave | k6-operator |
| Enterprise SaaS | Gatling Enterprise | BlazeMeter | k6 Cloud |
| Plugin ecosystem | Curated | Huge | xk6 |

## Installing Gatling

In 2026 the recommended path is the Gatling Maven or Gradle plugin. The standalone bundle still exists for ad-hoc use but project-managed installs are more reproducible.

\`\`\`xml
<!-- pom.xml -->
<plugin>
  <groupId>io.gatling</groupId>
  <artifactId>gatling-maven-plugin</artifactId>
  <version>4.13.0</version>
</plugin>

<dependency>
  <groupId>io.gatling.highcharts</groupId>
  <artifactId>gatling-charts-highcharts</artifactId>
  <version>3.13.0</version>
</dependency>
\`\`\`

\`\`\`bash
# Maven build and run
mvn gatling:test -Dgatling.simulationClass=com.example.CheckoutSimulation
\`\`\`

For Gradle teams the \`io.gatling.gradle\` plugin provides the same experience. Both produce identical HTML reports.

## Your First Simulation

A Gatling simulation is a Scala or Java class that extends \`Simulation\`. Inside you define a protocol, one or more scenarios, and an injection profile. Gatling compiles the file, runs the simulation, and writes the HTML report.

\`\`\`scala
// src/test/scala/com/example/CheckoutSimulation.scala
package com.example

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class CheckoutSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://staging.example.com")
    .acceptHeader("application/json")
    .userAgentHeader("Gatling/3.13")
    .check(status.in(200, 201, 204))

  val loginFeeder = csv("users.csv").random

  val login = exec(http("Login")
    .post("/auth/login")
    .body(StringBody("""{"email":"\${email}","password":"\${password}"}"""))
    .asJson
    .check(jsonPath("$.token").saveAs("token")))

  val browse = exec(http("Browse Products")
    .get("/products?q=laptop")
    .header("Authorization", "Bearer \${token}"))

  val checkout = exec(http("Add to Cart")
    .post("/cart")
    .header("Authorization", "Bearer \${token}")
    .body(StringBody("""{"sku":"ABC-123","qty":1}"""))
    .asJson
    .check(jsonPath("$.id").saveAs("cartId"))
  ).exec(http("Checkout")
    .post("/checkout")
    .header("Authorization", "Bearer \${token}")
    .body(StringBody("""{"cartId":"\${cartId}"}"""))
    .asJson)

  val scenario1 = scenario("CheckoutFlow")
    .feed(loginFeeder)
    .exec(login)
    .pause(2.seconds)
    .exec(browse)
    .pause(3.seconds)
    .exec(checkout)

  setUp(
    scenario1.inject(
      rampUsersPerSec(10) to 100 during 1.minute,
      constantUsersPerSec(100) during 5.minutes,
      rampUsersPerSec(100) to 0 during 1.minute
    )
  ).protocols(httpProtocol)
    .assertions(
      global.responseTime.percentile3.lt(800),
      global.responseTime.percentile4.lt(2000),
      global.failedRequests.percent.lt(1.0)
    )
}
\`\`\`

Run it:

\`\`\`bash
mvn gatling:test -Dgatling.simulationClass=com.example.CheckoutSimulation
\`\`\`

After the run completes Gatling prints the HTML report path. Open it in a browser and you see graphs, tables, and per-request breakdowns.

## The Java DSL

Gatling 3.7 added a Java DSL that mirrors the Scala DSL. For teams that prefer Java the syntax is essentially the same:

\`\`\`java
package com.example;

import io.gatling.javaapi.core.Simulation;
import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.http.HttpProtocolBuilder;
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

public class CheckoutSimulationJava extends Simulation {

    HttpProtocolBuilder httpProtocol = http
        .baseUrl("https://staging.example.com")
        .acceptHeader("application/json");

    ScenarioBuilder scn = scenario("Checkout")
        .feed(csv("users.csv").random())
        .exec(http("Login")
            .post("/auth/login")
            .body(StringBody("{\\"email\\":\\"#{email}\\",\\"password\\":\\"#{password}\\"}"))
            .asJson()
            .check(jsonPath("$.token").saveAs("token")))
        .exec(http("Browse")
            .get("/products")
            .header("Authorization", "Bearer #{token}"));

    {
        setUp(
            scn.injectOpen(
                rampUsersPerSec(10).to(100).during(60),
                constantUsersPerSec(100).during(300)
            )
        ).protocols(httpProtocol)
        .assertions(
            global().responseTime().percentile3().lt(800),
            global().failedRequests().percent().lt(1.0)
        );
    }
}
\`\`\`

The patterns are identical. The Java DSL uses \`#{var}\` instead of Scala's \`\${var}\` for template substitution. Otherwise the API is one-to-one.

## Feeders

Feeders inject data into a simulation. The most common feeder is CSV. Each virtual user picks one row.

\`\`\`scala
val users = csv("users.csv").random      // Random order
val users = csv("users.csv").queue       // Round-robin, one user one row
val users = csv("users.csv").circular    // Round-robin, loops

val jsonUsers = jsonFile("users.json").random

// In-memory feeder
val customFeeder = Iterator.continually(Map(
  "email" -> ("user" + scala.util.Random.nextInt(10000) + "@example.com"),
  "password" -> "demo"
))
\`\`\`

For unique-per-VU data use \`queue\`. For random-per-iteration use \`random\`. For test reproducibility use \`circular\` which makes the data deterministic across runs.

Database-backed feeders use the JDBC plugin:

\`\`\`scala
val dbUsers = jdbcFeeder(
  "jdbc:postgresql://localhost/test",
  "user",
  "password",
  "SELECT email, password FROM test_users LIMIT 1000"
).circular
\`\`\`

## Checks and Assertions

Checks validate per-request properties. Assertions validate aggregate properties at end of test.

\`\`\`scala
// Per-request checks
.check(status.is(200))
.check(jsonPath("$.id").saveAs("id"))
.check(jsonPath("$.status").is("active"))
.check(regex("token=([a-f0-9]+)").saveAs("token"))
.check(responseTimeInMillis.lt(500))
.check(bodyString.notNull)

// End-of-test assertions
.assertions(
  global.responseTime.percentile3.lt(800),       // p95 < 800ms
  global.responseTime.percentile4.lt(2000),      // p99 < 2000ms
  global.failedRequests.percent.lt(1.0),         // < 1% errors
  global.requestsPerSec.gte(500),                // >= 500 RPS
  details("Login").responseTime.percentile3.lt(500),
  details("Checkout").failedRequests.percent.lt(0.5)
)
\`\`\`

When an assertion fails Gatling exits with non-zero code, which CI consumes as a failure signal.

| Assertion Target | Description | Use Case |
|---|---|---|
| global | All requests | Overall SLO |
| details(name) | Specific request | Per-route SLO |
| forAll | Every request individually | Strict per-request |
| responseTime | Latency stats | p95/p99 |
| failedRequests | Error counts and rate | Reliability |
| requestsPerSec | Throughput | Capacity |
| count | Total requests | Volume check |

## Throttling and Pacing

By default Gatling sends requests as fast as the simulation allows. For closed-model load (constant active users) use \`constantUsersPerSec\` and \`constantConcurrentUsers\`. For open-model load (arriving users per second) use the arrival-rate methods.

\`\`\`scala
setUp(
  scenario1.inject(
    nothingFor(10.seconds),
    atOnceUsers(50),
    rampUsers(100) during 30.seconds,
    constantUsersPerSec(50) during 5.minutes randomized,
    rampUsersPerSec(50) to 200 during 1.minute
  )
).protocols(httpProtocol)
 .throttle(
    reachRps(1000) in 30.seconds,
    holdFor(5.minutes),
    jumpToRps(2000),
    holdFor(1.minute)
 )
\`\`\`

Throttle limits the global RPS even if the injection profile would inject more. This is useful for capping at a known service limit during stress tests.

## HTTP/2 Support

Gatling supports HTTP/2 out of the box. Enable it on the protocol:

\`\`\`scala
val httpProtocol = http
  .baseUrl("https://example.com")
  .enableHttp2
  .http2PriorKnowledge(Map("example.com" -> true))
\`\`\`

HTTP/2 multiplexes streams over a single TCP connection. For high-RPS tests against an HTTP/2 origin this reduces connection setup overhead significantly. Note that some load balancers terminate HTTP/2 and re-establish HTTP/1.1 to the origin, so verify your test config matches the protocol your target supports end to end.

## gRPC and Kafka

For gRPC use \`gatling-grpc-plugin\`:

\`\`\`scala
import com.github.phisgr.gatling.grpc.Predef._

val grpcConf = grpc(managedChannelBuilder("api.example.com", 443).useTransportSecurity())

val grpcScenario = scenario("gRPC")
  .exec(grpc("ListProducts")
    .rpc(ProductsGrpc.METHOD_LIST_PRODUCTS)
    .payload(ListRequest.newBuilder().setQuery("laptop").build())
    .check(statusCode.is(Status.Code.OK)))

setUp(grpcScenario.inject(atOnceUsers(100))).protocols(grpcConf)
\`\`\`

For Kafka use \`gatling-kafka\`:

\`\`\`scala
import com.github.kafkanaut.gatling.kafka.Predef._

val kafkaConf = kafka.topic("orders")
  .properties(Map(
    "bootstrap.servers" -> "kafka:9092",
    "key.serializer" -> "org.apache.kafka.common.serialization.StringSerializer",
    "value.serializer" -> "org.apache.kafka.common.serialization.StringSerializer"
  ))

val kafkaScenario = scenario("Produce")
  .exec(kafka("Produce").send[String, String]("key", """{"id":1}"""))

setUp(kafkaScenario.inject(constantUsersPerSec(100) during 5.minutes)).protocols(kafkaConf)
\`\`\`

The plugins cover the most common non-HTTP protocols. For exotic protocols you write a custom \`Action\` in Scala, which is straightforward but requires Scala fluency.

## Bundled HTML Report

The Gatling HTML report is its signature feature. Every run produces a directory with an index.html plus assets. Open it in any browser. You get:

- Global stats: total requests, OK rate, response time distribution, percentiles.
- Per-request breakdowns: same stats for each named request.
- Response time over time: line chart showing latency vs test progress.
- Active users over time: see when the ramp peaks.
- Response time distribution: histogram showing the latency spread.
- Active users per scenario: see scenario contribution.

No customization is needed for the report to be useful. For dashboards across multiple test runs you ship results into a separate system; see the Gatling Enterprise section.

## Distributed Runs

Open-source Gatling has no built-in distributed mode. You run multiple Gatling JVMs in parallel and merge the JSON results. The typical pattern: one orchestrator (Ansible, Terraform, or a CI job) launches N injector VMs, each runs the same simulation, and after completion you collect their simulation log files and run \`gatling-charts\` to merge.

\`\`\`bash
# On each injector
mvn gatling:test -Dgatling.simulationClass=com.example.CheckoutSimulation

# Collect simulation logs
scp injector-*:target/gatling/checkout-*/simulation.log ./logs/

# Merge and generate combined report
gatling.sh -ro logs/ -rf merged-report/
\`\`\`

This is more work than JMeter master-slave or Locust master-worker. For teams running large distributed tests regularly, Gatling Enterprise is the answer.

## Gatling Enterprise

Gatling Enterprise (formerly FrontLine) is the commercial product. It adds:

- Cloud or self-hosted control plane
- Auto-managed distributed injectors
- Scheduled tests
- Multi-test trend dashboards
- RBAC and team workspaces
- Slack and email alerting

For organizations running fifty or more load tests a month it is typically cheaper than equivalent SRE hours. Pricing is per injector-hour and varies by tier.

| Feature | Open Source | Enterprise |
|---|---|---|
| Single-machine runs | Yes | Yes |
| Distributed runs | Manual | Built-in |
| Cloud injectors | No | Yes (AWS, Azure, GCP) |
| Trend dashboards | No | Yes |
| Scheduled tests | No | Yes |
| RBAC | No | Yes |
| Cost | Free | Subscription |

## CI Integration

Standard pattern with GitHub Actions:

\`\`\`yaml
name: Gatling Tests

on:
  pull_request:
    branches: [main]

jobs:
  gatling:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Cache Maven
        uses: actions/cache@v4
        with:
          path: ~/.m2
          key: maven-\${{ hashFiles('pom.xml') }}

      - name: Run Gatling
        env:
          BASE_URL: \${{ vars.STAGING_URL }}
        run: |
          mvn gatling:test \\
            -Dgatling.simulationClass=com.example.CheckoutSimulation \\
            -DbaseUrl=\$BASE_URL

      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: gatling-report
          path: target/gatling/
\`\`\`

The Gatling plugin exit code is non-zero if assertions fail, which fails the CI job. The HTML report is uploaded as an artifact for download.

## Conclusion

Gatling is the right load tool for JVM teams that want the best report and the highest throughput per machine. The Scala DSL is the original, the Java DSL is a viable alternative, and the bundled HTML report saves hours of dashboard work. For distributed runs at scale Gatling Enterprise is excellent but paid; open-source distribution requires more setup than JMeter or Locust.

If you are evaluating Gatling, run a small simulation locally first. Look at the HTML report. If it gives your team the visibility they need, you may not need a dashboard layer at all. From there scale to Gatling Enterprise if your test volume warrants it.

Browse the [skills directory](/skills) for Gatling AI agent skills and read [JMeter vs Locust vs Gatling](/blog/jmeter-vs-locust-vs-gatling-comparison) for tool comparisons.
`,
};
