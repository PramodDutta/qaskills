import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "JaCoCo Code Coverage in Java: 2026 Maven & Gradle Guide",
  description: "Set up JaCoCo code coverage for Java in 2026 — Maven and Gradle config, HTML/XML reports, coverage gates that fail the build, and multi-module aggregation.",
  date: "2026-06-15",
  category: "Java",
  content: `# JaCoCo Code Coverage in Java: 2026 Maven & Gradle Guide

JaCoCo (Java Code Coverage) is the de facto standard library for measuring how much of your Java code your tests execute. You add it as a Maven or Gradle plugin, run your test suite, and JaCoCo writes a \`jacoco.exec\` binary report plus human-readable HTML and machine-readable XML. It works by instrumenting bytecode on the fly through a Java agent, so it counts lines, branches, instructions, methods, and classes without changing your source. Beyond reporting, JaCoCo's real power is the **coverage gate** (\`jacoco:check\` / \`jacocoTestCoverageVerification\`) that fails the build when coverage drops below a threshold you set. This guide covers Maven, Gradle, multi-module setups, and CI.

## What JaCoCo actually measures

JaCoCo reports several counters, and confusing them is the most common source of "my number looks wrong" tickets:

| Counter | What it counts | Use it for |
|---|---|---|
| Instructions (C0) | Single Java bytecode instructions | The most granular, default metric |
| Branches (C1) | \`if\`/\`switch\` decision outcomes | Catching untested conditional paths |
| Lines | Source lines with any executed instruction | Human-friendly reporting |
| Complexity | Cyclomatic complexity covered | Spotting complex, under-tested methods |
| Methods | Methods entered at least once | Dead-method detection |
| Classes | Classes with any method executed | Module-level smoke check |

Line coverage is the friendliest number to show stakeholders, but **branch coverage** is what reveals untested logic. A method with a single \`if\` can hit 100% line coverage while leaving one branch completely untested. Set your gate on branches if you want it to mean something. For the distinction between these metrics in depth, see our [code coverage types explainer](/blog).

## JaCoCo with Maven

Add the plugin to your \`pom.xml\`. The \`prepare-agent\` goal wires the Java agent into the Surefire test run; the \`report\` goal generates HTML/XML/CSV after tests finish.

\`\`\`xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.12</version>
  <executions>
    <execution>
      <id>prepare-agent</id>
      <goals>
        <goal>prepare-agent</goal>
      </goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>test</phase>
      <goals>
        <goal>report</goal>
      </goals>
    </execution>
  </executions>
</plugin>
\`\`\`

Run it:

\`\`\`bash
mvn clean test
# HTML report lands at:
# target/site/jacoco/index.html
# XML (for Codecov/SonarQube) at:
# target/site/jacoco/jacoco.xml
\`\`\`

The \`prepare-agent\` goal sets a property (\`argLine\`) that Surefire picks up automatically. If you also configure \`argLine\` manually for Surefire, append JaCoCo's value with \`@{argLine}\` or you will silently disable instrumentation — coverage will read 0% and you'll waste an afternoon. This is the single most common JaCoCo Maven bug.

### Maven coverage gate

The \`check\` goal fails the build when a rule is violated. This is what turns a vanity metric into an enforced quality bar:

\`\`\`xml
<execution>
  <id>check</id>
  <goals>
    <goal>check</goal>
  </goals>
  <configuration>
    <rules>
      <rule>
        <element>BUNDLE</element>
        <limits>
          <limit>
            <counter>LINE</counter>
            <value>COVEREDRATIO</value>
            <minimum>0.80</minimum>
          </limit>
          <limit>
            <counter>BRANCH</counter>
            <value>COVEREDRATIO</value>
            <minimum>0.70</minimum>
          </limit>
        </limits>
      </rule>
    </rules>
  </configuration>
</execution>
\`\`\`

Now \`mvn verify\` fails if line coverage drops below 80% or branch coverage below 70%. The \`element\` can be \`BUNDLE\` (whole module), \`PACKAGE\`, \`CLASS\`, or \`METHOD\` — class-level rules catch a single badly-tested file that a module average would hide.

## JaCoCo with Gradle

The Gradle plugin is built in. Apply it and the \`jacocoTestReport\` task appears:

\`\`\`groovy
plugins {
    id 'java'
    id 'jacoco'
}

jacoco {
    toolVersion = "0.8.12"
}

test {
    finalizedBy jacocoTestReport // report runs after tests
}

jacocoTestReport {
    dependsOn test
    reports {
        xml.required = true   // for SonarQube / Codecov
        html.required = true
        csv.required = false
    }
}
\`\`\`

\`\`\`bash
./gradlew test jacocoTestReport
# HTML: build/reports/jacoco/test/html/index.html
# XML:  build/reports/jacoco/test/jacocoTestReport.xml
\`\`\`

### Gradle coverage gate

Use \`jacocoTestCoverageVerification\` and wire it into the \`check\` lifecycle so CI runs it automatically:

\`\`\`groovy
jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                counter = 'LINE'
                value = 'COVEREDRATIO'
                minimum = 0.80
            }
        }
        rule {
            element = 'CLASS'
            limit {
                counter = 'BRANCH'
                minimum = 0.70
            }
            excludes = ['*.config.*', '*.dto.*']
        }
    }
}

check.dependsOn jacocoTestCoverageVerification
\`\`\`

Running \`./gradlew check\` now enforces the rule. The Kotlin DSL (\`build.gradle.kts\`) is equivalent — use \`minimum = "0.80".toBigDecimal()\` since the limit takes a \`BigDecimal\`.

## Excluding generated and boilerplate code

Coverage on generated DTOs, MapStruct mappers, or Lombok-built classes is noise that drags your number down without telling you anything. Exclude them. In Gradle, transform the report's class directories:

\`\`\`groovy
jacocoTestReport {
    afterEvaluate {
        classDirectories.setFrom(files(classDirectories.files.collect {
            fileTree(dir: it, exclude: [
                '**/config/**',
                '**/dto/**',
                '**/*MapperImpl.class',
                '**/generated/**'
            ])
        }))
    }
}
\`\`\`

In Maven, use \`<excludes>\` inside the plugin \`configuration\` with paths like \`**/dto/**/*\`. If you use Lombok, add a \`lombok.config\` containing \`lombok.addLombokGeneratedAnnotation = true\` — JaCoCo automatically ignores anything annotated \`@Generated\`, so Lombok-built methods stop polluting your report entirely.

## Multi-module aggregation

A single per-module report is useless when leadership asks "what's our total coverage?" Each module only sees code it directly tests. You need an **aggregate report** in a dedicated reporting module.

For Maven, the \`jacoco:report-aggregate\` goal collects \`*.exec\` files from modules listed as dependencies. Create a \`coverage\` module whose \`pom.xml\` depends on every other module, then:

\`\`\`xml
<execution>
  <id>aggregate-report</id>
  <phase>verify</phase>
  <goals>
    <goal>report-aggregate</goal>
  </goals>
</execution>
\`\`\`

For Gradle, apply the \`jacoco-report-aggregation\` plugin in a dedicated subproject and declare \`jacocoAggregation\` dependencies on the modules you want included:

\`\`\`groovy
plugins {
    id 'base'
    id 'jacoco-report-aggregation'
}

dependencies {
    jacocoAggregation project(':service-orders')
    jacocoAggregation project(':service-payments')
}

reporting {
    reports {
        testCodeCoverageReport(JacocoCoverageReport) {
            testSuiteName = 'test'
        }
    }
}
\`\`\`

Then \`./gradlew testCodeCoverageReport\` produces one merged XML covering all modules — this is the file you feed to SonarQube or Codecov, not the per-module reports. A frequent mistake is uploading each module's XML separately and getting a fragmented picture; aggregate first.

## Integration test coverage

Unit-test coverage misses code only exercised by integration tests. JaCoCo handles this by writing separate \`.exec\` files. Configure a second \`prepare-agent-integration\` execution that points \`destFile\` at \`target/jacoco-it.exec\`, bind the Failsafe plugin for integration tests, then merge both \`.exec\` files with the \`merge\` goal before reporting. The merged report shows true combined coverage — critical when a service layer is thinly unit-tested but heavily covered by API tests.

## JaCoCo in CI

A minimal GitHub Actions job that runs tests, enforces the gate, and uploads the report:

\`\`\`yaml
name: coverage
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: maven
      - name: Test + coverage gate
        run: mvn -B verify   # fails if jacoco:check fails
      - name: Upload HTML report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: jacoco-report
          path: target/site/jacoco/
\`\`\`

Because the gate runs inside \`verify\`, a coverage regression turns the PR check red before a human reviews it. To surface coverage *deltas* on the pull request itself (not just an absolute gate), pipe the XML to a coverage service — compare your options in our [Codecov vs Coveralls guide](/compare). For AI-agent-driven Java testing workflows, browse the [Java testing skills](/skills) directory.

## Reading the HTML report

Open \`index.html\` and JaCoCo gives you a drill-down: package → class → method, each with colour-coded source. The colours are the fastest way to find gaps:

- **Green** — the line is fully covered (all instructions and branches executed).
- **Yellow** — *partial* branch coverage. The line ran, but not every branch was taken. This is the colour to hunt for — a yellow \`if\` means you tested one path and missed the other.
- **Red** — the line never executed at all.

A small **diamond** in the gutter marks branch points: a full green diamond means all branches covered, half-filled means some, empty means none. When a stakeholder says "we're at 85%" but bugs keep slipping through, it's almost always because the report is full of yellow lines — high line coverage masking missed branches. Sort the table by the "Missed Branches" column rather than line coverage to find the genuinely risky code first.

## Offline instrumentation

The default \`prepare-agent\` approach instruments classes *on the fly* as they load — perfect for normal test runs. But some setups break it: certain custom classloaders, frameworks that transform bytecode themselves, or scenarios where you can't attach a Java agent (some application servers, OSGi containers, or Android's runtime). For these, JaCoCo offers **offline instrumentation**: you instrument the compiled classes ahead of time with the \`instrument\` goal, run against the instrumented classes plus \`org.jacoco.agent\` on the classpath in runtime mode, then restore the original classes before packaging.

\`\`\`xml
<execution>
  <id>instrument</id>
  <goals><goal>instrument</goal></goals>
</execution>
<execution>
  <id>restore</id>
  <goals><goal>restore-instrumented-classes</goal></goals>
</execution>
\`\`\`

Offline mode is the escape hatch — reach for it only when on-the-fly instrumentation genuinely won't work, because it adds build steps and the risk of shipping instrumented classes if \`restore\` doesn't run. For 95% of projects, the standard \`prepare-agent\` flow is correct and you should never touch offline instrumentation.

## Combining JaCoCo with mutation testing

Line and branch coverage tell you what *ran*, not whether your tests would *catch a bug*. JaCoCo pairs naturally with PIT (pitest), the JVM mutation-testing tool: JaCoCo gives you cheap, fast coverage on every build as the gate, and PIT runs periodically to audit test *quality* by mutating your code and checking whether tests fail. A class with 95% JaCoCo branch coverage but a low PIT mutation score is a warning sign that your tests execute code without meaningfully asserting on it. Use JaCoCo as the always-on CI gate and PIT as the deeper, slower quality check on critical modules.

## Common errors and fixes

- **Coverage reads 0%** — Almost always a clobbered \`argLine\`. Don't hard-set \`argLine\` in Surefire; if you must, include \`@{argLine}\` so JaCoCo's agent argument survives.
- **\`Error while instrumenting\`** — Usually a JDK/JaCoCo version mismatch. JaCoCo 0.8.12 supports up to Java 23 bytecode; on a newer JDK bump the JaCoCo version. Until support ships you can add \`-XX:+EnableDynamicAgentLoading\` or set \`-Djdk.attach.allowAttachSelf=true\`.
- **Report is empty after a passing run** — The \`report\` goal ran before \`prepare-agent\`, or tests forked a new JVM without the agent. Check execution order and that \`forkCount\`/\`reuseForks\` aren't dropping the agent.
- **Numbers look too low** — You're probably measuring branch coverage and reading it as line coverage, or generated code is included. Exclude DTOs and check which counter your gate uses.

## Frequently Asked Questions

### What is a good code coverage percentage with JaCoCo?

There is no universal number, but 70–80% line coverage with 60–70% branch coverage is a pragmatic target for most application code. Pushing past 90% often yields diminishing returns and tempts developers to write low-value tests purely to hit the gate. Focus the gate on critical business logic and exclude generated code rather than chasing a single global number.

### How do I make JaCoCo fail the build below a threshold?

Use the \`check\` goal in Maven or \`jacocoTestCoverageVerification\` in Gradle with a \`violationRules\`/\`rules\` block specifying a counter (LINE or BRANCH), \`COVEREDRATIO\`, and a \`minimum\`. Wire it into \`mvn verify\` or Gradle's \`check\` task so CI runs it automatically. The build then exits non-zero whenever coverage falls below your limit.

### Why does JaCoCo show 0% coverage even though tests pass?

The most common cause in Maven is a manually set \`argLine\` in the Surefire plugin that overwrites the \`argLine\` property JaCoCo's \`prepare-agent\` goal sets, which detaches the coverage agent. Reference it as \`@{argLine}\` instead. In Gradle, ensure \`jacocoTestReport\` depends on \`test\` and that forked test JVMs still load the agent.

### Can JaCoCo aggregate coverage across multiple modules?

Yes. Use \`jacoco:report-aggregate\` in Maven from a dedicated reporting module that depends on all others, or the \`jacoco-report-aggregation\` plugin in Gradle with \`jacocoAggregation\` dependencies. This merges every module's execution data into a single report — the one you should upload to SonarQube or a coverage service rather than the fragmented per-module files.

### How do I exclude generated code from JaCoCo coverage?

Filter the report's class directories with exclude patterns (e.g. \`**/dto/**\`, \`**/*MapperImpl.class\`, \`**/generated/**\`) in the report task. For Lombok, add \`lombok.addLombokGeneratedAnnotation = true\` to \`lombok.config\`; JaCoCo automatically skips any element annotated with a runtime-visible \`@Generated\` annotation, removing boilerplate from your numbers.

### Does JaCoCo support Java 21 and newer?

Yes. JaCoCo 0.8.12 supports Java bytecode through version 23, which covers Java 21 LTS. Always match your JaCoCo version to your JDK — running an older JaCoCo on a newer JDK throws instrumentation errors. When a brand-new JDK ships before JaCoCo adds official support, upgrade the plugin as soon as the compatible release is out rather than relying on workarounds.
`,
};
