import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'PIT Mutation Testing for Java: Pitest with Maven and Gradle',
  description: 'Pitest guide for Java QA teams: configure PIT mutation testing with Maven, Gradle, JUnit 5, CI thresholds, reports, and survivor triage workflows.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# PIT Mutation Testing for Java: Pitest with Maven and Gradle

PIT mutation testing, usually called Pitest in Java teams, checks whether your tests would fail if small, systematic faults were inserted into production bytecode. Line and branch coverage can tell you that a statement or decision ran. Pitest asks the harder question: did the test suite notice when the behavior changed?

The current open source PIT release is \`1.30.0\`, published in August 2026 in the hcoles/pitest repository and documented at https://pitest.org. The Maven plugin still exposes the \`mutationCoverage\` goal. The widely used Gradle plugin is \`info.solidsoft.pitest\`, with version \`1.19.0\` current in the plugin portal. JUnit 5 support is supplied through \`org.pitest:pitest-junit5-plugin\`, currently \`1.2.3\`. PIT is active and maintained. The commercial Arcmutate extensions are separate from open source PIT and add paid capabilities such as advanced mutators, history acceleration, and CI-oriented analysis, so do not assume those features are in the free engine.

For QA and test-automation engineers, the payoff is practical. Pitest is not a vanity metric. It helps you locate assertions that only exercise code, mocks that approve the wrong behavior, tests that miss boundary conditions, and branches where exception handling was never truly checked. Use this guide after you understand ordinary coverage tradeoffs in [Code Coverage: Branch vs Mutation Tradeoff](/blog/code-coverage-branch-vs-mutation-tradeoff), and pair it with framework-level testing habits from [JUnit 5 Testing for Java](/blog/junit5-testing-java-guide).

## What Pitest Changes In A Java Test Strategy

Pitest runs your existing tests many times against mutated versions of your compiled classes. A mutator might replace a conditional boundary, remove a method call, return a default value, negate a conditional, or alter arithmetic. If at least one selected test fails, the mutant is killed. If all selected tests still pass, the mutant survived. A surviving mutant does not automatically prove a bug, but it is a strong signal that your current assertions are weaker than the code path deserves.

The important distinction is that PIT works at bytecode level. It does not rewrite source files in place. It analyzes compiled classes, creates mutated bytecode, selects tests likely to cover each mutant, and reports outcomes. That design is why PIT can be much faster than naive mutation testing, but it is also why classpath hygiene matters. If your build mixes generated classes, shaded dependencies, old target directories, and inconsistent JUnit engines, PIT may spend time mutating code you do not mean to test.

| Coverage signal | What it proves | What it misses | QA use |
| --- | --- | --- | --- |
| Line coverage | A line executed | Whether the observed behavior mattered | Fast smoke signal for untested files |
| Branch coverage | Both sides of a decision executed | Whether assertions distinguish the sides | Useful for condition-heavy logic |
| Mutation score | Tests noticed injected behavioral changes | Equivalent mutants and intentionally untested policy choices | Strong release gate for core domain code |
| Survived mutant list | Specific behavior was not detected | Whether the mutant is semantically equivalent | Triage backlog for better assertions |

The mistake people make is trying to run PIT across the whole repository on day one. That produces noise, long runtimes, and political arguments about generated code. Start with code where correctness is visible and valuable: pricing, eligibility, validators, parsers, allocation rules, security decisions, workflow state transitions, and adapter code that has meaningful error handling. Then expand as the suite matures.

## Maven Configuration That QA Can Own

The Maven plugin goal is \`org.pitest:pitest-maven:mutationCoverage\`. You can run it directly from the command line, or bind it in CI through a Maven profile. Keep the configuration explicit. AI coding agents are good at adding plugins, but they often omit \`targetClasses\` and accidentally mutate controllers, DTOs, generated classes, and framework glue.

\`\`\`xml
<project>
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>billing-core</artifactId>
  <version>1.0.0-SNAPSHOT</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <pitest.version>1.30.0</pitest.version>
    <pitest.junit5.version>1.2.3</pitest.junit5.version>
  </properties>

  <build>
    <plugins>
      <plugin>
        <groupId>org.pitest</groupId>
        <artifactId>pitest-maven</artifactId>
        <version>\${pitest.version}</version>
        <dependencies>
          <dependency>
            <groupId>org.pitest</groupId>
            <artifactId>pitest-junit5-plugin</artifactId>
            <version>\${pitest.junit5.version}</version>
          </dependency>
        </dependencies>
        <configuration>
          <targetClasses>
            <param>com.example.billing.domain.*</param>
            <param>com.example.billing.pricing.*</param>
          </targetClasses>
          <targetTests>
            <param>com.example.billing.*Test</param>
          </targetTests>
          <mutators>
            <mutator>DEFAULTS</mutator>
          </mutators>
          <mutationThreshold>75</mutationThreshold>
          <coverageThreshold>80</coverageThreshold>
          <timeoutConstant>4000</timeoutConstant>
          <threads>4</threads>
          <outputFormats>
            <param>HTML</param>
            <param>XML</param>
          </outputFormats>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
\`\`\`

Run it from a clean build so PIT sees fresh bytecode and test classes:

\`\`\`bash
mvn -q test org.pitest:pitest-maven:mutationCoverage
\`\`\`

\`mutationThreshold\` fails the build if the mutation score is below the configured percentage. \`coverageThreshold\` gates PIT's own coverage calculation. Use thresholds carefully. A new project might start at 50 or 60 on a narrow package, then ratchet upward. A mature payment engine can justify 85 or higher. The bad version is a repository-wide 90 percent threshold configured before the team has removed generated code and equivalent mutants from scope.

| Maven setting | Typical value | Why it matters |
| --- | --- | --- |
| \`targetClasses\` | Domain packages, not every class | Controls mutation scope and report usefulness |
| \`targetTests\` | Unit and focused integration tests | Prevents slow end-to-end suites from dominating |
| \`mutators\` | \`DEFAULTS\` first, \`STRONGER\` later | Changes fault model and runtime |
| \`mutationThreshold\` | Ratcheted from current baseline | Turns mutation testing into a release contract |
| \`outputFormats\` | \`HTML\` and \`XML\` | HTML for humans, XML for CI parsing |

The official quickstart still shows \`mutationCoverage\` as the plugin goal, and that is the goal agents should use when wiring Maven tasks. If an AI assistant invents a \`pitest\` goal for Maven, reject the patch.

## Gradle Configuration With The Solidsoft Plugin

Gradle users normally apply \`info.solidsoft.pitest\`. As of this writing, the plugin portal lists \`1.19.0\` as the current release. The plugin adds a \`pitest\` task and exposes a \`pitest\` extension where you set the PIT engine version, JUnit 5 plugin version, target classes, thresholds, and report formats.

\`\`\`kotlin
plugins {
    java
    id("info.solidsoft.pitest") version "1.19.0"
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter:6.0.0")
}

tasks.test {
    useJUnitPlatform()
}

pitest {
    pitestVersion.set("1.30.0")
    junit5PluginVersion.set("1.2.3")
    targetClasses.set(setOf("com.example.billing.domain.*", "com.example.billing.pricing.*"))
    targetTests.set(setOf("com.example.billing.*Test"))
    mutators.set(setOf("DEFAULTS"))
    mutationThreshold.set(75)
    coverageThreshold.set(80)
    threads.set(4)
    outputFormats.set(setOf("HTML", "XML"))
}
\`\`\`

Run it with:

\`\`\`bash
./gradlew clean test pitest
\`\`\`

Multi-project Gradle builds need one more decision. Do you apply PIT to every subproject, or only to modules with domain logic? The second answer is usually healthier. A root build that mutates every Spring Boot application, generated OpenAPI model, and test fixture library becomes slow enough that nobody believes the signal. Create a convention plugin or shared Gradle snippet, then opt in modules deliberately.

\`\`\`kotlin
subprojects {
    plugins.withId("java") {
        plugins.apply("info.solidsoft.pitest")

        extensions.configure<info.solidsoft.gradle.pitest.PitestPluginExtension>("pitest") {
            pitestVersion.set("1.30.0")
            junit5PluginVersion.set("1.2.3")
            outputFormats.set(setOf("XML", "HTML"))
            mutators.set(setOf("DEFAULTS"))
            threads.set(2)
        }
    }
}
\`\`\`

That shared block is intentionally incomplete. Each module should still set its own \`targetClasses\`, because the package list is a testing decision, not boilerplate.

## Mutator Groups: DEFAULTS, STRONGER, And When To Expand

PIT documents named mutator groups including \`DEFAULTS\` and \`STRONGER\`. \`DEFAULTS\` is the right starting point for most teams because it balances useful signals with manageable equivalent-mutant noise. \`STRONGER\` adds more aggressive mutations. It can find real blind spots, but it also increases runtime and triage load.

| Mutator choice | Good fit | Risk |
| --- | --- | --- |
| \`DEFAULTS\` | First production rollout, CI gate, broad domain packages | May miss specialized fault classes |
| \`STRONGER\` | Mature suite, critical algorithms, quarterly hardening | More survivors that require human classification |
| Explicit mutator list | Regulated or performance-sensitive modules | Requires deliberate maintenance |
| Experimental or custom mutators | Research, security-sensitive code, paid extension evaluation | Easy to confuse signal with novelty |

Do not compare mutation percentages between teams unless the mutator set is the same. A 72 percent score under \`STRONGER\` may represent a better suite than an 86 percent score under a smaller set. Put the mutator group in the CI summary and the pull request comment so reviewers can interpret the number.

## JUnit 5, Test Selection, And Assertion Quality

With JUnit 5, the key pieces are \`useJUnitPlatform()\` in Gradle or Surefire configured for JUnit Platform in Maven, plus \`pitest-junit5-plugin\` on PIT's plugin classpath. PIT selects tests by coverage and naming configuration, but it still runs your real tests. Flaky tests remain flaky. Slow tests remain slow. Disabled tests do not rescue mutants.

Consider this production method:

\`\`\`java
package com.example.billing.pricing;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class DiscountPolicy {
    public BigDecimal discountedTotal(BigDecimal subtotal, int loyaltyYears) {
        if (loyaltyYears >= 5) {
            return subtotal.multiply(new BigDecimal("0.90")).setScale(2, RoundingMode.HALF_UP);
        }
        return subtotal.setScale(2, RoundingMode.HALF_UP);
    }
}
\`\`\`

A weak test might execute both cases but only assert that values are non-null. PIT can mutate \`>=\` to \`>\`, or remove the multiplication. If the test still passes, the report points to a real assertion problem.

\`\`\`java
package com.example.billing.pricing;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

final class DiscountPolicyTest {
    private final DiscountPolicy policy = new DiscountPolicy();

    @Test
    void appliesTenPercentDiscountAtFiveYears() {
        BigDecimal total = policy.discountedTotal(new BigDecimal("100.00"), 5);

        assertEquals(new BigDecimal("90.00"), total);
    }

    @Test
    void keepsSubtotalBelowFiveYears() {
        BigDecimal total = policy.discountedTotal(new BigDecimal("100.00"), 4);

        assertEquals(new BigDecimal("100.00"), total);
    }
}
\`\`\`

The key is not that these tests are long. They are specific. They test the boundary at five years and the adjacent value below it. AI coding agents often generate happy-path assertions first. Mutation testing gives QA a way to ask the agent for targeted improvements: kill the survived boundary mutant, add the adjacent case, assert the exact returned value, and keep the public behavior unchanged.

## Incremental Analysis And History Files

PIT has open source incremental analysis support through history files. The Maven configuration exposes this through \`withHistory\`, and PIT can use prior analysis to reduce work in subsequent runs. Use this as a runtime optimization after the baseline is trustworthy. Do not use history to hide newly introduced survivors.

\`\`\`xml
<configuration>
  <targetClasses>
    <param>com.example.billing.domain.*</param>
  </targetClasses>
  <withHistory>true</withHistory>
  <mutationThreshold>78</mutationThreshold>
  <outputFormats>
    <param>HTML</param>
    <param>XML</param>
  </outputFormats>
</configuration>
\`\`\`

History files are most useful on persistent CI runners or when cached between runs. If each CI job starts from a blank machine, you need an explicit cache strategy. If your cache key is too broad, PIT may reuse history in confusing ways after major refactors. If your cache key is too narrow, you will rarely get acceleration. A practical key includes the operating system, Java version, PIT version, and hashes of build files.

Commercial Arcmutate extensions add more advanced acceleration and analysis options around PIT. They are not required for ordinary mutation testing, but they can make sense for large Java estates where full mutation runs are expensive. When discussing Arcmutate in architecture docs, label it as a commercial extension and separate it from open source PIT capabilities.

## CI Gate For Pull Requests

Mutation testing can be too slow for every commit if configured carelessly. The practical CI pattern is tiered:

| Lane | Scope | Trigger | Gate |
| --- | --- | --- | --- |
| Pull request fast lane | Changed domain modules or small target packages | Every PR | Threshold cannot decrease |
| Nightly lane | Wider domain packages | Scheduled | Report survivors and trend |
| Release lane | Critical modules, possibly \`STRONGER\` | Before release branch or tag | Hard threshold and triage review |

Here is a GitHub Actions Maven job using currently requested action majors:

\`\`\`yaml
name: pitest

on:
  pull_request:
  workflow_dispatch:

jobs:
  mutation:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Set up Java
        uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: "21"
          cache: maven

      - name: Run PIT
        run: mvn -q test org.pitest:pitest-maven:mutationCoverage

      - name: Upload PIT report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: pitest-report-\${{ github.run_id }}
          path: target/pit-reports
\`\`\`

For Gradle:

\`\`\`yaml
name: pitest-gradle

on:
  pull_request:
  workflow_dispatch:

jobs:
  mutation:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Set up Java
        uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: "21"
          cache: gradle

      - name: Run PIT
        run: ./gradlew clean test pitest

      - name: Upload PIT report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: pitest-gradle-report-\${{ github.run_id }}
          path: "**/build/reports/pitest"
\`\`\`

CI output should do more than say pass or fail. Store the HTML report so reviewers can inspect source lines, mutator names, and test coverage. When a threshold fails, the action log is not enough. Mutation work is diagnostic work.

## A Realistic Failure Mode: Surviving Mutants In Exception Handling

Imagine PIT reports that a \`VOID_METHOD_CALLS\` mutant survived in an order workflow. The mutated line removes a call to \`audit.recordFailure(orderId, reason)\` inside a catch block. The tests assert that the API returns a failure result, so they pass even when the audit side effect disappears.

Diagnosis:

| Symptom | Likely cause | Better test |
| --- | --- | --- |
| Method-call-removal mutant survived | Test asserted response only | Verify the collaborator recorded failure with expected fields |
| Conditional-boundary mutant survived | Boundary value missing | Add adjacent values around the comparison |
| Return-value mutant survived | Assertion only checked non-null or status | Assert exact value, state change, and persisted result |
| Timeout mutant appears | Test is slow, hanging, or order-dependent | Isolate the unit, settle async work, reduce external calls |

The fix is not always more mocks. Sometimes the right test is an integration-style unit test against an in-memory repository, then assert that the failure record exists after the service call. What matters is that the side effect is observable.

\`\`\`java
package com.example.orders;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

final class OrderServiceTest {
    @Test
    void recordsAuditEntryWhenPaymentFails() {
        InMemoryAuditLog auditLog = new InMemoryAuditLog();
        PaymentGateway gateway = order -> {
            throw new PaymentException("card_declined");
        };
        OrderService service = new OrderService(gateway, auditLog);

        OrderResult result = service.placeOrder(new Order("order-123"));

        assertEquals(OrderStatus.FAILED, result.status());
        assertTrue(auditLog.containsFailure("order-123", "card_declined"));
    }
}
\`\`\`

That test kills a method-call-removal mutant because the removed call changes observable state. It also documents the contract: failure is not complete until it is recorded.

## Reading The PIT Report Without Wasting A Day

The HTML report organizes mutants by package, class, line, mutator, and status. Triage the report in this order:

1. Exclude obvious non-target code from future runs, such as generated models or framework bootstrapping.
2. Fix high-value survived mutants where behavior clearly should be asserted.
3. Label likely equivalent mutants in a tracking issue, then decide whether to exclude a class, method, or mutator.
4. Ratchet thresholds only after the noisy scope is cleaned.

Equivalent mutants are the tax you pay for mutation testing. For example, replacing one implementation detail with another may not change externally visible behavior. Do not write brittle tests just to kill equivalent mutants. Your goal is stronger behavioral confidence, not a perfect number.

One useful review habit is to ask whether the surviving mutation changes an observable contract or merely changes a private route to the same result. If it changes a contract, the missing test should name that contract in plain language. If it does not, the discussion belongs in design cleanup, not in a frantic test patch. This distinction keeps mutation testing from becoming score theater. It also gives AI coding agents a clearer target: preserve the contract, expose the missing behavior, and avoid coupling the test to a temporary implementation detail.

Ready-made QA skills can install from qaskills.sh with the qaskills CLI, but the skill should encode your repository's target packages and thresholds. Generic mutation testing instructions are useful; precise package scope is what makes the agent helpful in a real PR.

## How To Use Pitest With AI Coding Agents

Pitest reports are excellent prompts for Claude Code, Cursor, and Copilot because they describe a concrete gap. Feed the agent the class, the test file, the mutator, and the survivor line. Ask for the smallest test change that makes the behavior observable. Then review the test like any other code.

Good agent instruction:

\`\`\`text
PIT reports a survived CONDITIONALS_BOUNDARY mutant in
DiscountPolicy.discountedTotal at the loyaltyYears comparison.
Add or adjust JUnit 5 tests so the boundary behavior at 4, 5, and 6 years is asserted exactly.
Do not change production code unless the test exposes an actual bug.
\`\`\`

Bad agent instruction:

\`\`\`text
Increase mutation coverage.
\`\`\`

The bad version invites shallow assertions, production-code rewrites, or exclusions that make the score nicer without improving confidence. Mutation testing works best when the task is line-specific and behavior-specific.

## Frequently Asked Questions

### Is Pitest a replacement for line coverage?

No. Line coverage is still useful as a cheap map of what executed, especially for finding files with no tests at all. Pitest answers a different question: whether tests fail when behavior changes. Most teams should keep line and branch coverage as broad hygiene signals, then use mutation testing as a deeper gate for important modules. A file with low line coverage needs basic tests first. A file with high line coverage and surviving mutants needs stronger assertions.

### Should every survived mutant block a pull request?

Not at first. A strict survivor-zero policy is realistic only for narrow, highly controlled modules. For normal Java services, use thresholds and triage. Block PRs that reduce the agreed mutation score or introduce obvious survivors in critical code. Track equivalent or low-value survivors separately. Once a package has been cleaned up, you can make the gate stricter. The key is to ratchet from a known baseline instead of imposing a fantasy target.

### When should I use STRONGER instead of DEFAULTS?

Start with \`DEFAULTS\` for CI because it gives a good signal without overwhelming the team. Move selected packages to \`STRONGER\` when the default survivors are under control, the runtime is acceptable, and the code justifies deeper fault modeling. Good candidates are pricing, authorization, data transformation, and safety-critical business rules. Do not switch the whole repository to \`STRONGER\` just to look sophisticated. The extra mutants must lead to actionable tests.

### Why does PIT run slower in CI than locally?

CI runners often have colder dependency caches, fewer CPU resources, different test parallelism, and no PIT history file from prior runs. They may also run with coverage instrumentation, containerized databases, or slower filesystem access. Start by narrowing \`targetClasses\`, excluding generated code, using a reasonable thread count, and publishing reports. Then consider \`withHistory\` and caching. If tests are inherently slow, mutation testing exposes that cost rather than creating it.
`,
};
