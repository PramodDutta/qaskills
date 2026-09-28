import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Firebase Test Lab: Running Android and iOS Tests on Real Devices',
  description: 'Use firebase test lab to run Android and iOS tests on real devices, select matrices, shard suites, manage artifacts, and wire CI with cost control.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# Firebase Test Lab: Running Android and iOS Tests on Real Devices

Firebase Test Lab is Google's hosted device testing service for Android and iOS. It is active, documented in the Firebase site, and still driven by the Google Cloud CLI commands \`gcloud firebase test android run\` and \`gcloud firebase test ios run\`. For Android it supports instrumentation tests, Robo tests, and Game Loop tests. For iOS it supports XCTest, XCUITest, Game Loop, and, according to the current gcloud reference, an iOS \`robo\` test type in the command surface.

The direct payoff is simple: you can move mobile tests from "works on my emulator" to repeatable matrices across hosted physical and virtual devices, with logs, screenshots, videos, flaky-attempt status, and raw artifacts stored in Cloud Storage. The service does not remove the need for good test code. It gives QA teams a controlled place to run that code across devices they do not own. If you are still defining your device coverage model, pair this guide with [Mobile Device Farm Testing Strategy 2026](/blog/mobile-device-farm-testing-strategy-2026). If your Android suite is Espresso-based, the execution details here complement [Espresso Android Testing Guide](/blog/espresso-android-testing-guide).

The official docs verified for this article include https://firebase.google.com/docs/test-lab/android/command-line, https://firebase.google.com/docs/test-lab/ios/command-line, https://firebase.google.com/docs/test-lab/usage-quotas-pricing, and the Google Cloud CLI references at https://docs.cloud.google.com/sdk/gcloud/reference/firebase/test/android/run and https://docs.cloud.google.com/sdk/gcloud/reference/firebase/test/ios/run.

## What Firebase Test Lab Actually Runs

Think of Firebase Test Lab as a matrix runner, not as a test framework. You bring an Android APK and optionally a test APK, or you bring an iOS XCTest zip. Test Lab schedules those artifacts against device dimensions such as model, OS version, locale, and orientation. The result is a test matrix. If any execution in the matrix fails, the matrix is treated as failed.

