import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Gatling Load Testing Tutorial 2026: Simulation DSL and CI',
  description:
    'A complete Gatling load testing tutorial for 2026: write simulations in the Scala DSL, model scenarios, run from the CLI, read reports, and compare Gatling vs JMeter.',
  date: '2026-07-01',
  category: 'Guide',
  content: `
# Gatling Load Testing Tutorial 2026: Simulation DSL and CI

Performance problems rarely show up on a developer's laptop with one user. They show up at 2 a.m. when a marketing campaign drives ten thousand concurrent visitors and your checkout endpoint starts timing out. **Gatling** is a load testing tool built to answer the question "what happens under real traffic?" before your customers answer it for you. It uses an asynchronous, non-blocking engine that generates thousands of virtual users from a single machine, and an expressive code-based DSL that lives in version control alongside your application.

This is a practical, code-first **Gatling tutorial for 2026**. We will install Gatling, write your first simulation in the Scala DSL, model realistic user journeys with feeders and checks, control load with injection profiles (ramps, constant rate, spikes), assert on response-time and error thresholds so builds fail on regressions, run everything from the command line, and read the HTML report. We will also cover the question everyone asks: **Gatling vs JMeter** (and k6), with a clear comparison table to help you choose.

Every simulation here is real, runnable code that works with Gatling 3.11+. Whether you are new to performance testing or migrating from a GUI tool, by the end you will be able to write, run, and gate a load test in CI. If you are still deciding on a tool, our [k6 vs JMeter](/blog/k6-vs-jmeter-performance-testing) comparison and the broader [load testing guide](/blog/load-testing-beginners-guide) are worth a read alongside this one, and the [QA skills](/skills) directory has ready-made performance-testing skills for AI coding agents.

## What Makes Gatling Different

Gatling's design goal is high load from modest hardware. Instead of one thread per virtual user (the classic JMeter model, which is memory-hungry), Gatling multiplexes many virtual users onto a small pool of threads using an event-driven core built on Akka and Netty. That means a single laptop can simulate tens of thousands of concurrent users where a thread-per-user tool would exhaust memory.

The second differentiator is that tests are code. A Gatling simulation is a Scala (or Java/Kotlin) class you commit to git, diff in pull requests, refactor, and reuse. There is no binary \`.jmx\` file that only opens in a GUI. This makes Gatling a natural fit for teams that treat performance tests as first-class engineering artifacts.

## Installing Gatling

The fastest path is the standalone bundle, but for CI you will want the Maven or Gradle plugin so tests build with your project. Here is the bundle route for a quick start:

\`\`\`bash
# Download and unzip the open-source bundle
curl -L -o gatling.zip \\
  https://repo1.maven.org/maven2/io/gatling/highcharts/gatling-charts-highcharts-bundle/3.11.5/gatling-charts-highcharts-bundle-3.11.5-bundle.zip
unzip gatling.zip -d gatling
cd gatling/gatling-charts-highcharts-bundle-3.11.5

# Simulations live in user-files/simulations
# Run the interactive launcher
./bin/gatling.sh
\`\`\`

For a Maven project, add the plugin so \`mvn gatling:test\` runs your simulations:

\`\`\`xml
<plugin>
  <groupId>io.gatling</groupId>
  <artifactId>gatling-maven-plugin</artifactId>
  <version>4.9.6</version>
</plugin>
\`\`\`

Simulations then live under \`src/test/scala\`. Gatling requires a JDK 11+ (JDK 17 or 21 recommended for 2026).

## Your First Simulation in the Scala DSL

A simulation has three parts: an HTTP protocol configuration (base URL, headers), a scenario (the sequence of requests a virtual user performs), and a setUp block that injects users into that scenario. Here is a complete, minimal example.

\`\`\`scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class BasicSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("https://api.example.com")
    .acceptHeader("application/json")
    .userAgentHeader("Gatling/perf-test")

  val scn = scenario("Browse products")
    .exec(
      http("List products")
        .get("/products")
        .check(status.is(200))
    )
    .pause(1.second)
    .exec(
      http("Product detail")
        .get("/products/42")
        .check(status.is(200))
    )

  setUp(
    scn.inject(atOnceUsers(10))
  ).protocols(httpProtocol)
}
\`\`\`

\`atOnceUsers(10)\` launches ten virtual users simultaneously. Each runs the scenario once: list products, wait a second (simulating think time), fetch a product. The \`check(status.is(200))\` validates the response; a failed check marks the request as a KO (failure) in the report.

## Modeling Realistic User Journeys with Checks and Extractors

Real load tests chain requests where later calls depend on earlier responses, for example logging in, capturing a token, then using it. Gatling's \`check\` mechanism both validates and extracts values into the virtual user's session.

\`\`\`scala
val checkout = scenario("Login and checkout")
  .exec(
    http("Login")
      .post("/auth/login")
      .body(StringBody("""{"user":"demo","pass":"demo"}""")).asJson
      .check(status.is(200))
      .check(jsonPath("$.token").saveAs("authToken"))
  )
  .exec(
    http("Create cart")
      .post("/cart")
      .header("Authorization", "Bearer #{authToken}")
      .check(status.is(201))
      .check(jsonPath("$.cartId").saveAs("cartId"))
  )
  .exec(
    http("Add item")
      .post("/cart/#{cartId}/items")
      .header("Authorization", "Bearer #{authToken}")
      .body(StringBody("""{"sku":"KB-01","qty":1}""")).asJson
      .check(status.is(200))
  )
\`\`\`

The \`#{authToken}\` and \`#{cartId}\` are Gatling Expression Language placeholders resolved from session data captured by earlier \`saveAs\` checks. This is how you build stateful, dependent request chains.

## Driving Data with Feeders

Hammering one endpoint with identical data is unrealistic and can hit caches that mask real performance. Feeders inject unique data per virtual user. A CSV feeder is the most common.

\`\`\`scala
// users.csv contains a header row: username,password
val credentials = csv("users.csv").circular

val login = scenario("Data-driven login")
  .feed(credentials)
  .exec(
    http("Login as #{username}")
      .post("/auth/login")
      .formParam("username", "#{username}")
      .formParam("password", "#{password}")
      .check(status.is(200))
  )
\`\`\`

The \`.circular\` strategy loops back to the start when records run out; alternatives include \`.random\`, \`.shuffle\`, and \`.queue\` (fails if it runs dry). Feeders keep each virtual user's requests distinct, producing traffic that resembles production.

## Controlling Load with Injection Profiles

The injection profile is where you shape traffic over time. Gatling separates the scenario (what a user does) from the load model (how many users arrive and when), which is one of its cleanest design ideas.

\`\`\`scala
setUp(
  checkout.inject(
    nothingFor(5.seconds),              // warm-up quiet period
    atOnceUsers(20),                    // initial burst
    rampUsers(200).during(2.minutes),   // gradual ramp to load
    constantUsersPerSec(50).during(5.minutes), // sustained arrival rate
    stressPeakUsers(500).during(30.seconds)    // spike test
  )
).protocols(httpProtocol)
\`\`\`

Common injection steps and when to use them:

| Injection step | Load pattern | Use case |
|---|---|---|
| \`atOnceUsers(n)\` | All n users at once | Quick smoke or burst |
| \`rampUsers(n).during(t)\` | Linearly ramp n users over t | Find the breaking point gradually |
| \`constantUsersPerSec(r).during(t)\` | r new users per second | Steady-state / soak testing |
| \`rampUsersPerSec(a).to(b).during(t)\` | Arrival rate ramps a to b | Model growing traffic |
| \`stressPeakUsers(n).during(t)\` | Aggressive spike to n | Spike / resilience testing |

## Assertions: Failing the Build on Regressions

A load test that only produces a pretty chart is a missed opportunity. Assertions turn Gatling into a quality gate: if response times or error rates cross a threshold, the run exits non-zero and CI fails.

\`\`\`scala
setUp(
  checkout.inject(rampUsers(200).during(2.minutes))
).protocols(httpProtocol)
 .assertions(
   global.responseTime.percentile(95).lt(800),  // p95 under 800 ms
   global.responseTime.max.lt(3000),            // no request over 3 s
   global.successfulRequests.percent.gt(99.0),  // >99% success
   forAll.failedRequests.count.lt(50)           // fewer than 50 KOs total
 )
\`\`\`

Percentile assertions matter more than averages: an average of 200 ms can hide a p99 of 5 seconds affecting one in a hundred users. Always gate on p95 or p99, not the mean.

## Running Gatling from the Command Line

For CI you want a headless, non-interactive run. With the Maven plugin:

\`\`\`bash
# Run a specific simulation, non-interactively
mvn gatling:test -Dgatling.simulationClass=simulations.BasicSimulation

# Standalone bundle, headless, naming the simulation
./bin/gatling.sh -s BasicSimulation -rf results/basic-run
\`\`\`

Parameterize the target and load via system properties so the same simulation runs against different environments without code changes:

\`\`\`scala
val baseUrl = System.getProperty("baseUrl", "https://staging.example.com")
val users   = System.getProperty("users", "100").toInt

val httpProtocol = http.baseUrl(baseUrl)
setUp(scn.inject(rampUsers(users).during(1.minute))).protocols(httpProtocol)
\`\`\`

\`\`\`bash
mvn gatling:test -Dgatling.simulationClass=simulations.BasicSimulation \\
  -DbaseUrl=https://prod-canary.example.com -Dusers=500
\`\`\`

## Reading the Gatling HTML Report

After every run Gatling writes a self-contained HTML report to the results directory and prints the path. Open \`index.html\` to see the global metrics, per-request breakdowns, and time-series charts. The numbers that matter most:

| Metric | What it tells you | Watch for |
|---|---|---|
| Response time percentiles (p50/p95/p99) | Latency distribution | p99 far above p50 means tail latency problems |
| Requests per second | Achieved throughput | A plateau while users climb signals saturation |
| Number of KO (failed) requests | Error volume under load | Errors rising with load reveals the breaking point |
| Active users over time | Concurrency achieved | Should match your injection profile |

The response-time-over-time chart overlaid with active users is the single most useful view: the point where latency spikes as concurrency climbs is your capacity limit.

## Running Gatling in GitHub Actions

Wire Gatling into CI so performance is checked on every merge to your release branch. The assertions from earlier make the job pass or fail automatically.

\`\`\`yaml
name: load-test
on:
  push:
    branches: [main]
jobs:
  gatling:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven
      - name: Run Gatling
        run: mvn gatling:test -Dgatling.simulationClass=simulations.BasicSimulation -DbaseUrl=https://staging.example.com
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: gatling-report
          path: target/gatling/**
\`\`\`

The \`if: always()\` on the upload step ensures you keep the report even when assertions fail, which is exactly when you most want to inspect it.

## Gatling vs JMeter vs k6

The tool choice comes down to how your team prefers to author tests, how much load you need per machine, and your ecosystem. Here is an honest comparison.

| Dimension | Gatling | JMeter | k6 |
|---|---|---|---|
| Test authoring | Code (Scala/Java/Kotlin DSL) | GUI (XML .jmx) + some scripting | Code (JavaScript) |
| Concurrency model | Async, event-driven (high load per node) | Thread-per-user (memory-heavy) | Async (Go, high load per node) |
| Language | Scala/Java/Kotlin | Java (GUI-driven) | JavaScript |
| Learning curve | Moderate (needs DSL familiarity) | Low to start, messy at scale | Low (JS is ubiquitous) |
| Reporting | Rich built-in HTML report | Basic; better via plugins/backends | CLI summary + cloud/Grafana |
| Protocol breadth | HTTP, WebSocket, SSE, JMS, gRPC | Very broad (JDBC, JMS, FTP, LDAP...) | HTTP, WebSocket, gRPC |
| Version control friendliness | Excellent (plain code) | Poor (large XML diffs) | Excellent (plain code) |
| Best fit | Engineering teams wanting maintainable, high-load tests in git | Teams needing many protocols or a GUI | JS-first teams wanting simple scripting |

Choose Gatling when you want maintainable, code-based tests, high load per machine, and first-class reporting. Choose JMeter when you need broad protocol coverage or a GUI for less technical users. Choose k6 when your team lives in JavaScript and wants the gentlest scripting curve. For deeper head-to-heads, see our [k6 vs JMeter](/blog/k6-vs-jmeter-performance-testing) comparison and the [load testing guide](/blog/load-testing-beginners-guide).

## Open vs Closed Workload Models

This is the most misunderstood concept in load testing, and Gatling makes both models explicit. A **closed** model fixes the number of concurrent users: a user finishes one journey, then starts another, so concurrency is capped no matter how slow the system gets. A closed model represents systems with a bounded population, like an internal tool with 500 named employees. Gatling's closed model uses \`constantConcurrentUsers\` and \`rampConcurrentUsers\`.

\`\`\`scala
import io.gatling.core.Predef._

setUp(
  checkout.inject(
    constantConcurrentUsers(100).during(5.minutes), // hold 100 in flight
    rampConcurrentUsers(100).to(300).during(2.minutes)
  )
).protocols(httpProtocol)
\`\`\`

An **open** model fixes the arrival rate: new users arrive at a set rate regardless of whether earlier users have finished. This is how public traffic actually behaves, visitors keep coming even when the site slows, so requests pile up and reveal true saturation. Open models use \`constantUsersPerSec\` and \`rampUsersPerSec\`, which you already saw in the injection section.

\`\`\`scala
setUp(
  checkout.inject(
    constantUsersPerSec(50).during(5.minutes),      // 50 new users every second
    rampUsersPerSec(10).to(200).during(3.minutes)   // arrival rate climbs
  )
).protocols(httpProtocol)
\`\`\`

The choice changes what you learn. Under a closed model a degrading system self-throttles (fewer journeys complete, so load never truly overwhelms it), which can hide a capacity cliff. Under an open model a degrading system accumulates in-flight requests until it collapses, exposing the real breaking point.

| Model | Controls | Concurrency when system slows | Represents | Gatling steps |
|---|---|---|---|---|
| Closed | Number of concurrent users | Stays constant (self-throttling) | Bounded populations, internal tools | \`constantConcurrentUsers\`, \`rampConcurrentUsers\` |
| Open | User arrival rate | Grows unbounded | Public web traffic, APIs | \`constantUsersPerSec\`, \`rampUsersPerSec\` |

For public-facing services, default to the open model: it is the honest representation of how the internet hits you. Do not mix the two model types in a single \`inject\` call, Gatling will reject it, because their semantics are incompatible.

## Advanced Feeders and Data-Driven Load

CSV feeders cover most needs, but realistic load often requires generated, batched, or externally sourced data. Gatling accepts any feeder that yields a \`Map\`, so you can build one from code. This example generates a unique idempotency key and a random amount per virtual user with an infinite Iterator-based feeder.

\`\`\`scala
import java.util.UUID
import scala.util.Random

val paymentFeeder = Iterator.continually(
  Map(
    "idempotencyKey" -> UUID.randomUUID().toString,
    "amount"         -> (Random.nextInt(9000) + 100)
  )
)

val payments = scenario("Data-driven payments")
  .feed(paymentFeeder)
  .exec(
    http("Charge")
      .post("/payments")
      .header("Idempotency-Key", "#{idempotencyKey}")
      .body(StringBody("""{"amount": #{amount}}""")).asJson
      .check(status.in(200, 201))
  )
\`\`\`

For large datasets, pull multiple records at once with \`.feed(credentials, 3)\` to bind three rows into indexed session keys (\`username1\`, \`username2\`, \`username3\`), useful when one journey needs several distinct entities. When your source is a database or an API, load it once at simulation start and wrap it as a feeder rather than querying inside the scenario, which would distort your timing measurements.

| Feeder strategy | Behavior when exhausted | Best for |
|---|---|---|
| \`.queue\` | Fails the simulation (default) | Fixed dataset, one pass, must-not-reuse data |
| \`.circular\` | Loops back to the first record | Reusable credentials, long soak tests |
| \`.random\` | Picks a random record each time | Cache-busting variety |
| \`.shuffle\` | Shuffles once, then reads in order | Randomized but no repeats within a pass |
| \`Iterator.continually\` | Never exhausts (generated) | Unique keys, UUIDs, synthetic data |

Choose \`.queue\` when each record must be consumed exactly once (for example, single-use signup tokens); choose \`.circular\` for credentials you can reuse across a long run.

## Distributed and Clustered Load with Gatling Enterprise

A single injector eventually hits its own limits: CPU, open file descriptors, or outbound bandwidth. When you need hundreds of thousands of virtual users, you distribute the load across multiple injector nodes. With open-source Gatling you can run the same simulation on several machines in parallel and merge the raw \`simulation.log\` files, then regenerate a combined report.

\`\`\`bash
# On each injector node, run the same simulation writing raw logs
./bin/gatling.sh -s simulations.BasicSimulation -nr -rf results/node-1

# Copy every node's simulation.log into one folder, then merge into a report
./bin/gatling.sh -ro results/merged
\`\`\`

The \`-nr\` flag means "no reports" (just produce the log), and \`-ro\` means "reports only" (build an HTML report from collected logs). This manual fan-out works but you coordinate the nodes, clock sync, and log collection yourself.

Gatling Enterprise (formerly FrontLine) automates all of that: it provisions injectors, streams live metrics to a real-time dashboard during the run, aggregates results centrally, and keeps historical trends so you can see whether p95 crept up over the last ten releases. It also supports cloud injectors in multiple regions, so you can generate load from the same geographies as your users. For most teams open-source in CI is sufficient; reach for Enterprise when you need very high scale, live observability during a run, or organization-wide trend reporting.

## Analyzing Reports and Setting CI Thresholds

The HTML report tells you what happened; assertions decide whether that is acceptable. The discipline that keeps performance from regressing silently is turning report observations into codified thresholds. Start by running a baseline against a known-good build and reading the percentiles, then set assertions a little above those numbers to catch regressions without flaking on noise.

\`\`\`scala
setUp(
  checkout.inject(constantUsersPerSec(50).during(10.minutes))
).protocols(httpProtocol)
 .assertions(
   details("Login").responseTime.percentile(95).lt(500),
   details("Add item").responseTime.percentile(99).lt(1200),
   global.responseTime.percentile(95).lt(800),
   global.successfulRequests.percent.gt(99.5),
   global.requestsPerSec.gt(400)
 )
\`\`\`

Note the per-request \`details("Login")\` assertions: a global p95 can look fine while one critical endpoint is slow, so gate the endpoints that matter individually. The table below maps report readings to the assertion you should write and the regression it protects against.

| Report reading | Assertion to codify | Regression it catches |
|---|---|---|
| p95 latency of a key endpoint | \`details("X").responseTime.percentile(95).lt(N)\` | A slow query or new N+1 on one route |
| Global success rate | \`global.successfulRequests.percent.gt(99.5)\` | New error path under load |
| Achieved throughput plateau | \`global.requestsPerSec.gt(N)\` | Reduced capacity from a config change |
| Max response time | \`global.responseTime.max.lt(N)\` | Tail-latency spikes, GC pauses |

In CI, keep thresholds in the simulation (versioned with the code) so a change to the performance budget is reviewed like any other diff. When a build fails on an assertion, the uploaded HTML report shows exactly which endpoint and which percentile breached, so triage starts from data, not guesswork.

## Best Practices for Reliable Load Tests

Run the load generator close to (but not on) the system under test to avoid measuring your own network. Warm up the target before recording numbers so JIT compilation and connection pools stabilize. Use feeders so caching does not flatter your results. Always assert on percentiles, not averages. Isolate the environment, a shared staging box gives noisy numbers. And version your simulations alongside application code so performance tests evolve with the API. When you are load-testing distributed systems, combine Gatling with the patterns in our [microservices testing](/blog/microservices-testing-strategies) guide to test each service and the whole under realistic traffic.

## Frequently Asked Questions

### What is Gatling used for?

Gatling is an open-source load and performance testing tool that simulates thousands of concurrent virtual users hitting an application to measure how it behaves under traffic. It reports latency percentiles, throughput, and error rates, and can fail a build when performance regresses. Teams use it to find capacity limits, catch slowdowns before release, and validate that services meet response-time SLAs.

### Is Gatling better than JMeter?

It depends on your needs. Gatling generates far more load per machine thanks to its async engine and stores tests as code, making them git-friendly and maintainable. JMeter offers broader protocol support (JDBC, JMS, LDAP, FTP) and a GUI that non-programmers can use. For engineering teams wanting high load and version-controlled tests, Gatling usually wins; for wide protocol coverage or GUI authoring, JMeter fits better.

### What language does Gatling use?

Gatling simulations are written in Scala, Java, or Kotlin using Gatling's expressive DSL. Scala is the original and most common choice, but the Java and Kotlin DSLs are fully supported and popular for teams already using those languages. You do not need deep Scala expertise, the DSL is high-level and reads almost like configuration, so most developers become productive quickly.

### How many virtual users can Gatling simulate?

Because Gatling uses an asynchronous, event-driven engine rather than one thread per user, a single modern machine can typically simulate tens of thousands of concurrent virtual users, often 20,000 or more depending on scenario complexity and hardware. For higher scale you distribute the load across multiple injector nodes or use Gatling Enterprise, which coordinates many generators from a control plane.

### How do I run Gatling in CI/CD?

Use the Gatling Maven or Gradle plugin so simulations build with your project, then run \`mvn gatling:test -Dgatling.simulationClass=YourSimulation\` in a CI job. Add \`.assertions(...)\` on response-time percentiles and error rates so the run exits non-zero on regressions, failing the pipeline. Upload the generated HTML report as a build artifact so you can inspect results even when assertions fail.

### What is the difference between Gatling open-source and Gatling Enterprise?

The open-source edition runs simulations locally or in CI from a single injector and produces static HTML reports, which is enough for most teams. Gatling Enterprise (formerly FrontLine) adds distributed load generation across many nodes, real-time live dashboards, historical trend tracking, team collaboration, and cloud injectors. Choose open-source for standard CI performance gates; consider Enterprise for very high scale or organization-wide reporting.

### Should I assert on average or percentile response times?

Always assert on percentiles, typically p95 or p99, not averages. An average can look healthy while a small fraction of users experience severe latency; a 200 ms mean can hide a 5-second p99 affecting one in a hundred requests. Percentiles reflect the tail of the distribution where real users feel pain, so gating on p95/p99 catches regressions that averages mask.

### What is the difference between an open and closed workload model?

A closed model fixes the number of concurrent users, so when the system slows it self-throttles and concurrency stays capped, which suits bounded populations like internal tools. An open model fixes the arrival rate of new users regardless of how fast the system responds, which mirrors public internet traffic and exposes true saturation as in-flight requests pile up. Use \`constantConcurrentUsers\` for closed and \`constantUsersPerSec\` for open; default to open for public-facing services.

## Conclusion

Gatling turns performance testing into a first-class engineering practice: simulations live in git, express realistic user journeys through the Scala DSL, model traffic precisely with injection profiles, and gate your pipeline on percentile-based assertions so regressions never reach production silently. Its async engine delivers high load from modest hardware, and its built-in reports make bottlenecks obvious. Whether you stick with Gatling, JMeter, or k6, the important thing is testing under real traffic before your users do it for you.

Ready to add performance testing to your toolkit? Browse the [QA skills](/skills) directory for AI coding agents to install ready-made Gatling, load-testing, and performance-engineering skills that plug straight into your workflow.
`,
};
