import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Bitrise Testing for Mobile Test Automation: Workflows, Steps, and Test Reports',
  description: 'bitrise testing guide for mobile QA teams: build Android and iOS workflows, publish test reports, shard suites, and debug CI failures faster.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# Bitrise Testing for Mobile Test Automation: Workflows, Steps, and Test Reports

Bitrise testing is best understood as mobile-first CI built around Steps, Workflows, and Pipelines. As of September 28, 2026, Bitrise CI is active, the docs are published at \`docs.bitrise.io\`, and the mobile testing Steps covered here have not been renamed into a different product. The important current Step IDs are \`android-unit-test\`, \`android-build-for-ui-testing\`, \`android-instrumented-test\`, \`virtual-device-testing-for-android\`, \`xcode-build-for-test\`, \`xcode-test-without-building\`, \`virtual-device-testing-for-ios\`, \`custom-test-results-export\`, and \`deploy-to-bitrise-io\`.

The direct answer: use Bitrise when your CI needs native Android and iOS stacks, device-oriented build Steps, code signing integrations, and one place to inspect artifacts and test reports. For a QA engineer, the payoff is less shell glue. You build APKs, test APKs, iOS test bundles, and simulator outputs with official Steps, then let the Deploy to Bitrise.io Step publish artifacts and feed the Test Reports add-on.

The catch is that Bitrise rewards explicit design. A single Workflow that runs every unit test, boots an emulator, builds an iOS test bundle, runs device tests, and uploads everything will work until it becomes slow and hard to diagnose. A better Bitrise testing setup separates fast feedback from device confidence, shares build outputs only when useful, and treats Test Reports as a contract. If you are also designing real-device coverage, pair this with [mobile device farm testing strategy](/blog/mobile-device-farm-testing-strategy-2026). If your mobile UI layer is Appium-heavy, compare the Bitrise device path with the broader [Appium mobile testing complete guide](/blog/appium-mobile-testing-complete-guide).

## The Bitrise Objects QA Engineers Actually Configure

Bitrise configuration lives in \`bitrise.yml\`. The current YAML reference describes \`format_version\`, \`default_step_lib_source\`, \`project_type\`, \`workflows\`, and \`pipelines\` as top-level concepts. Workflows are ordered Step lists. Pipelines compose Workflows and can run them in dependency graphs or stages. Steps are reusable units, usually referenced by Step ID and optional major version.

| Object | What it owns | Testing decision it controls |
| --- | --- | --- |
| Step | One task, such as cloning, running Android unit tests, or exporting results | Which official integration runs and which inputs are passed |
| Workflow | Sequential Step list | The lifecycle for one type of validation, such as unit tests or UI tests |
| Pipeline | Multiple Workflows with dependencies or stages | Parallelism, fan-out, and build artifact reuse |
| Env Var | Shared or workflow-scoped value | Module, variant, scheme, destination, shard count, and secrets |
| Stack and machine | Build image and resources | Xcode version, Android SDK availability, CPU, memory, and emulator reliability |

A minimal Android unit-test Workflow is deliberately boring. The value is that the Android Unit Test Step knows where Gradle test reports normally land and can export them for Bitrise Test Reports when followed by \`deploy-to-bitrise-io\`.

\`\`\`yaml
format_version: '25'
default_step_lib_source: https://github.com/bitrise-io/bitrise-steplib.git
project_type: android

app:
  envs:
  - PROJECT_LOCATION: .
    opts:
      is_expand: false
  - MODULE: app
    opts:
      is_expand: false
  - VARIANT: debug
    opts:
      is_expand: false

workflows:
  android_unit_tests:
    steps:
    - git-clone: {}
    - android-unit-test@1:
        inputs:
        - project_location: \${PROJECT_LOCATION}
        - module: \${MODULE}
        - variant: \${VARIANT}
    - deploy-to-bitrise-io@2: {}
\`\`\`

Notice the job boundary: this does not build a release APK, run instrumentation tests, or publish an installable app. That is intentional. Fast unit feedback should fail quickly and produce reports that are easy to read.

## Android Unit, Instrumented, and Virtual Device Tests

Bitrise documents two different Android paths that teams often merge by accident. Local unit tests run on the JVM through the Android Unit Test Step. Instrumented tests need an APK plus a test APK, then a runner on a device or emulator. For instrumented tests on Bitrise, the official docs describe Android Build for UI testing as the Step that builds both artifacts and exports their paths as \`BITRISE_APK_PATH\` and \`BITRISE_TEST_APK_PATH\`. The Android Instrumented Test Step can consume those paths for a local emulator path, while Virtual Device Testing for Android runs against Firebase Test Lab infrastructure without requiring your own Firebase account.

| Test type | Primary Step sequence | Best use | Report path concern |
| --- | --- | --- | --- |
| JVM unit tests | \`android-unit-test\` -> \`deploy-to-bitrise-io\` | Fast validation of Kotlin or Java logic | Default Gradle XML and HTML outputs usually work |
| Local emulator instrumentation | \`avd-manager\` -> \`android-build-for-ui-testing\` -> \`wait-for-android-emulator\` -> \`android-instrumented-test\` -> export -> deploy | Debuggable emulator runs inside one Workflow | Export XML from Android test result directories |
| Firebase virtual device tests | \`android-build-for-ui-testing\` -> \`virtual-device-testing-for-android\` -> \`deploy-to-bitrise-io\` | Broader device matrix with managed device execution | Step can export results to Test Reports |
| Robo or gameloop tests | \`android-build-for-ui-testing\` -> \`virtual-device-testing-for-android\` | Smoke exploration when no full instrumentation suite exists | Treat failures as signals, not precise assertions |

Here is a practical virtual-device Workflow. The Bitrise docs note that the Android virtual device testing solution has a maximum duration, configurable by the Test timeout input, and one Virtual Device Testing Step in a single build can perform one test type. Keep that limitation in mind before adding every model you can find.

\`\`\`yaml
workflows:
  android_virtual_device_tests:
    steps:
    - git-clone: {}
    - android-build-for-ui-testing@0:
        inputs:
        - project_location: \${BITRISE_SOURCE_DIR}
        - module: app
        - variant: debug
        - apk_path_pattern: '*/build/outputs/apk/*.apk'
    - virtual-device-testing-for-android@1:
        inputs:
        - test_type: instrumentation
        - app_path: \${BITRISE_APK_PATH}
        - test_apk_path: \${BITRISE_TEST_APK_PATH}
        - test_devices: Pixel2,28,en,portrait
    - deploy-to-bitrise-io@2: {}
\`\`\`

If you need local emulator control, use the emulator path instead. It is slower to provision, but it gives you more direct access to logs and can be easier to reproduce locally.

\`\`\`yaml
workflows:
  android_local_emulator_tests:
    steps:
    - avd-manager@1: {}
    - git-clone: {}
    - android-build-for-ui-testing@0:
        inputs:
        - project_location: \${BITRISE_SOURCE_DIR}
        - module: app
        - variant: debug
    - wait-for-android-emulator@1: {}
    - android-instrumented-test@0:
        inputs:
        - main_apk_path: \${BITRISE_APK_PATH}
        - test_apk_path: \${BITRISE_TEST_APK_PATH}
        - test_runner_class: androidx.test.runner.AndroidJUnitRunner
    - custom-test-results-export@1:
        inputs:
        - test_name: Emulator tests
        - base_path: \${BITRISE_SOURCE_DIR}/app/build/outputs/androidTest-results
        - search_pattern: '*.xml'
    - deploy-to-bitrise-io@2: {}
\`\`\`

What people get wrong: they treat \`android-build-for-ui-testing\` as a generic build Step. It is specifically valuable because downstream test Steps understand its artifacts. If your Workflow builds the app with an unrelated script and then guesses APK paths, your setup becomes fragile the first time Gradle output paths change or a flavor adds another artifact.

## iOS Xcode Tests, Build-for-Testing, and Device Runs

iOS on Bitrise has two common shapes. The first is normal Xcode test execution with \`xcode-test\` style behavior through the Xcode Test for iOS Step. The second is build once, test later: \`xcode-build-for-test\` runs \`xcodebuild build-for-testing\`, creates a test bundle zip, and makes it available for later test execution. Bitrise docs also describe \`xcode-test-without-building\` for running prebuilt tests in parallel Pipelines.

For quick iOS validation, start with Xcode Test for iOS and Deploy to Bitrise.io. Bitrise documentation says this official Step generates an \`.xcresult\` file and can work with enhanced reporting without extra configuration. The Deploy Step then sends raw logs, artifacts, and test results to Bitrise.

\`\`\`yaml
workflows:
  ios_xcode_tests:
    steps:
    - git-clone: {}
    - xcode-test@4:
        inputs:
        - project_path: \${BITRISE_PROJECT_PATH}
        - scheme: \${BITRISE_SCHEME}
        - destination: platform=iOS Simulator,name=iPhone 15
    - deploy-to-bitrise-io@2: {}
\`\`\`

For device testing through Firebase Test Lab for iOS, Bitrise docs say to add Xcode Build for testing for iOS, then iOS Device Testing. The Step ID shown in the configuration examples is \`xcode-build-for-test\`, and the iOS device testing Step ID is \`virtual-device-testing-for-ios\`. The build Step needs code signing if the app will be installed on devices. The docs list \`off\`, \`api-key\`, and \`apple-id\` as options for automatic code signing in that Step.

\`\`\`yaml
workflows:
  ios_device_tests:
    steps:
    - git-clone: {}
    - xcode-build-for-test@2:
        inputs:
        - project_path: \${BITRISE_PROJECT_PATH}
        - scheme: \${BITRISE_SCHEME}
        - configuration: Debug
        - destination: generic/platform=iOS
        - automatic_code_signing: api-key
    - virtual-device-testing-for-ios:
        inputs:
        - test_devices: iphone8,14.7,en,portrait
    - deploy-to-bitrise-io@2: {}
\`\`\`

The practical QA choice is simple: use simulator Xcode tests for fast pull-request feedback and device testing for a smaller but meaningful set of release gates. Device testing is not a dumping ground for every flaky UI test. It is where you prove the build installs, launches, talks to system services, and survives device-specific behavior.

## Test Reports as a Contract

The Test Reports add-on is not magic. The Bitrise docs describe three ways to get results into it: use dedicated testing Steps that already export results, add the Export test results to the Test reports Step for other runners, or export results from a custom Script Step. In all cases, the Deploy to Bitrise.io Step must run after the test results exist. The docs also note that Deploy to Bitrise.io must be version 1.4.1 or newer for Test Reports, and recommend 1.5.0 or newer. Pinning \`deploy-to-bitrise-io@2\` avoids that old-version trap.

| Source of results | Export mechanism | Common failure | Diagnosis |
| --- | --- | --- | --- |
| Android Unit Test | Step exports expected Gradle result paths | Tests fail but Tests tab is empty | Check whether Deploy to Bitrise.io ran after the test Step |
| Xcode Test for iOS | Step generates \`.xcresult\` and deploy handles it | HTML report missing details | Confirm the official Xcode Step produced an \`.xcresult\` |
| Custom Gradle or shell command | \`custom-test-results-export\` | XML files found locally but not in reports | Verify \`base_path\` and \`search_pattern\` match actual files |
| Device test Step | Device Step exports logs and reports | Device artifacts exist but no grouped cases | Confirm supported test type and result format |

For AI coding agents, make the report contract explicit in the prompt or skill instructions. Tell the agent to preserve the Step order, use \`deploy-to-bitrise-io\` at the end, and keep XML export paths tied to the module being tested. Ready-made QA skills install from qaskills.sh with the qaskills CLI, but the underlying rule is the same: an agent should change the test command and the report export together, not one without the other.

## Parallelism and Sharding Without Losing Signal

Bitrise supports test sharding through Pipelines and Workflow parallelism. The docs describe Bitrise-provided sharding calculation for iOS with the Xcode test shard calculation Step and for Android with Gradle Runner, plus Pipeline configuration that runs multiple copies of a testing Workflow. For iOS, Bitrise examples build a test bundle once, share \`BITRISE_TEST_SHARDS_PATH\` and \`BITRISE_TEST_BUNDLE_PATH\` through Deploy to Bitrise.io, then use \`xcode-test-without-building\` in downstream Workflows. For Android, the current supported use case page describes a Pipeline stage with \`unit_tests\` and \`ui_tests\` running in parallel.

Use sharding after the suite has stable reporting and deterministic setup. Sharding a flaky suite makes it faster to get random answers. A good adoption sequence is: separate unit and UI Workflows, publish reports, remove environment coupling, then shard.

\`\`\`yaml
pipelines:
  android_pr_checks:
    workflows:
      android_unit_tests: {}
      android_virtual_device_tests: {}

workflows:
  android_unit_tests:
    steps:
    - git-clone: {}
    - android-unit-test@1:
        inputs:
        - project_location: \${PROJECT_LOCATION}
        - module: app
        - variant: debug
    - deploy-to-bitrise-io@2: {}

  android_virtual_device_tests:
    steps:
    - git-clone: {}
    - android-build-for-ui-testing@0:
        inputs:
        - project_location: \${BITRISE_SOURCE_DIR}
        - module: app
        - variant: debug
    - virtual-device-testing-for-android@1:
        inputs:
        - test_type: instrumentation
    - deploy-to-bitrise-io@2: {}
\`\`\`

That Pipeline does not depend on build artifact sharing, so both Workflows clone and work independently. It is wasteful for very large builds but excellent for clarity. Once the UI build cost dominates, switch to a build Workflow that publishes the APK and test APK as intermediate artifacts, then test Workflows consume them.

## Caching and Dependency Setup

Bitrise has official dependency and caching guidance, and the best testing setup follows the project type. Android Steps run Gradle tasks in a CI environment and can handle dependencies if Gradle is configured correctly. iOS workflows often need CocoaPods, Carthage, Swift Package Manager, or npm dependency Steps before Xcode Steps. Caching helps, but it should not hide missing dependency declarations.

| Ecosystem | Cache target | What to avoid |
| --- | --- | --- |
| Android Gradle | Gradle dependency and build caches | Caching generated test reports or APK outputs as if they were dependencies |
| iOS CocoaPods | Pods and spec repos when appropriate | Caching a workspace while the Podfile.lock changed |
| React Native mobile | Node package cache plus native dependency caches | Letting JS install failures appear later as Xcode or Gradle failures |
| Flutter | Flutter package cache | Adding extra install Steps when official Flutter Steps already handle packages |

Keep cache pull near the top and cache push after the test or build Steps that should warm the cache. Do not push cache after a failed dependency installation unless the Step explicitly handles that safely. If a build becomes flaky only after cache is enabled, run one diagnostic build with cache pull disabled. That is faster than rewriting tests that were never the problem.

## A Real Failure Mode: Empty Tests Tab After Green Tests

Suppose Android unit tests pass, Gradle prints a normal test summary, the build is green, but the Bitrise Tests tab says there are no test results. Diagnose it in this order.

| Check | What to inspect | Likely fix |
| --- | --- | --- |
| Deploy Step order | Is \`deploy-to-bitrise-io\` after the test Step? | Move it to the end of the Workflow |
| Deploy Step version | Is the Step older than 1.4.1? | Pin \`deploy-to-bitrise-io@2\` |
| Custom report path | Did the test runner write XML outside the default path? | Add \`custom-test-results-export\` with the right base path |
| Module name | Does the path include \`app\` while tests run in another module? | Parameterize the module and base path |
| Step choice | Did a shell Step run tests instead of an official test Step? | Export results explicitly before deploy |

The recurring root cause is that teams think "artifact uploaded" and "test report parsed" are the same thing. They are not. Artifacts let you download files. Test Reports need files in a supported format and a Deploy Step that knows where to send them. If your script writes JUnit XML, export it intentionally.

\`\`\`yaml
workflows:
  custom_gradle_test_reports:
    steps:
    - git-clone: {}
    - script@1:
        title: Run a custom Gradle verification task
        inputs:
        - content: |-
            #!/usr/bin/env bash
            set -euo pipefail
            ./gradlew :feature-login:testDebugUnitTest
    - custom-test-results-export@1:
        inputs:
        - test_name: feature-login unit tests
        - base_path: \${BITRISE_SOURCE_DIR}/feature-login/build/test-results
        - search_pattern: '*.xml'
    - deploy-to-bitrise-io@2: {}
\`\`\`

## Agent-Friendly Guardrails

AI coding agents are useful in Bitrise work because configuration changes are text, failures are log-heavy, and most fixes are repeatable. The risk is that agents overfit to one failure and damage the mobile build contract. Give them constraints that match the system.

Use this agent checklist before accepting a Bitrise testing PR:

| Guardrail | Why it matters |
| --- | --- |
| Preserve official Step IDs unless replacing the whole strategy | Step outputs feed later Steps |
| Keep report export adjacent to the test command | Reports fail silently when paths drift |
| Do not mix simulator, emulator, and device goals in one name | Reviewers need to know what failed |
| Pin major Step versions in examples | Latest can change behavior without a code diff |
| Treat secrets as Bitrise Secrets, not YAML values | Logs and repository history are permanent |

Ask the agent to produce one Workflow per validation goal, plus a short failure table. That gets better results than "make CI faster" because it forces the model to name the tradeoff.

## Frequently Asked Questions

### Is Bitrise testing only for mobile apps?

Bitrise is strongest for mobile apps because its stacks, project scanner, code signing, Android, and Xcode Steps are designed around mobile CI. You can run general scripts, web tests, and custom tools in Bitrise, but the platform's advantage is clearest when a build needs Android SDKs, Xcode, signing assets, simulator outputs, APKs, IPAs, and mobile test artifacts. For a web-only QA suite, GitHub Actions or another general CI may be simpler.

### Should Android instrumentation tests run on local emulators or Firebase virtual devices?

Use local emulators when you need tight log access, direct adb behavior, and a smaller debug loop inside one Workflow. Use Bitrise Virtual Device Testing for Android when you want managed device execution and easier matrix-style confidence. Both paths start with \`android-build-for-ui-testing\`, but they diverge after artifact creation. Most teams should keep fast unit tests separate, then run a smaller instrumentation suite on one of these paths for pull requests or release candidates.

### Why are my Bitrise Test Reports empty when the build passed?

A passing command does not automatically create a parsed report. Confirm that your test runner generated XML or \`.xcresult\` files, that the relevant official test Step exported them, or that \`custom-test-results-export\` points to the correct directory. Then confirm \`deploy-to-bitrise-io\` runs after that export and uses a modern major version. The most common bug is putting Deploy too early or changing a module path without updating the report export.

### How should I introduce sharding without making failures harder to debug?

First separate unit, UI, and device Workflows. Second, publish stable reports from each one. Third, remove shared mutable state, including account reuse, cache-dependent fixtures, and order-dependent tests. Only then shard. Start with a small shard count and name each Workflow or Pipeline target clearly. If failures become harder to triage, keep the sharded path for scheduled builds and preserve a non-sharded pull-request Workflow for diagnosis.
`,
};
