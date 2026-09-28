import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Patrol Flutter: Native E2E Testing Guide',
  description: 'Patrol Flutter guide for QA engineers: setup, native automation, CLI flags, screenshots, CI, device farms, and when to use Patrol over Appium.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# Patrol Flutter: Native E2E Testing Guide

Patrol Flutter testing is the strongest fit when your end-to-end scenario starts in Flutter but must cross into native device behavior: permissions, notifications, WebViews, system settings, backgrounding, dark mode, connectivity, and platform views. I verified Patrol against the official LeanCode docs, pub.dev, and the leancodepl/patrol repository. Patrol is active, open source, and maintained by LeanCode. The current pub.dev package I verified is \`patrol\` \`4.10.0\`, with prerelease \`4.11.0-dev.1\`. The current stable \`patrol_cli\` I verified is \`4.8.0\`, with prerelease \`4.9.0-dev.2\`.

That version detail matters because recent Patrol releases changed the default test directory to \`patrol_test\`, added web support through Playwright, added build-time test discovery, and in Patrol \`4.10.0\` added opt-in Android native failure screenshots and \`$.takeNativeScreenshot('tag')\`, requiring \`patrol_cli\` \`4.8.0\` or newer. If an older article tells you to put every Patrol test under \`integration_test\` or to call deprecated native APIs directly, treat it as dated.

Use Patrol when Flutter's official \`integration_test\` package cannot touch the surface you need. Use plain \`integration_test\` when the flow is entirely Flutter-rendered and you want the smallest official harness. Use [Appium 2 mobile automation reference 2026](/blog/appium-2-mobile-automation-reference-2026) when you need black-box, cross-app, cross-language automation. Use [XCUITest iOS UI testing tutorial 2026](/blog/xcuitest-ios-ui-testing-tutorial-2026) when iOS-native fidelity and Apple's runner are the center of the job.

## Current Status And Why Patrol Exists

Flutter's official docs now name two common packages for integration testing: \`integration_test\`, which is part of the Flutter SDK, and \`patrol\`, a third-party package that can additionally interact with native platform UI such as permission dialogs, notifications, and platform-view contents. Patrol's own docs describe the same gap: \`integration_test\` does a good job for basic Flutter integration tests, but it cannot interact with the OS your app is running on.

Patrol solves that by integrating Flutter tests with native Android and iOS test infrastructure. The \`patrol test\` command builds the app under test and the instrumentation app, installs them on the selected device, runs tests natively, and reports results in native format. Under the hood, the CLI calls Gradle on Android and \`xcodebuild\` on iOS.

| Fact verified | Current status | Why QA teams should care |
| --- | --- | --- |
| Package owner | LeanCode, open source repo \`leancodepl/patrol\` | Not a one-off community snippet. |
| \`patrol\` latest | \`4.10.0\` on pub.dev | Includes Android native failure screenshots and build-time discovery fixes. |
| \`patrol_cli\` latest | \`4.8.0\` on pub.dev | Required for the newer screenshot path. |
| Default test directory | \`patrol_test\` since Patrol 4.0 | Older \`integration_test\` examples may not run by default. |
| Web support | Via Playwright through \`patrol test --device chrome\` | Browser artifacts land in \`test-results/\`. |
| Native layer | Espresso and XCUITest style execution | Device farms can run Patrol as native tests. |

The common misunderstanding is that Patrol replaces every Flutter test. It does not. Unit tests still belong in \`test/\`. Widget tests still belong in \`test/\`. Simple app flows can still use \`integration_test\`. Patrol earns its maintenance cost when the flow depends on native surfaces or when the team wants Flutter-authored tests that device farms can execute as native tests.

## Install And Configure Patrol

The official install docs use \`flutter pub global activate patrol_cli\`, followed by \`patrol doctor\`. The CLI must be on your \`PATH\`. The docs also note that Patrol CLI invokes Flutter for some commands and can be pointed at a version manager using \`--flutter-command\` or the \`PATROL_FLUTTER_COMMAND\` environment variable. That is useful for FVM or puro teams.

\`\`\`bash
flutter pub global activate patrol_cli
patrol doctor
flutter pub add patrol --dev
\`\`\`

The minimum useful \`pubspec.yaml\` includes a \`patrol\` section with app identity. The official setup page shows \`app_name\`, Android \`package_name\`, iOS \`bundle_id\`, and macOS \`bundle_id\`. It also documents \`test_directory\` when you intentionally want a custom directory, and \`screenshot_on_failure: true\` for native Android failure screenshots.

\`\`\`yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  patrol: ^4.10.0

patrol:
  app_name: QA Skills Demo
  screenshot_on_failure: true
  android:
    package_name: sh.qaskills.demo
  ios:
    bundle_id: sh.qaskills.demo
  macos:
    bundle_id: sh.qaskills.demo.macos
\`\`\`

If your repo still stores Patrol tests under \`integration_test/\`, either move them to \`patrol_test/\` or set \`patrol.test_directory\` explicitly. Do not rely on a tribal-memory command that only one engineer runs locally. Put the directory choice in version control so AI coding agents and CI both see the same contract.

## First Patrol Test With Native Intent

A Patrol test uses \`patrolTest\` and a \`PatrolIntegrationTester\`, conventionally named \`$\`. Patrol custom finders let you write \`$('Log in')\`, \`$(Key('loginButton'))\`, or \`$(#loginButton)\`. The docs also show that you can wrap normal Flutter finders, such as \`find.bySemanticsLabel('Edit profile')\`, inside Patrol finders.

This self-contained example keeps the app in the test file so the mechanics are runnable. A real app would import its app widget and test support setup.

\`\`\`dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patrol/patrol.dart';

void main() {
  patrolTest('signs in and verifies the dashboard state', ($) async {
    await $.pumpWidgetAndSettle(const DemoApp());

    expect($('Email').visible, equals(true));
    await $(#emailField).enterText('qa@example.com');
    await $(#passwordField).enterText('correct-horse');
    await $(#signInButton).tap();

    await $('Dashboard').waitUntilVisible();
    expect($('Signed in as qa@example.com').visible, equals(true));
  });
}

class DemoApp extends StatefulWidget {
  const DemoApp({super.key});

  @override
  State<DemoApp> createState() => _DemoAppState();
}

class _DemoAppState extends State<DemoApp> {
  final TextEditingController email = TextEditingController();
  bool signedIn = false;

  @override
  void dispose() {
    email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: signedIn
            ? Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    const Text('Dashboard'),
                    Text('Signed in as \${email.text}'),
                  ],
                ),
              )
            : Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: <Widget>[
                    const Text('Email'),
                    TextField(key: const ValueKey<String>('emailField'), controller: email),
                    const Text('Password'),
                    const TextField(key: ValueKey<String>('passwordField'), obscureText: true),
                    TextButton(
                      key: const ValueKey<String>('signInButton'),
                      onPressed: () => setState(() => signedIn = email.text.isNotEmpty),
                      child: const Text('Log in'),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
\`\`\`

Run it with Patrol, not \`flutter test\`. The official install docs are blunt on this point: Patrol CLI is necessary to run UI tests, and \`flutter test\` will not work for Patrol UI tests.

\`\`\`bash
patrol test --target patrol_test/sign_in_test.dart
\`\`\`

For development, \`patrol develop --target patrol_test/example_test.dart\` gives a hot restart loop. After the initial build, type \`r\` in the terminal to rerun the test logic without paying the full app build cost each time. That is where Patrol feels different from a traditional device-runner workflow.

## Native Automation Patterns

Patrol's native automation lives under \`$.platform\` in current examples. The official native overview shows actions like enabling cellular, disabling Wi-Fi, enabling dark mode, selecting fine location, granting runtime permissions, opening notifications, and tapping notifications. These are not decorative APIs. They are the reason to choose Patrol over plain \`integration_test\`.

| Native task | Patrol fit | Risk to design around |
| --- | --- | --- |
| Permission dialog acceptance | Strong | Dialog language and OS version can affect selector behavior. |
| Notification tap | Strong | Notification timing and app foreground state must be controlled. |
| WebView or OAuth login | Stronger than \`integration_test\` | Real identity providers add flake and account-lock risk. |
| Dark mode and device setting checks | Strong | Reset settings after the test or isolate the device. |
| Offline behavior | Useful, platform-dependent | iOS simulator and device farms may limit network toggling. |
| Camera QR scan on device farm | Weak | Some farms do not allow replacing the camera scene. |

Here is a focused pattern for a permission-dependent location screen. The app is minimal, but the test shape is the important part: set the device condition, launch the widget, trigger the permission path, then assert a product-level outcome.

\`\`\`dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patrol/patrol.dart';
import 'package:permission_handler/permission_handler.dart';

void main() {
  patrolTest('grants location and shows nearby stores', ($) async {
    await $.pumpWidgetAndSettle(const LocationApp());

    await $(#findStoresButton).tap();
    await $.platform.mobile.selectFineLocation();
    await $.platform.mobile.grantPermissionWhenInUse();

    await $('Nearby stores').waitUntilVisible();
    expect($('Store A').visible, equals(true));
  });
}

class LocationApp extends StatefulWidget {
  const LocationApp({super.key});

  @override
  State<LocationApp> createState() => _LocationAppState();
}

class _LocationAppState extends State<LocationApp> {
  bool loaded = false;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: Column(
          children: <Widget>[
            TextButton(
              key: const ValueKey<String>('findStoresButton'),
              onPressed: () async {
                // Triggers the real OS permission dialog that the test answers.
                final status = await Permission.locationWhenInUse.request();
                setState(() => loaded = status.isGranted);
              },
              child: const Text('Find stores'),
            ),
            if (loaded) ...<Widget>[
              const Text('Nearby stores'),
              const Text('Store A'),
            ],
          ],
        ),
      ),
    );
  }
}
\`\`\`

The app requests the permission through the \`permission_handler\` plugin, so the platform dialog really appears and the Patrol calls have something to answer. Add \`ACCESS_FINE_LOCATION\` to \`AndroidManifest.xml\`, add \`NSLocationWhenInUseUsageDescription\` to \`Info.plist\`, and enable the plugin's location permission macro in the iOS \`Podfile\` before running it. If the store list only appears after a grant, the final assertion proves the grant path worked rather than just that a button was tapped.

On a real project, the button would call the platform permission API before state changes. The test still needs to assert the business result, not merely that a permission button was tapped. If the user grants location and the app never loads stores, the native interaction succeeded but the product failed.

## Finder Strategy: Concise, But Not Casual

Patrol finders are intentionally compact. \`$('Subscribe')\` finds text. \`$(#loginButton)\` maps to a key symbol. \`$(ListView).$(ListTile).$('Subscribe')\` scopes a repeated label through descendants. The docs also point out a difference that matters to QA: Flutter's normal matchers can check presence in the widget tree, while Patrol's \`visible\` getter focuses on user-visible widgets.

| Pattern | Use it for | Avoid when |
| --- | --- | --- |
| \`$(#primaryCta).tap()\` | Stable app-owned controls | The key does not exist in production widgets. |
| \`$('Welcome').waitUntilVisible()\` | Human-visible state | Text changes frequently through localization experiments. |
| \`$(find.bySemanticsLabel('Edit profile')).tap()\` | Accessibility-aligned selectors | Semantics are missing or misleading. |
| \`$(ListView).$(ListTile).$('Subscribe').tap()\` | Repeated text in a scoped region | List ordering is nondeterministic. |
| \`which()\` property filtering | Cases where hierarchy is insufficient | A simple key or semantics label would be clearer. |

What people get wrong: they read Patrol's compact syntax as permission to write vague tests. Concision is not a substitute for contracts. Prefer keys on critical actions, semantics labels on icon-only controls, and product-visible text for final state. A test that taps \`$('OK')\` three times is easy to write and hard to debug.

## CLI Flags QA Engineers Actually Use

The \`patrol test\` page says the command runs all files ending in \`_test.dart\` under \`patrol_test\` by default. You can run one file with \`--target\`, repeat \`--target\`, or pass comma-separated paths through \`--targets\`. The docs say there is no difference between \`--target\` and \`--targets\`.

\`\`\`bash
patrol test
patrol test --target patrol_test/login_test.dart
patrol test \\
  --target patrol_test/login_test.dart \\
  --target patrol_test/notifications_test.dart
patrol test --targets patrol_test/login_test.dart,patrol_test/notifications_test.dart
\`\`\`

Tags are useful when the same test tree contains platform-specific or expensive flows. Patrol supports \`--tags\` and \`--exclude-tags\`, including expressions such as \`(android && tablet)\` or \`android||ios\`.

\`\`\`dart
import 'package:flutter/material.dart';
import 'package:patrol/patrol.dart';

void main() {
  patrolTest(
    'opens Android notification settings',
    tags: <String>['android', 'settings'],
    ($) async {
      await $.pumpWidgetAndSettle(const MaterialApp(home: Text('Settings demo')));
      await $.platform.mobile.openNotifications();
    },
  );
}
\`\`\`

\`\`\`bash
patrol test --tags android
patrol test --tags='(android && settings)'
patrol test --exclude-tags slow
\`\`\`

Coverage exists but has constraints. Patrol docs say coverage collection is not supported on macOS, requires a debug build, and is incompatible with \`--profile\` and \`--release\`. The LCOV report is saved to \`/coverage/patrol_lcov.info\`, and \`--coverage-ignore\` accepts glob patterns.

\`\`\`bash
patrol test --coverage
patrol test --coverage --coverage-ignore="**/*.g.dart"
\`\`\`

Build metadata is also first-class. Use \`--build-name\` and \`--build-number\` when the test artifact must correspond to a release candidate.

\`\`\`bash
patrol test --target patrol_test/login_test.dart --build-name=1.2.3 --build-number=123
\`\`\`

## Isolation, Screenshots, And Videos

Patrol's docs separate run isolation by platform. On Android, set \`clearPackageData\` to \`true\` in Gradle. On iOS Simulator, use the experimental \`--full-isolation\` flag. That flag may change, so pin the behavior in your team docs and verify it during upgrades.

Screenshots have two different meanings. Patrol \`4.10.0\` plus \`patrol_cli\` \`4.8.0\` supports Android native screenshots automatically on failure when \`screenshot_on_failure: true\` is set, and on demand with \`await $.takeNativeScreenshot('tag')\`. Local \`patrol test\` pulls screenshots to \`<test-directory>/screenshots\`, unless you override \`--screenshots-output-dir\`. On device farms, you must configure the farm to collect the device path.

\`\`\`dart
import 'package:flutter/material.dart';
import 'package:patrol/patrol.dart';

void main() {
  patrolTest('captures checkout confirmation evidence', ($) async {
    await $.pumpWidgetAndSettle(const MaterialApp(home: Text('Order confirmed')));
    await $('Order confirmed').waitUntilVisible();
    await $.takeNativeScreenshot('order-confirmed');
  });
}
\`\`\`

Video recording is available with \`--record-video\` for Android emulators and iOS simulators. Patrol docs say videos are saved as \`.mp4\` files under \`<test-directory>/videos\`, with \`--video-output-dir\` available. Physical iOS devices are not supported for this feature, and unsupported devices skip recording while the test still runs. On web, Patrol delegates video recording to Playwright through \`--web-video\`.

\`\`\`bash
patrol test --record-video
patrol test --record-video --video-output-dir build/patrol-videos
patrol test --device chrome --web-video=retain-on-failure
\`\`\`

The failure mode to watch: screenshot names and test names that contain spaces, commas, slashes, or colons can become awkward on device farms. Patrol docs recommend build-time test discovery with \`emit_test_manifest\` for reliable farm screenshots because generated per-test names are URL-safe and filesystem-safe.

## Web Testing Through Playwright

Patrol 4.0 added web support, and the CLI docs say \`patrol test --device chrome\` runs Flutter web tests in Chromium through Playwright. The test results are generated in \`test-results/\`. Some mobile flags do not apply on web: \`--flavor\`, \`--uninstall\`, \`--clear-permissions\`, and \`--full-isolation\`.

\`\`\`bash
patrol test --device chrome
patrol test --device chrome --web-headless --web-reporter=html
\`\`\`

Patrol's changelog shows that \`4.8.0\` wired additional Playwright launch and context options into the web runner through matching \`patrol_cli\` \`--web-*\` flags, including options for browser channel, executable path, slow motion, traces, screenshots, storage state, proxy, locale, geolocation, and viewport. Verify exact flag names with \`patrol test --help\` in your installed CLI before committing a new CI switch.

Do not assume a passing web run proves mobile behavior. Web support is valuable for browser-specific Flutter regressions, file upload flows, dialogs, storage state, and fast feedback. It does not validate Android permission behavior, iOS notification behavior, or native platform views on a handset.

## Device Farms And CI Architecture

Patrol's CI docs are candid about local emulator pain. They recommend device farms such as Firebase Test Lab, emulator.wtf, or others for many cases, while noting that Codemagic can prepare APKs for upload. The docs describe Firebase Test Lab as a good choice for most projects and explain that you upload the main app and the test app, select devices, and get results plus video after the run.

| Environment | Good for | Caution |
| --- | --- | --- |
| Developer machine | Writing and debugging one target | State leakage between repeated runs. |
| GitHub Actions Android emulator | Occasional smoke checks | Slow startup and random emulator instability. |
| macOS runner iOS Simulator | iOS simulator smoke | macOS minutes are expensive, and simulator is not a physical device. |
| Firebase Test Lab | Android and iOS device matrix | Requires packaging native test artifacts correctly. |
| BrowserStack or Sauce Labs | Cross-device reporting and fleet management | Capabilities and naming need careful setup. |
| In-house farm | Specialized hardware or camera workflows | High maintenance burden. |

For Android Firebase Test Lab, Patrol docs show building two APKs with \`patrol build android --target patrol_test/example_test.dart\`, then running \`gcloud firebase test android run\` as an instrumentation test. To collect native failure screenshots, add \`--directories-to-pull=/sdcard/Download/screenshots\`.

\`\`\`bash
patrol build android --target patrol_test/checkout_test.dart
gcloud firebase test android run \\
  --type instrumentation \\
  --use-orchestrator \\
  --app build/app/outputs/apk/debug/app-debug.apk \\
  --test build/app/outputs/apk/androidTest/debug/app-debug-androidTest.apk \\
  --environment-variables clearPackageData=true \\
  --directories-to-pull=/sdcard/Download/screenshots
\`\`\`

For iOS Firebase Test Lab, Patrol docs show building for simulator or physical devices, then packaging the app under test, test instrumentation app, and \`.xctestrun\` file into a zip. If the \`.xctestrun\` file has a different iOS version in its name than the Test Lab device, the docs say to rename it so the version matches.

## GitHub Actions Starter Workflow

A practical GitHub Actions workflow should not try to cover every device on every pull request. Build or run a small target, archive logs and artifacts, and let the device farm own the matrix. The exact Flutter setup action should be verified in your repo, but the core GitHub action majors below are the current ones.

\`\`\`yaml
name: patrol-smoke

on:
  pull_request:
  workflow_dispatch:

jobs:
  android-artifact:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v7
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
      - run: flutter pub get
      - run: flutter pub global activate patrol_cli
      - run: patrol doctor
      - run: patrol build android --target patrol_test/login_test.dart
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: patrol-android-\${{ github.run_id }}
          path: |
            build/app/outputs/apk/debug/*.apk
            build/app/outputs/apk/androidTest/debug/*.apk
\`\`\`

This workflow builds artifacts rather than running a flaky emulator. A second job can upload those APKs to Firebase Test Lab, BrowserStack, Sauce Labs, or another farm. If you do run \`patrol test\` directly in CI, add timeouts, capture \`patrol_test/screenshots\`, \`patrol_test/videos\`, and native logs, and avoid parallel jobs that fight over one emulator.

## Build-Time Test Discovery And Fast Reruns

Patrol's build-time test discovery is experimental but important for CI and farms. With \`patrol.emit_test_manifest: true\`, already-built tests can be rerun without rebuilding through \`patrol test-without-building\`. The docs emphasize that this is a separate command because nothing is bundled, compiled, or reinstalled. Options that shape a build, such as \`--target\`, \`--tags\`, and \`--dart-define\`, do not apply to \`test-without-building\`.

\`\`\`yaml
patrol:
  app_name: QA Skills Demo
  emit_test_manifest: true
  android:
    package_name: sh.qaskills.demo
  ios:
    bundle_id: sh.qaskills.demo
\`\`\`

\`\`\`bash
patrol build ios --emit-test-manifest
patrol test-without-building
patrol test-without-building --only "checkout_test pays with stored card"
\`\`\`

This is useful when you are debugging the same failing native test repeatedly and the app code has not changed. After changing Dart or native code, rebuild. The hidden failure mode is stale artifacts: the runner faithfully executes what was last built, not what you wish it built.

## Failure Mode: The Permission Test Passes Alone But Fails In The Suite

Symptom: \`patrol test --target patrol_test/location_test.dart\` passes on a clean emulator. The full suite fails because the permission dialog no longer appears, or the app starts in an already-granted state. Diagnosis: the test depends on mutable OS permission state. Flutter state reset is not enough because the permission lives outside your widget tree.

Fix it by owning isolation. On Android, configure \`clearPackageData\` for test runs that need app data reset, and design permission tests to handle either state when the product behavior allows it. On iOS Simulator, evaluate \`--full-isolation\`, but remember the docs mark it experimental. For device farms, rely on fresh devices where possible and keep the permission test in a small group so its preconditions are obvious.

A second version of this failure happens with notification tests. The app schedules a local notification, the test immediately opens notifications, and the notification is not there yet. The bad fix is a fixed ten-second sleep. The better fix is to instrument the app so the test can wait for a product-visible state before opening the tray, or schedule the notification through a deterministic test hook.

## What To Ask An AI Coding Agent To Do

Give the agent a Patrol-specific request, not a generic E2E request. Name the test file under \`patrol_test/\`, the flow, the target platform, the native action, and the proof command. For example: "Add \`patrol_test/notification_permission_test.dart\`. It should launch the app, trigger notification permission, grant it with Patrol native automation, create a local notification, open the notification tray, tap the notification, and assert the app navigates to the notification detail screen. Verify with \`patrol test --target patrol_test/notification_permission_test.dart\`."

Also ask it to add missing keys or semantics labels in the app if the current UI lacks stable selectors. That is not test pollution when the selector maps to a real product contract. It is the same discipline as accessible labels. What you should not accept is an agent-generated test that relies on control order, arbitrary waits, or a final assertion that only checks "no exception."

For qaskills.sh users, ready-made QA skills can be installed with the qaskills CLI, but Patrol setup still requires your app IDs, signing expectations, device strategy, and CI runner constraints. Those are project facts, not generic library facts.

## Patrol Versus integration_test, Appium, Espresso, And XCUITest

Patrol sits in a useful middle. It keeps test authoring in Dart and Flutter concepts, but reaches native capabilities that plain \`integration_test\` cannot. Compared with Appium, Patrol is less black-box and more Flutter-native. Compared with Espresso or XCUITest directly, Patrol lets one Dart test express cross-platform intent while still running through native test infrastructure.

| Tool | Best fit | Tradeoff |
| --- | --- | --- |
| \`integration_test\` | Flutter-only app flows, screenshots, performance traces | Cannot drive native OS UI. |
| Patrol | Flutter app plus native permissions, notifications, WebViews, settings | Requires Patrol CLI and native project setup. |
| Appium 2 | Cross-language black-box mobile automation and external apps | Slower feedback and more selector complexity. |
| Espresso | Android-native app internals and tight Android runner integration | Android only. |
| XCUITest | iOS-native UI fidelity and Apple tooling | iOS only, Swift or Objective-C test layer. |

The decision is not ideological. If your QA team writes Dart and the app is Flutter, Patrol is often the highest-leverage native E2E layer. If your organization centralizes mobile automation across React Native, native iOS, native Android, and Flutter, Appium may be easier to standardize. If a payment provider or OS feature breaks only on iOS, a focused XCUITest may be the fastest way to get a precise answer.

## Frequently Asked Questions

### Is Patrol Flutter testing actively maintained?

Yes. I verified the official docs, pub.dev pages, changelog, and GitHub repository. The \`patrol\` package is active at \`4.10.0\` on pub.dev, and \`patrol_cli\` is active at \`4.8.0\`. The recent changelog includes build-time test discovery, web support through Playwright, Swift Package Manager work, and Android native failure screenshots. Treat older setup posts carefully because the default test directory changed to \`patrol_test\`.

### Can I run Patrol tests with flutter test?

No for Patrol UI tests. The official install docs say Patrol CLI is necessary and \`flutter test\` will not work for those UI tests. Use \`patrol test\` for normal runs and \`patrol develop --target ...\` for the hot restart development loop. Keep \`flutter test\` for unit tests, widget tests, and non-Patrol Flutter tests.

### When should I choose Patrol instead of Appium?

Choose Patrol when the app is Flutter, the team is comfortable in Dart, and the flow needs native automation around a Flutter app: permissions, notifications, WebViews, settings, or platform views. Choose Appium when you need a black-box framework across multiple app stacks, multiple programming languages, or external apps. Patrol is usually a sharper fit for Flutter-owned E2E coverage. Appium is broader organizational infrastructure.

### Does Patrol work on web?

Yes. Patrol supports Flutter web testing through Playwright, and \`patrol test --device chrome\` runs tests in Chromium with results in \`test-results/\`. Web support has its own flags and limitations. Mobile-only options such as \`--flavor\`, \`--uninstall\`, \`--clear-permissions\`, and \`--full-isolation\` do not apply on web. Use web runs for browser-specific Flutter behavior, not as proof of native mobile behavior.
`,
};
