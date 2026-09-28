import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'ArchUnit: Architecture Tests for Java Codebases',
  description: 'ArchUnit guide for QA engineers: enforce Java architecture rules, layer boundaries, cycles, legacy freezes, and CI checks with maintainable test code.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# ArchUnit: Architecture Tests for Java Codebases

ArchUnit is an actively maintained Java architecture testing library from TNG. The latest official GitHub release I verified is \`1.5.1\`, released on September 25, 2026, and the current README still documents the Maven Central coordinates \`com.tngtech.archunit:archunit:1.5.1\`. The project has not been renamed or discontinued. Its JUnit integration, fluent rule DSL, Library API, slices, layered architecture checks, onion architecture checks, and \`FreezingArchRule\` remain part of the supported surface.

The direct answer for QA and test-automation teams: use ArchUnit when you want architecture decisions to fail like tests instead of living only in diagrams, wiki pages, and pull request comments. It imports compiled bytecode with \`ClassFileImporter\` or through the JUnit engine via \`@AnalyzeClasses\`, turns packages and classes into inspectable objects, and checks rules such as "controllers do not access repositories", "domain code does not depend on adapters", or "feature slices are free of cycles".

ArchUnit is not a replacement for code review, JPMS, dependency locking, or runtime integration tests. It is strongest at catching structural drift that ordinary unit tests miss. If you are pairing it with broader Java test design, read the [JUnit 5 testing Java guide](/blog/junit5-testing-java-guide). If your agents are generating new test layers and abstractions, pair this with [automation framework design patterns](/blog/automation-framework-design-patterns) so the rules describe the intended framework shape instead of freezing accidental packages.

## Verified Surface and Installation Choices

The official docs separate ArchUnit into Core, Lang, and Library layers. Core imports bytecode into \`JavaClasses\`. Lang gives you the fluent rule syntax through entry points such as \`classes()\` and \`noClasses()\`. Library adds higher-level rules such as \`layeredArchitecture()\`, \`onionArchitecture()\`, \`slices()\`, dependency rules, coding rules, and PlantUML diagram checks. Most QA teams should start with JUnit 5 support because it integrates naturally with CI reports and IDE test runners.

| Use case | Artifact | Typical entry point | Notes for QA teams |
| --- | --- | --- | --- |
| Plain API tests | \`com.tngtech.archunit:archunit\` | \`new ClassFileImporter()\` | Good for custom runners or non-JUnit checks. |
| JUnit 5 architecture tests | \`com.tngtech.archunit:archunit-junit5\` | \`@AnalyzeClasses\` and \`@ArchTest\` | Best default for Java services already on JUnit Platform. |
| Legacy JUnit 4 suites | ArchUnit JUnit support with runner | \`ArchUnitRunner\` | Use only when the project has not moved to JUnit 5. |
| Grown codebases | Library freeze package | \`FreezingArchRule.freeze(rule)\` | Lets CI block new violations while old ones are paid down. |

\`\`\`kotlin
plugins {
    java
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation("com.tngtech.archunit:archunit-junit5:1.5.1")
}

tasks.test {
    useJUnitPlatform()
}
\`\`\`

\`\`\`xml
<dependency>
  <groupId>com.tngtech.archunit</groupId>
  <artifactId>archunit-junit5</artifactId>
  <version>1.5.1</version>
  <scope>test</scope>
</dependency>
\`\`\`

Keep the dependency pinned while a team is adopting architecture tests. A minor ArchUnit release can improve dependency analysis or report text, which is good, but it can change what a frozen rule sees. Upgrade deliberately, run the architecture suite locally, and review the violation store diff if you use freezing.

## Model the Boundary Before Writing Rules

The easiest way to create noisy ArchUnit tests is to start from package names without agreeing what those names mean. Before asking Claude Code, Cursor, or Copilot to generate a rule class, write the architectural sentence in business language. "REST controllers call application services, not repositories" is better than "classes in \`..web..\` may only access \`..service..\`" because it reveals the intent and the package mapping separately.

| Architectural intent | Package mapping | First rule to encode | Watch for |
| --- | --- | --- | --- |
| Controller talks to use case layer | \`..adapter.rest..\` to \`..application..\` | Controllers do not access persistence | Generated code placing validation in controllers. |
| Domain is isolated | \`..domain..\` | Domain does not depend on adapters or framework packages | Framework annotations creeping into entities. |
| Persistence is an adapter | \`..adapter.persistence..\` | Persistence is not accessed except through application services | Test helpers importing repositories from UI tests. |
| Features are independent | \`..feature.(*)..\` | Slices are free of cycles | Convenience mappers creating cross-feature imports. |
| Test framework stays clean | \`..testsupport..\` and \`..pages..\` | Page objects do not assert business workflows | Agent-generated helpers mixing setup, action, and assert. |

A practical pattern is to create one architecture test package per bounded context or service. Do not put every company rule in one enormous \`ArchitectureTest\` class. Smaller classes make JUnit reports readable, let teams run focused checks, and give agents narrower files to edit.

## Import Classes Explicitly

\`ClassFileImporter\` is useful when you want a plain Java test method, custom import options, or a quick spike before moving to JUnit annotations. The importer reads compiled classes, so the architecture test sees bytecode, not source files. That matters in CI: compile first, then run tests. It also means generated code and annotation-processor output can appear in the imported set unless you exclude it.

\`\`\`java
package com.example.arch;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

class ManualArchitectureTest {
    @Test
    void controllers_do_not_access_repositories() {
        JavaClasses classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.example");

        ArchRule rule = noClasses()
                .that().resideInAPackage("..adapter.rest..")
                .should().accessClassesThat().resideInAPackage("..adapter.persistence..")
                .because("REST adapters should call application services, not repositories");

        rule.check(classes);
    }
}
\`\`\`

This sample uses a negative rule because it expresses a clean boundary. A positive-only rule such as "controllers should access services" can accidentally require a dependency even for controllers that simply return health status. A negative rule says what must never happen, which is usually more stable under refactoring.

## Prefer JUnit 5 Rules for CI Visibility

The ArchUnit JUnit integration lets you declare imports once with \`@AnalyzeClasses\` and rules as \`@ArchTest\` fields or methods. The user guide confirms that \`@AnalyzeClasses\` can import packages, packages of classes, individual classes, locations, the whole classpath, and import options. It also documents caching behavior, which matters for larger monorepos: repeated imports of the same locations can be reused by multiple rules.

\`\`\`java
package com.example.arch;

import com.example.Application;
import com.tngtech.archunit.core.importer.ImportOption.DoNotIncludeTests;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

@AnalyzeClasses(packagesOf = Application.class, importOptions = DoNotIncludeTests.class)
class ApplicationArchitectureTest {
    @ArchTest
    static final ArchRule services_are_not_framework_controllers = classes()
            .that().resideInAPackage("..application..")
            .should().notBeAnnotatedWith("org.springframework.web.bind.annotation.RestController");

    @ArchTest
    static final ArchRule domain_does_not_depend_on_spring = noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "org.springframework..",
                    "jakarta.persistence.."
            );
}
\`\`\`

The static import syntax above is compact, but one line deserves attention: \`packagesOf = Application.class\` is usually safer than a raw string when a repository is renamed or moved. It makes refactoring tools useful and gives an AI agent a concrete root class to preserve.

If the project uses multiple modules, do not set \`wholeClasspath = true\` casually. It can import dependencies, generated classes, and test utilities that are outside the application slice you meant to check. Use package roots first, then widen only when a specific cross-module rule needs it.

## Encode Layers Without Turning Them Into Theater

ArchUnit's Library API includes \`layeredArchitecture()\`, with methods such as \`consideringAllDependencies()\`, \`layer(...).definedBy(...)\`, and \`whereLayer(...)\`. Layer rules are useful when the codebase actually has layers. They are harmful when you paste a three-tier example into a hexagonal service and then fight the rule forever.

\`\`\`java
package com.example.arch;

import com.example.Application;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

@AnalyzeClasses(packagesOf = Application.class)
class LayeredArchitectureTest {
    @ArchTest
    static final ArchRule layers_are_respected = layeredArchitecture()
            .consideringAllDependencies()
            .layer("Web").definedBy("..adapter.rest..")
            .layer("Application").definedBy("..application..")
            .layer("Persistence").definedBy("..adapter.persistence..")
            .whereLayer("Web").mayNotBeAccessedByAnyLayer()
            .whereLayer("Application").mayOnlyBeAccessedByLayers("Web")
            .whereLayer("Persistence").mayOnlyBeAccessedByLayers("Application");
}
\`\`\`

What people get wrong: they encode "may only be accessed by" rules before checking actual package ownership. If a package contains both application services and scheduled jobs, the layer name is lying. Split the package or write a narrower rule first. An architecture test should reveal design debt, not create a ritual where teams add exceptions until everything passes.

Layer checks also need a policy for test code. If you exclude tests, you are checking production architecture only. If you include tests, helpers and fixtures can violate production layers. Both choices are valid, but they answer different questions. I prefer one production architecture suite that excludes tests and a smaller test-architecture suite that checks test helpers explicitly.

## Use Onion Rules for Ports and Adapters

For hexagonal or onion architectures, use the dedicated \`onionArchitecture()\` API rather than forcing everything into "controller, service, repository" layers. The official user guide documents domain models, domain services, application services, and named adapters. The important semantic is direction: domain is the core, application may use domain, adapters connect external systems, and adapters should not depend on each other.

\`\`\`java
package com.example.arch;

import com.example.Application;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.library.Architectures.onionArchitecture;

@AnalyzeClasses(packagesOf = Application.class)
class OnionArchitectureTest {
    @ArchTest
    static final ArchRule onion_architecture_is_respected = onionArchitecture()
            .domainModels("com.example.domain.model..")
            .domainServices("com.example.domain.service..")
            .applicationServices("com.example.application..")
            .adapter("rest", "com.example.adapter.rest..")
            .adapter("persistence", "com.example.adapter.persistence..")
            .adapter("messaging", "com.example.adapter.messaging..");
}
\`\`\`

This is especially helpful in agent-assisted development. Agents often create shortcuts that compile: a REST controller imports a JPA entity directly, a persistence mapper imports an HTTP DTO, or a domain object gains a framework annotation because it solves a local test failure. Onion rules catch those shortcuts at the structure level.

## Catch Cycles With Slices

Cycle checks are one of the fastest ArchUnit wins because cyclic package dependencies make future testing harder. The official docs show \`slices().matching("..myapp.(*)..").should().beFreeOfCycles()\` and explain that \`(*)\` or \`(**)\` captures package segments used as slice identifiers. Choose the capture deliberately. Capturing too high produces one giant slice, while capturing too low produces many tiny slices with noisy reports.

\`\`\`java
package com.example.arch;

import com.example.Application;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

@AnalyzeClasses(packagesOf = Application.class)
class FeatureCycleTest {
    @ArchTest
    static final ArchRule features_are_free_of_cycles = slices()
            .matching("com.example.feature.(*)..")
            .should().beFreeOfCycles();

    @ArchTest
    static final ArchRule application_use_cases_do_not_depend_on_each_other = slices()
            .matching("com.example.application.(*)..")
            .should().notDependOnEachOther();
}
\`\`\`

Failure mode: a team sees a cycle failure after an agent extracts a mapper into a common package. The first instinct is to exclude the mapper. Diagnose before excluding. Run the failing test locally, read the reported dependency chain, and identify whether the common package is truly shared utility or a backchannel between features. If it is shared utility, place it in a neutral package and make both features depend inward. If it is feature-specific, move it back and create an explicit interface at the boundary.

For very large projects, tune cycle reporting in \`archunit.properties\` so reports stay readable.

\`\`\`properties
cycles.maxNumberToDetect=50
cycles.maxNumberOfDependenciesPerEdge=5
\`\`\`

Those settings do not change whether dependencies are analyzed. They keep the output from becoming unreadable when a legacy area has many cycles.

## Freeze Legacy Violations Responsibly

\`FreezingArchRule\` exists for grown projects where a correct rule would fail hundreds of times on day one. The user guide states that it records existing violations in a \`ViolationStore\`, then later runs report only new violations. When violations are fixed, the stored set is reduced to prevent regression. This is powerful, but it can hide debt if the store is treated as a trash bin.

| Freeze decision | Recommended policy | Risk if ignored |
| --- | --- | --- |
| Store location | Put the freeze store under version control | CI workers create incompatible local baselines. |
| Store creation | Allow only during a deliberate baseline job | A clean checkout can silently bless all violations. |
| Store updates | Disable in normal CI | New violations are accepted instead of failing. |
| Refreeze | Use only for intentional baseline refreshes | Teams erase progress without noticing. |

\`\`\`java
package com.example.arch;

import com.example.Application;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.freeze.FreezingArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

@AnalyzeClasses(packagesOf = Application.class)
class FrozenLegacyArchitectureTest {
    @ArchTest
    static final ArchRule domain_must_not_gain_new_adapter_dependencies =
            FreezingArchRule.freeze(noClasses()
                    .that().resideInAPackage("..domain..")
                    .should().dependOnClassesThat().resideInAPackage("..adapter.."));
}
\`\`\`

\`\`\`properties
freeze.store.default.path=src/test/resources/archunit/frozen
freeze.store.default.allowStoreCreation=false
freeze.store.default.allowStoreUpdate=false
freeze.refreeze=false
\`\`\`

For the first baseline, run a controlled command that permits store creation and updates. Commit the generated store. After that, CI should run with creation and updates disabled. If a developer fixes violations, update the store in a planned cleanup branch and review the diff like code.

## CI Wiring That Fails for the Right Reason

Architecture tests should run in the ordinary test task unless they are too slow. Keeping them in the default lane gives fast feedback and lets PR checks show failures in the same place as unit tests. If they become expensive, split them by naming convention while keeping JUnit XML artifacts.

\`\`\`yaml
name: java-tests

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: '25'
          cache: gradle
      - name: Run unit and architecture tests
        run: ./gradlew test --no-daemon
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: junit-\${{ github.run_id }}
          path: build/test-results/test/*.xml
\`\`\`

If you use Maven, the same idea applies through Surefire or Failsafe. Do not create a separate "architecture check" script that bypasses the normal build graph unless you have a reason. Agents are much more likely to keep tests healthy when the command is the same command humans run.

## Prompt Agents With Architecture Vocabulary

Ready-made QA skills can install from qaskills.sh with the qaskills CLI, but the value still comes from precise project vocabulary. When instructing an AI coding agent, include package roots, forbidden dependencies, the intended test runner, and whether legacy violations should be frozen or fixed. A good prompt says, "Add ArchUnit JUnit 5 tests under \`src/test/java/com/example/arch\` that import \`Application.class\`, exclude test classes, and block new dependencies from \`..domain..\` to \`..adapter..\`. Do not create ignore patterns unless a current violation is named."

Also ask for diagnosis, not only code. A useful agent report should list the rules added, any current failures, whether failures are new or existing, and which package move or dependency inversion would resolve them. That turns ArchUnit from a gate into a design feedback loop.

## Frequently Asked Questions

### Is ArchUnit only useful for Spring projects?

No. ArchUnit analyzes Java bytecode, so it can test architecture in Spring, Quarkus, Micronaut, Jakarta EE, command-line services, libraries, and internal test frameworks. Spring projects show many common examples because package boundaries and annotations are easy to inspect, but the tool is not tied to Spring. The key is having a stable package or class structure that expresses architectural roles. If your repository has no clear boundaries, start with cycle checks and a few forbidden dependency rules before adding layered or onion architecture rules.

### Should architecture tests include test code?

Usually create two suites. The main production architecture suite should exclude tests so helper fixtures do not pollute the dependency graph. A smaller test-architecture suite can include test code and enforce rules for page objects, API clients, fixtures, and shared assertions. That split keeps failures understandable. If one rule imports everything, a harmless test utility can make a production boundary look broken, and developers will start ignoring the suite. Separate imports make the purpose of each failure obvious.

### When should I use FreezingArchRule instead of fixing violations immediately?

Use \`FreezingArchRule\` when the rule is correct but the existing codebase has too many violations to fix in one change. Do not use it for a rule you are unsure about. First confirm the architecture decision with the team, create the baseline intentionally, commit the store, and prevent store creation or updates in normal CI. Then treat any new violation as a real failure. The healthy pattern is steady reduction of the stored violations, not permanent acceptance.

### What is the best first ArchUnit rule for a legacy Java codebase?

Start with a cycle rule over meaningful top-level packages, then add one forbidden dependency rule that matches a painful real problem. For example, block \`..domain..\` from depending on \`..adapter..\`, or block \`..adapter.rest..\` from accessing \`..adapter.persistence..\`. Avoid launching with ten abstract rules. A small rule set that catches actual drift will earn trust. Once the team sees clear failures and fixes, layer, onion, and freeze policies become much easier to introduce.
`,
};