| Platform | Test type | You provide | Best use |
|---|---|---|---|
| Android | Instrumentation | App APK plus test APK | Espresso, UI Automator, Kaspresso, Compose UI tests |
| Android | Robo | App APK, optional Robo script | Crash discovery and broad UI exploration without writing tests |
| Android | Game Loop | App APK with game loop support | Game scenarios that can run without conventional UI assertions |
| iOS | XCTest or XCUITest | Zipped build products with \`.xctestrun\` | Deterministic iOS UI and integration tests |
| iOS | Game Loop | IPA and scenario numbers | Game validation on hosted iOS devices |

The most common mistake is sending every test to every device on every pull request. That gives you slow feedback, large bills on Blaze, and failure reports nobody reads. A better model is layered: one or two fast smoke devices for pull requests, a broader physical-device set on nightly, and a release-candidate matrix that covers the oldest supported OS, latest OS, common screen sizes, and the devices where your analytics show meaningful usage.

## Choose Test Types With Intent

Instrumentation tests are for known behavior. Robo tests are for exploration. They should not be evaluated with the same expectations. Instrumentation answers "does checkout still work on this Pixel device running this Android version?" Robo answers "can an automated crawler find crashes or obvious UI traps?" Game Loop answers "can a game scenario run without a manual tester driving the UI?"

| Decision | Instrumentation | Robo |
|---|---|---|
| Requires test code | Yes | No, unless you add Robo scripts |
| Assertion quality | High, because your tests define expected state | Lower, because crash and traversal signals dominate |
| Best pull-request use | Critical paths and regression checks | Usually too noisy unless scoped |
| Best scheduled use | Full regression matrix | Exploratory crash discovery |
| Failure ownership | Test or app owner can inspect assertion | QA needs to classify crawler path and crash evidence |

For iOS, the equivalent split is between XCTest or XCUITest and Game Loop. XCTest is the path for app behavior assertions. Game Loop is specialized for games that can expose scenario numbers.

## Prepare Android Artifacts

For Android instrumentation, build both the app APK and the Android test APK. The package names and output paths vary by project, but the default debug outputs are usually under \`app/build/outputs/apk/debug\` and \`app/build/outputs/apk/androidTest/debug\`.

\`\`\`bash
./gradlew :app:assembleDebug :app:assembleDebugAndroidTest
test -f app/build/outputs/apk/debug/app-debug.apk
test -f app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
\`\`\`

A minimal instrumentation run uses \`--type instrumentation\`, \`--app\`, \`--test\`, and at least one \`--device\` flag. The Firebase docs state that \`--device\` is the preferred way to specify model, Android version, locale, and orientation, and should not be mixed with legacy dimension flags such as \`--device-ids\`, \`--os-version-ids\`, \`--locales\`, or \`--orientations\`.

\`\`\`bash
gcloud firebase test android run --type instrumentation --app app/build/outputs/apk/debug/app-debug.apk --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk --device model=Pixel2,version=30,locale=en,orientation=portrait
\`\`\`

To discover available Android device models and versions, use the list commands before hardcoding a matrix. Device availability changes, and the docs deliberately route users to CLI discovery rather than static lists.

\`\`\`bash
gcloud firebase test android models list
gcloud firebase test android versions list
gcloud firebase test android models describe Pixel2
\`\`\`

Keep a checked-in matrix file or script close to the app. Do not rely on a CI UI field that only one release engineer remembers. Agents can update a committed file, reviewers can diff it, and QA can tie matrix changes to product support policy.

## Select Android Devices Without Overfitting

A Firebase Test Lab device matrix should represent risk, not personal preference. Include a small virtual device when fast feedback matters. Include physical devices when hardware behavior matters: camera, biometrics, manufacturer WebView behavior, graphics stack, push notification behavior, or device-specific layout issues.

| Matrix layer | Device idea | Trigger | Timeout posture |
|---|---|---|---|
| Pull request smoke | One stable virtual Android device | Every PR | Short, fail fast |
| Merge queue | One virtual plus one physical phone | Before merge to main | Moderate |
| Nightly | Several OS versions and form factors | Scheduled | Longer, artifact-rich |
| Release candidate | Supported oldest OS, latest OS, top usage devices | Manual or release branch | Long enough for full regression |

The official Android get-started page notes that physical-device tests are limited to 45 minutes and virtual-device tests to 60 minutes. Treat those limits as upper bounds, not goals. A 40-minute pull-request matrix becomes a tax on every engineer. If you need full coverage, schedule it.

## Use Test Targets And Sharding Deliberately

The Android gcloud reference documents \`--test-targets\` for package, class, method, and annotation filters supported by AndroidJUnitRunner. Use it to keep pull-request runs focused. For example, run only smoke tests on every PR and reserve large annotations for nightly runs.

\`\`\`bash
gcloud firebase test android run --type instrumentation --app app/build/outputs/apk/debug/app-debug.apk --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk --device model=Pixel2,version=30,locale=en,orientation=portrait --test-targets "annotation com.example.test.Smoke"
\`\`\`

Firebase docs also describe uniform and manual sharding flags in beta, and the Android command reference exposes \`--num-uniform-shards\` and \`--test-targets-for-shard\` in the current command surface. Sharding is not a free speed button. It multiplies device executions, which can multiply cost and queueing. Use it when a long suite has independent tests and deterministic fixtures.

\`\`\`bash
gcloud beta firebase test android run --type instrumentation --app app/build/outputs/apk/debug/app-debug.apk --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk --device model=Pixel2,version=30,locale=en,orientation=portrait --num-uniform-shards=4
\`\`\`

If you use Android Test Orchestrator, the Firebase Android CLI docs show \`--use-orchestrator\` and \`--no-use-orchestrator\`. Orchestrator runs each test in its own instrumentation instance, which can reduce shared-state leakage. It also changes coverage collection, so the docs show different \`coverageFile\` and \`coverageFilePath\` environment variables depending on orchestrator usage.

\`\`\`bash
gcloud firebase test android run --type instrumentation --app app/build/outputs/apk/debug/app-debug.apk --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk --device model=Pixel2,version=30,locale=en,orientation=portrait --use-orchestrator --environment-variables clearPackageData=true,coverage=true,coverageFilePath=/sdcard/Download/ --directories-to-pull /sdcard/Download
\`\`\`

What people get wrong: they turn on sharding and flaky retries at the same time, then celebrate the green matrix without checking whether the underlying suite got less deterministic. \`--num-flaky-test-attempts\` is useful because Test Lab can mark an execution flaky when it fails first and passes on retry. It is not a substitute for owning the failure.

## Run Android Robo Tests For Discovery

Robo tests require less setup. You upload the app APK and let Test Lab crawl the UI. This is useful early in a project, after navigation refactors, and before release candidates. It is less useful as a strict PR gate because failures may require classification.

\`\`\`bash
gcloud firebase test android run --type robo --app app/build/outputs/apk/debug/app-debug.apk --device model=Pixel2,version=30,locale=en,orientation=portrait --timeout=5m
\`\`\`

Use Robo results to file product bugs, missing accessibility labels, unexpected crash paths, and login-wall problems. Do not compare Robo coverage to a hand-written Espresso suite. They answer different questions.

## Prepare iOS XCTest Packages

The iOS docs describe building for a Generic iOS Device, then zipping the \`Debug-iphoneos\` directory and the generated \`.xctestrun\` file. They also recommend verifying app and runner signatures with \`codesign --verify --deep --verbose\` before upload.

\`\`\`bash
xcodebuild build-for-testing -workspace Shop.xcworkspace -scheme Shop -destination "generic/platform=iOS" -derivedDataPath build/ios_testlab
cd build/ios_testlab/Build/Products
zip -r MyTests.zip Debug-iphoneos Shop_iphoneos18.0-arm64.xctestrun
\`\`\`

Run the package with \`gcloud firebase test ios run --test\` and one or more \`--device\` flags. The iOS docs also warn that tests can fail because the Xcode version used to build the test is incompatible with the default Xcode version used by Test Lab. Use \`--xcode-version\` when you need to pin a supported version.

\`\`\`bash
gcloud firebase test ios run --test build/ios_testlab/Build/Products/MyTests.zip --device model=iphone14,version=16.6,locale=en_US,orientation=portrait --xcode-version=15
\`\`\`

To discover iOS model and version IDs, use the corresponding list commands.

\`\`\`bash
gcloud firebase test ios models list
gcloud firebase test ios versions list
gcloud firebase test ios models describe iphone14
\`\`\`

The gcloud iOS reference documents additional flags including \`--xctestrun-file\`, \`--timeout\`, \`--num-flaky-test-attempts\`, \`--record-video\`, \`--results-bucket\`, \`--results-dir\`, \`--results-history-name\`, and \`--test-special-entitlements\`. Use \`--xctestrun-file\` when you need to customize or shard methods by changing the test plan metadata outside the zip.

## Manage Results And Artifacts

Firebase Test Lab prints a results link when a run starts and stores summaries in the Firebase console. The Android get-started page says raw test results contain logs and app failure details and are automatically stored in a Google Cloud bucket. If you do not specify a bucket, Test Lab creates one. If you specify your own bucket, you are responsible for its storage cost.

| Artifact | Where to look | Why QA cares |
|---|---|---|
| Console summary | Firebase console Test Lab history | Fast pass, fail, flaky overview |
| Logs | Raw Cloud Storage artifacts | Root-cause exceptions and runner output |
| Screenshots | Test execution details and storage | Visual proof of UI state |
| Video | Execution artifacts when recording is enabled | Timing and transition diagnosis |
| Coverage files | Pulled directory in storage | Regression scope analysis when coverage is configured |

Use \`--results-bucket\` and \`--results-dir\` when you need predictable artifact paths. The Android command reference warns that \`--results-dir\` must be unique for each test matrix, otherwise results can be overwritten or intermingled.

\`\`\`bash
gcloud firebase test android run --type instrumentation --app app/build/outputs/apk/debug/app-debug.apk --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk --device model=Pixel2,version=30,locale=en,orientation=portrait --results-bucket=my-mobile-test-results --results-dir=android/pr-123/run-456 --results-history-name=android-pr-smoke
\`\`\`

For CI, make \`results-dir\` include a unique run identifier from the CI system. In GitHub Actions, that usually means \${{ github.run_id }} or \${{ github.run_attempt }} in the workflow source. In shell scripts, pass the value as an argument rather than building paths through string concatenation in several places.

## Understand Quotas, Pricing, And Cost Control

The Firebase usage, quotas, and pricing page is current and important. It says Test Lab and Android Device Streaming have Cloud API quota and testing quota included in the standard Spark and Blaze plans. Spark currently lists up to 15 total test runs per day: 10 on virtual devices and 5 on physical devices. Blaze starts with no-cost daily test time similar to Spark: 30 minutes per day on physical devices and 60 minutes per day on virtual devices. Usage above those no-cost limits is charged by device minute, rounded up to the nearest minute, with official hourly rates listed as $5 per physical-device hour and $1 per virtual-device hour.

| Cost lever | Why it moves spend | Control |
|---|---|---|
| Device count | Each matrix dimension creates executions | Use narrow PR matrix and broad scheduled matrix |
| Physical devices | Higher billed rate than virtual devices | Reserve for hardware-risk paths |
| Timeout | Long timeouts can consume minutes even on stuck tests | Set realistic \`--timeout\` per suite |
| Shards | Parallelism can multiply executions | Shard only long, deterministic suites |
| Artifacts | Custom buckets can add storage charges | Retention policy and failure-focused uploads |

Budget alerts are alerts, not caps. The official page explicitly warns that budget alerts do not cap usage or charges. If cost control matters, enforce it in CI: separate workflows, manual approval for release matrices, scheduled nightly limits, and a script that refuses to launch an oversized matrix on pull requests.

## Build A CI Workflow That Separates Build From Device Execution

A robust CI flow has four phases: build artifacts, authenticate to Google Cloud, run the matrix, and publish a pointer to results. Do not mix build logic and matrix logic in one unreadable command. The workflow below installs the Google Cloud CLI through apt, authenticates with a service account JSON secret, builds Android APKs, and runs a PR smoke matrix. It uses only the current major versions specified for first-party GitHub Actions in this workspace.

\`\`\`yaml
name: firebase-test-lab-android

on:
  pull_request:
  workflow_dispatch:

jobs:
  android-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: "21"

      - name: Install Google Cloud CLI
        run: |
          sudo apt-get update
          sudo apt-get install -y apt-transport-https ca-certificates gnupg curl
          curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
          echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list
          sudo apt-get update
          sudo apt-get install -y google-cloud-cli

      - name: Authenticate Google Cloud
        run: |
          printf '%s' '\${{ secrets.GCP_SA_KEY }}' > key.json
          gcloud auth activate-service-account --key-file=key.json
          gcloud config set project "\${{ vars.FIREBASE_PROJECT_ID }}"

      - name: Build Android APKs
        run: ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest

      - name: Run Firebase Test Lab smoke matrix
        run: |
          gcloud firebase test android run --type instrumentation --app app/build/outputs/apk/debug/app-debug.apk --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk --device model=Pixel2,version=30,locale=en,orientation=portrait --test-targets "annotation com.example.test.Smoke" --timeout=10m --num-flaky-test-attempts=1 --results-bucket="\${{ vars.FTL_RESULTS_BUCKET }}" --results-dir="android/pr-\${{ github.event.pull_request.number }}/run-\${{ github.run_id }}-\${{ github.run_attempt }}"
\`\`\`

For iOS, the same idea applies, but use macOS runners for Xcode packaging and then call \`gcloud firebase test ios run\`. Keep Xcode version choices visible because Test Lab compatibility can be the difference between a real app failure and an infrastructure failure.

\`\`\`yaml
name: firebase-test-lab-ios

on:
  workflow_dispatch:

jobs:
  ios-xctest:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v7

      - name: Build XCTest package
        run: |
          xcodebuild build-for-testing -workspace Shop.xcworkspace -scheme Shop -destination "generic/platform=iOS" -derivedDataPath build/ios_testlab
          cd build/ios_testlab/Build/Products
          zip -r MyTests.zip Debug-iphoneos Shop_iphoneos18.0-arm64.xctestrun

      - name: Run iOS tests in Firebase Test Lab
        run: |
          gcloud firebase test ios run --test build/ios_testlab/Build/Products/MyTests.zip --device model=iphone14,version=16.6,locale=en_US,orientation=portrait --xcode-version=15 --timeout=20m --results-bucket="\${{ vars.FTL_RESULTS_BUCKET }}" --results-dir="ios/manual/run-\${{ github.run_id }}-\${{ github.run_attempt }}"
\`\`\`

The iOS workflow assumes gcloud is already available on the runner or installed in an earlier organization-standard setup step. If it is not, use the same installation approach as the Android workflow or a verified organization action with a pinned major.

## Failure Mode: Matrix Fails But Local Tests Pass

Scenario: Android checkout instrumentation passes on a developer emulator and fails on Firebase Test Lab only on one physical device. The matrix reports exit code 10, meaning one or more test cases did not pass. The screenshot shows the checkout screen, but the assertion for "Place order" fails.

Diagnosis:

| Signal | Interpretation | Next check |
|---|---|---|
| One device fails, others pass | Device or OS-specific behavior is likely | Compare screen size, API level, navigation mode, and locale |
| Screenshot shows the screen | Navigation worked | Inspect hierarchy and view visibility |
| Button text assertion fails | Copy, localization, or layout state changed | Prefer resource ID plus enabled state when text is not the contract |
| Video shows spinner over button | App is still loading | Add real idling or wait for loading view to disappear |
| Retry passes | Flaky app state or backend data race | Fix fixture setup before increasing retries |

The bad fix is to add a longer sleep before the assertion. The better fix is to assert the loaded state that makes the button actionable: loading indicator gone, cart summary present, and order button enabled. If this is a Kaspresso or Espresso test, the test should assert a real side effect after tapping, such as an order confirmation id, not only a status code from an API mock.

## Operational Rules For QA Teams

Write down who owns each matrix. A PR smoke matrix is owned by feature teams because it blocks their work. Nightly device coverage is owned by QA or release engineering because it tracks product risk. Release-candidate matrices are owned by the release captain because they trade time for confidence.

Keep test lab commands reproducible outside CI. A developer should be able to copy the command, swap paths to local APKs or XCTest zips, and reproduce a failure. Avoid hidden UI-only configuration. Also keep a small document with accepted failure categories: app bug, test bug, infrastructure error, device capacity issue, unsupported OS combination, and flaky retry. Without categories, every red matrix becomes a debate.

For AI coding agents, attach three things to a failure ticket: the exact gcloud command, the Firebase result link, and the artifact path. The agent can then reason from concrete evidence instead of guessing which device, test target, or timeout was used.

## Firebase Test Lab Compared With A Private Device Farm

Firebase Test Lab is excellent when you want quick access to hosted devices without maintaining hardware. A private device farm is better when you need special peripherals, custom OS images, lab-only network conditions, or extremely high run volume where owned hardware is cheaper. Many mature teams use both: Firebase for broad hosted coverage and an internal bench for specialized hardware.

| Need | Firebase Test Lab fit | Private farm fit |
|---|---|---|
| Fast setup | Strong | Weak unless farm already exists |
| Special hardware | Limited | Strong |
| Device maintenance | Google-owned | Team-owned |
| Cost predictability | Good with matrix discipline | Good after upfront investment |
| CI integration | Strong through gcloud | Depends on farm tooling |
| Debugging physical device state | Artifact-based | Direct access possible |

Do not build a private lab just because a cloud run failed twice. Build it when your product risk cannot be represented by hosted devices, or when the economics of repeated testing clearly justify maintenance.

## Frequently Asked Questions

### Is Firebase Test Lab free?

It has no-cost quota through the Spark plan and no-cost daily test time on Blaze, but it is not unlimited. The official pricing page currently lists Spark at up to 15 test runs per day total, split between virtual and physical devices. On Blaze, usage above the no-cost daily time is billed by device minute, rounded up, with separate physical and virtual rates. Always check the official pricing page before expanding a matrix.

### Can Firebase Test Lab run iOS UI tests?

Yes. Firebase Test Lab can run XCTest and XCUITest packages on hosted iOS devices. You build for testing with Xcode, zip the build products and \`.xctestrun\` file, then call \`gcloud firebase test ios run --test\` with one or more \`--device\` flags. Pay attention to Xcode compatibility. If the default Test Lab Xcode version is not compatible with your package, set \`--xcode-version\` explicitly.

### Should I use Robo tests or instrumentation tests for Android?

Use instrumentation tests when you know the behavior you want to verify and need meaningful assertions. Use Robo tests when you want automated exploration, crash discovery, or quick coverage before a suite exists. Robo is useful, but it does not replace Espresso, UI Automator, Kaspresso, or Compose UI tests. Most teams use instrumentation for gates and Robo for scheduled discovery or release-candidate exploration.

### How should I handle flaky results in Firebase Test Lab?

Use \`--num-flaky-test-attempts\` to identify executions that fail first and pass on retry, then treat the flaky label as evidence, not forgiveness. Inspect videos, logs, and screenshots. If the app is still loading, fix synchronization. If data varies, fix fixtures. If only one device fails, compare OS, model, screen, and locale. Keep retry counts low on PRs so real instability remains visible.
`,
};
