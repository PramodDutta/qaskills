import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Gatling Feeder Data Strategies: Choose Queue, Shuffle, Random, or Circular',
  description: 'Apply Gatling feeder data strategies with capacity math, unique credentials, realistic data mixes, distributed runs, validation, and failure diagnosis.',
  date: '2026-08-08',
  category: 'Performance',
  content: `
# Gatling Feeder Data Strategies: Choose Queue, Shuffle, Random, or Circular

The right **Gatling feeder data strategies** follow one decision: may two feed operations legally receive the same record? Use \`queue\` when a record must be consumed once in source order, \`shuffle\` when it must be consumed once in randomized order, \`random\` when reuse is allowed and independent random selection is desirable, and \`circular\` when reuse is allowed but deterministic source order matters. That choice controls data collisions, exhaustion, cache behavior, and reproducibility.

A feeder is shared by the virtual users that consume it. Each call to \`feed\` takes a record and injects its keys into that virtual user's Gatling Session. The strategy belongs to the feeder, not to the workload injection profile. You can model a correct arrival rate and still run a meaningless test if every request reuses one hot product, or if two virtual users submit the same single-use credential.

This article uses the current Gatling Java SDK and classpath resource layout. It gives capacity formulas, complete simulations, data validation, and distributed-run safeguards. For broader runner tradeoffs, see [k6 versus JMeter in 2026](/blog/k6-vs-jmeter-2026). Once the data model is credible, use the [p99 tail latency analysis guide](/blog/performance-testing-p99-tail-latency-analysis) to interpret the slowest requests without hiding them behind averages.

## Start with record ownership, not file format

CSV versus JSON is a serialization decision. Strategy is an ownership decision. Ask what a record represents and what must happen after consumption.

| Record meaning | Reuse allowed? | Order important? | Starting strategy |
| --- | ---: | ---: | --- |
| Single-login test account | No during a run | Usually no | \`shuffle\` |
| One-time coupon | No | Sometimes yes for audit | \`queue\` |
| Search phrase | Yes | No | \`random\` |
| Product catalog row | Yes | Yes for reproducibility | \`circular\` |
| Mutable customer record | Only after reset | Depends | \`queue\` plus cleanup |
| Read-only regional page | Yes | Often grouped | separate circular feeders |

\`queue\` is the default built-in strategy. It consumes records in source order, never handing the same record out twice, and fails the run when exhausted. \`shuffle\` also consumes each record once but randomizes the order. \`random\` samples with replacement, so the stock never exhausts and the same row can appear repeatedly. \`circular\` walks the source in order and returns to the beginning.

The official feeder reference is https://docs.gatling.io/concepts/session/feeders/. Keep that page close when an AI coding agent proposes a method name. Old examples on the web can preserve APIs that no longer exist. In particular, current Gatling removed manual \`eager\` and \`batch\` loading mode controls, so do not add those methods from historical snippets.

## Calculate consumption before choosing a finite strategy

For \`queue\` and \`shuffle\`, feeder capacity is a correctness condition. Count feed operations, not virtual users. A user that feeds once before login consumes one row. A user that feeds inside \`repeat(5)\` consumes five. A call that feeds three records at once consumes three.

For a simple scenario:

\`required records = virtual users × feed calls per completed journey × repeated journeys\`

Then add a deliberate reserve only if the workload permits unused records. The number should come from the injection design, retry behavior, and aborted-user policy. Do not invent a blanket percentage and call it safe.

| Scenario shape | Users | Feeds per user | Minimum records |
| --- | ---: | ---: | ---: |
| Login once | 500 | 1 | 500 |
| Three unique orders per user | 200 | 3 | 600 |
| Feed two recipients in one action | 150 | 2 | 300 |
| Loop until a fixed duration | unknown | unbounded | finite queue is unsafe without a cap |

Open workload models complicate capacity because arrivals are rate-based. For a constant illustrative arrival rate \`r\` over \`t\` seconds with one feed per arrival, plan for \`r × t\` records, plus any separately injected ramp phases. If the scenario can restart or retry the feed action, include those paths explicitly.

## Prove a unique-credential queue in a complete simulation

Create \`src/test/resources/data/credentials.csv\` with credentials reserved for the authorized test environment. Never commit real user secrets. This illustrative file uses placeholders accepted by a dedicated test service.

\`\`\`csv
username,password,accountId
load-user-001,test-only-001,acct-001
load-user-002,test-only-002,acct-002
load-user-003,test-only-003,acct-003
\`\`\`

The following class consumes each credential exactly once. It uses \`queue\`, requires three users, and checks the authenticated response. Place it in the simulation source tree of a Gatling Java project.

\`\`\`java
package perf.simulations;

import io.gatling.javaapi.core.FeederBuilder;
import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.core.Simulation;
import io.gatling.javaapi.http.HttpProtocolBuilder;

import static io.gatling.javaapi.core.CoreDsl.atOnceUsers;
import static io.gatling.javaapi.core.CoreDsl.csv;
import static io.gatling.javaapi.core.CoreDsl.scenario;
import static io.gatling.javaapi.http.HttpDsl.http;
import static io.gatling.javaapi.http.HttpDsl.status;

public class UniqueCredentialSimulation extends Simulation {
  private final HttpProtocolBuilder httpProtocol = http
      .baseUrl(System.getProperty("baseUrl", "https://api.example.test"))
      .acceptHeader("application/json");

  private final FeederBuilder<String> credentials =
      csv("data/credentials.csv").queue();

  private final ScenarioBuilder authenticated = scenario("unique accounts")
      .feed(credentials)
      .exec(
          http("read own account")
              .get("/accounts/#{accountId}")
              .basicAuth("#{username}", "#{password}")
              .check(status().is(200))
      );

  {
    setUp(authenticated.injectOpen(atOnceUsers(3))).protocols(httpProtocol);
  }
}
\`\`\`

This code gives the test a useful failure mode. If someone raises \`atOnceUsers(3)\` to four without adding data, Gatling reports feeder exhaustion instead of silently reusing an account. That protects the assumption that no two virtual users mutate the same profile.

Use \`shuffle\` instead if source order could bias results. For example, a CSV sorted by customer tier can cause early ramp users to be entirely free-tier accounts and later users to be enterprise accounts. \`shuffle\` preserves uniqueness while mixing their arrival order.

## Fail feeder validation before the load phase begins

Gatling's CSV parser can read a valid file that is logically unsuitable: blank usernames, duplicate account IDs, unexpected tiers, or too few records. Run a small preflight test in the build before the simulation. The following JUnit test uses only the JDK and JUnit, and checks the illustrative CSV shape without exposing passwords in failure output.

\`\`\`java
package perf.data;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CredentialDataTest {
  @Test
  void credentialsAreUniqueAndSufficient() throws IOException {
    Path path = Path.of("src/test/resources/data/credentials.csv");
    List<String> lines = Files.readAllLines(path);
    assertFalse(lines.isEmpty());
    assertEquals("username,password,accountId", lines.get(0));

    Set<String> usernames = new HashSet<>();
    Set<String> accountIds = new HashSet<>();
    for (String line : lines.subList(1, lines.size())) {
      String[] columns = line.split(",", -1);
      assertEquals(3, columns.length, "Unexpected CSV column count");
      assertFalse(columns[0].isBlank(), "Blank username");
      assertFalse(columns[1].isBlank(), "Blank password");
      assertTrue(usernames.add(columns[0]), "Duplicate username");
      assertTrue(accountIds.add(columns[2]), "Duplicate accountId");
    }
    assertTrue(usernames.size() >= 3, "Not enough credentials for this profile");
  }
}
\`\`\`

This parser deliberately fits a controlled fixture without quoted commas. Gatling's CSV parser follows RFC 4180 behavior, but \`String.split\` does not. If your validation file contains quoting, commas, or embedded newlines, use an established CSV library already approved in your project. Do not pretend the preflight above is a general CSV parser.

## Use random only when collisions are valid behavior

\`random\` samples with replacement. It is excellent for search keywords, public catalog categories, or read-only help topics. It is dangerous for one-time credentials, unique carts, destructive updates, and records protected by optimistic locking. A dataset with 10,000 rows does not make collisions impossible; replacement sampling explicitly allows them.

What people get wrong is treating \`random\` as a shuffled queue. The words sound similar, but their exhaustion and duplication semantics are opposite. \`shuffle\` gives each row once, in random order. \`random\` can give row 17 twice before row 3 appears at all.

This complete simulation uses a random search-term feeder because duplicate searches are valid. The CSV belongs at \`src/test/resources/data/search-terms.csv\` with header \`term\` and at least one nonblank row.

\`\`\`java
package perf.simulations;

import io.gatling.javaapi.core.FeederBuilder;
import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.core.Simulation;

import java.time.Duration;

import static io.gatling.javaapi.core.CoreDsl.constantUsersPerSec;
import static io.gatling.javaapi.core.CoreDsl.csv;
import static io.gatling.javaapi.core.CoreDsl.scenario;
import static io.gatling.javaapi.http.HttpDsl.http;
import static io.gatling.javaapi.http.HttpDsl.status;

public class SearchSamplingSimulation extends Simulation {
  private final FeederBuilder<String> terms =
      csv("data/search-terms.csv").random();

  private final ScenarioBuilder search = scenario("search sampling")
      .feed(terms)
      .exec(
          http("search")
              .get("/search")
              .queryParam("q", "#{term}")
              .check(status().is(200))
      );

  {
    setUp(
        search.injectOpen(constantUsersPerSec(2).during(Duration.ofSeconds(30)))
    ).protocols(http.baseUrl("https://shop.example.test"));
  }
}
\`\`\`

The rate and duration are illustrative. Match the injection model to how work arrives in production. Most public websites are modeled as open systems because arrivals continue even when responses slow. Feeder choice does not correct a mismatched workload model.

## Choose circular for repeatable reusable catalogs

\`circular\` is useful when rows can repeat and the order helps reproduce a run. Product IDs, static pages, and read-only tenant configurations often fit. With products A, B, C and five feeds, the observed sequence is A, B, C, A, B.

That predictability makes data-related diagnosis easier, but concurrent scheduling can still change which virtual user receives a given row. If the requirement is "user 12 always owns product B," a shared circular feeder is not that mapping. Put the product in the user's initial data or derive it through a deterministic session function.

Here is a circular catalog whose numeric stock threshold is transformed from the CSV string into an integer. The file needs headers \`sku,minimumStock\`.

\`\`\`java
package perf.simulations;

import io.gatling.javaapi.core.FeederBuilder;
import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.core.Simulation;

import static io.gatling.javaapi.core.CoreDsl.atOnceUsers;
import static io.gatling.javaapi.core.CoreDsl.csv;
import static io.gatling.javaapi.core.CoreDsl.scenario;
import static io.gatling.javaapi.http.HttpDsl.http;
import static io.gatling.javaapi.http.HttpDsl.jsonPath;
import static io.gatling.javaapi.http.HttpDsl.status;

public class CatalogSimulation extends Simulation {
  private final FeederBuilder<Object> products = csv("data/products.csv")
      .transform((key, value) ->
          key.equals("minimumStock") ? Integer.valueOf(value) : value)
      .circular();

  private final ScenarioBuilder browse = scenario("catalog cycle")
      .feed(products)
      .exec(
          http("read inventory")
              .get("/inventory/#{sku}")
              .check(status().is(200))
              .check(
                  jsonPath("$.available").ofInt().validate(
                      "meets minimum stock",
                      (actual, session) -> {
                        int minimum = session.getInt("minimumStock");
                        if (actual < minimum) {
                          throw new RuntimeException("Available stock is below the fixture minimum");
                        }
                        return actual;
                      }
                  )
              )
      );

  {
    setUp(browse.injectOpen(atOnceUsers(10)))
        .protocols(http.baseUrl("https://shop.example.test"));
  }
}
\`\`\`

The transform runs on feeder values before injection into the Session. Without it, CSV values are strings and numeric checks can behave differently or fail conversion. Reject malformed integers during preflight so the load run does not spend time discovering a bad row.

## Preserve production proportions with separate populations

A single flat feeder often produces the wrong business mix. If 70 percent of production searches are ordinary catalog terms, 20 percent are long-tail phrases, and 10 percent are known zero-result terms, a 100-row file with arbitrary counts only approximates that distribution accidentally.

Use separate scenarios and injection rates when each category deserves independent reporting and an explicit traffic share. The percentages below are illustrative, and the total rate is deliberately small for a safe example environment.

\`\`\`java
package perf.simulations;

import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.core.Simulation;

import java.time.Duration;

import static io.gatling.javaapi.core.CoreDsl.constantUsersPerSec;
import static io.gatling.javaapi.core.CoreDsl.csv;
import static io.gatling.javaapi.core.CoreDsl.scenario;
import static io.gatling.javaapi.http.HttpDsl.http;
import static io.gatling.javaapi.http.HttpDsl.status;

public class SearchMixSimulation extends Simulation {
  private ScenarioBuilder population(String name, String file) {
    return scenario(name)
        .feed(csv(file).random())
        .exec(
            http(name)
                .get("/search")
                .queryParam("q", "#{term}")
                .check(status().is(200))
        );
  }

  private final ScenarioBuilder ordinary =
      population("ordinary search", "data/search-ordinary.csv");
  private final ScenarioBuilder longTail =
      population("long-tail search", "data/search-long-tail.csv");
  private final ScenarioBuilder zeroResult =
      population("zero-result search", "data/search-zero-result.csv");

  {
    Duration duration = Duration.ofMinutes(2);
    setUp(
        ordinary.injectOpen(constantUsersPerSec(7).during(duration)),
        longTail.injectOpen(constantUsersPerSec(2).during(duration)),
        zeroResult.injectOpen(constantUsersPerSec(1).during(duration))
    ).protocols(http.baseUrl("https://shop.example.test"));
  }
}
\`\`\`

Separate populations make reports legible and keep the ratio in code review. They also allow different checks, pauses, or endpoints per group. If you need a single end-to-end user journey with conditional branches, use Gatling's documented conditional DSL, but keep data selection semantics explicit.

## Keep correlated records together through the journey

A row should contain fields that belong to the same business entity. Feeding \`username\` from one source and \`accountId\` from another random source can create impossible pairs and false authorization failures. Prefer one credential row containing every stable key required for login and ownership checks.

Dynamic values created during the journey are correlation data, not feeder data. Capture a CSRF token, cart ID, or resource version from the response that created it and save it to the Session. Do not pre-generate server-owned tokens into CSV just to avoid writing a response check.

| Data kind | Source | Lifetime | Recommended handling |
| --- | --- | --- | --- |
| Test identity | provisioned dataset | run or environment | queue or shuffle |
| Search term | curated corpus | reusable | random |
| Product key | catalog snapshot | reusable | circular or random |
| CSRF token | live response | one session | response check and \`saveAs\` |
| Created order ID | live response | one journey | response check and \`saveAs\` |
| One-time coupon | provisioned dataset | one successful use | queue plus teardown policy |

This division keeps the load model truthful. Feeders seed independent inputs; checks correlate state produced by the system under test.

## Diagnose exhaustion instead of masking it with circular

A realistic failure starts after 18 minutes: Gatling stops with a message that the feeder has no more records. The dataset contains 20,000 users, apparently more than the 10,000 injected users. Someone changes \`queue\` to \`circular\`, and the run completes, but authentication errors rise because accounts overlap.

The correct diagnosis counts consumption. The scenario logs in, logs out, then repeats the whole block three times. It calls \`feed\` inside the repeat, so 10,000 users can consume up to 30,000 records. The dataset was undersized. Circular hid the test-design bug and violated unique ownership.

Investigate in this order:

1. Locate every \`feed\` call using that feeder.
2. Determine whether it sits inside \`repeat\`, \`during\`, retries, or conditional re-entry.
3. Count multi-record feed operations.
4. Calculate arrivals for all injection phases.
5. Decide whether each repeat truly needs a new identity.
6. Increase data, move \`feed\` outside the loop, or redesign the ownership model.

Do not treat exhaustion as a performance result. It is a harness failure unless the test explicitly measures behavior when a business data pool is exhausted.

## Protect uniqueness in distributed execution

Local uniqueness does not automatically become global uniqueness. If four independent load generators each receive the same credential file and each creates its own queue feeder, the same first credential can be consumed four times. Gatling Enterprise provides a documented \`shard\` option for supported distributed file feeders. In an open-source multi-process setup, pre-split the data yourself and pass a distinct resource artifact to each process.

Your CI variables must be unambiguous. Build filenames with braces so shell parsing cannot greedily absorb underscores into a variable name.

\`\`\`bash
set -eu

: "\${CI_PIPELINE_ID:?CI_PIPELINE_ID is required}"
: "\${CI_NODE_INDEX:?CI_NODE_INDEX is required}"

artifact="credentials_\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}.csv"
test -s "\${artifact}"
echo "Using feeder shard \${artifact}"
\`\`\`

The script verifies only that a selected shard exists and is nonempty. Generate and validate shards in a separate preparation step, ensure the header appears in each, and prove account IDs do not overlap across files. Never rely on process start time to select a shard.

## Review generated feeder changes like application code

AI coding agents can quickly add a feeder, but the review prompt should state the invariants:

- identify whether records may repeat;
- calculate worst-case consumption from injection and loops;
- keep correlated entity fields in one row;
- validate headers, blanks, uniqueness, and capacity before load;
- preserve production category proportions explicitly;
- separate static input from response correlation;
- explain how distributed generators avoid overlap;
- keep secrets out of source control and reports.

Ask the agent to show the capacity calculation beside the feeder declaration in review notes. That one artifact catches more errors than a generic request to "make test data realistic."

## Instrument data coverage without logging sensitive rows

A run can complete with zero feeder errors and still exercise a narrow slice. Random sampling may over-select popular rows in a small run, circular selection may never reach the end of a large catalog, and conditional journeys may leave some fed records unused. Add low-cardinality labels that describe the intended category, such as \`customerTier\`, \`region\`, or \`searchClass\`, then use those values in request names or application-side test telemetry only when cardinality stays bounded.

Never place usernames, passwords, tokens, full customer IDs, or unbounded product IDs in Gatling request names. High-cardinality names fragment reports and sensitive values can persist in logs or artifacts. Prefer a request name such as \`search [long-tail]\` over \`search [wireless keyboard model 123]\`. If the application accepts an authorized test-run header, send a run identifier and category so observability teams can compare server work by class without exposing the row.

Review three data signals after each run:

1. Consumption: how many feed actions occurred versus the calculated expectation.
2. Coverage: which bounded categories appeared and in what proportions.
3. Collision: whether unique business keys were observed more than once across generators.

Collision detection is often best performed during dataset preparation or in test-environment audit records, not inside the hot request path. Export a salted hash of an allowed non-secret key if correlation is required, and retain it only for the agreed diagnostic window. If the proportions differ from the injection design, first check conditional exits and failed logins. A perfectly weighted feeder cannot force later requests to run when users abandon the journey early.

## Frequently Asked Questions

### What is the default Gatling feeder strategy?

For Gatling's built-in feeders, \`queue\` is the default when no strategy is specified. Records are consumed in source order and are not reused. If a feed action asks for another record after the stock is exhausted, the run fails. Being explicit with \`.queue()\` can still improve review clarity when uniqueness is a core assumption. Calculate capacity from feed calls and loops before relying on a finite feeder.

### When should I choose shuffle instead of random?

Choose \`shuffle\` when every record may be used at most once but source order should not influence the run. Choose \`random\` when reuse is valid and selection with replacement reflects the data model. Shuffle eventually exhausts; random does not. Credentials, one-time codes, and mutable accounts usually require shuffle or queue. Search phrases and read-only catalog rows often tolerate random. The deciding question is collision legality, not dataset size.

### Can one feeder be private to each virtual user?

A feeder consumed by a scenario is shared across the virtual users reaching that feed action. The selected record is copied into the individual virtual user's Session, where those attributes then belong to that user's journey. If one user needs to retain the same row across repeated actions, feed once before the loop and reuse the Session values. Feeding inside the loop requests another record and can exhaust a finite source.

### How should feeder files be handled across load generators?

Ensure each record that must be globally unique reaches only one generator. Gatling Enterprise supports documented feeder sharding for distributed files. For independently launched open-source processes, create nonoverlapping artifacts before the run, validate their headers and key sets, and assign each with an explicit worker index. Copying the full queue file to every generator creates one queue per process, so duplicate consumption remains possible even though each local queue is correct.
`,
};
