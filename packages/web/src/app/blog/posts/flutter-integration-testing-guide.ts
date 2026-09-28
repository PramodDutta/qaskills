import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Flutter Integration Test with integration_test: Complete Guide',
  description: 'Flutter integration test guide for QA teams: setup, device runs, screenshots, performance traces, CI, Test Lab, and reliable agent workflows.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# Flutter Integration Test with integration_test: Complete Guide

A Flutter integration test using \`integration_test\` is the official SDK-supported way to exercise a complete Flutter app on a target device, desktop platform, or web browser while still writing test logic with familiar \`flutter_test\` APIs. The package is active, part of the Flutter SDK, and the Flutter docs I verified reflect Flutter 3.47. The current official guidance still uses \`IntegrationTestWidgetsFlutterBinding.ensureInitialized()\`, \`flutter test integration_test\` for device and desktop runs, and \`flutter drive\` when you need the driver side, especially for web, screenshots, and host-side result handling.

The sharp boundary is native UI. Flutter's own integration testing concepts page says \`integration_test\` cannot interact with native platform UI. That means it is excellent for Flutter-rendered flows, app state, API integration, routing, deep links once the app is launched, screenshots, and performance timelines. It is the wrong tool for permission dialogs, notification shade interactions, OAuth WebViews, system settings, and cross-app flows. If your test plan lives in that second bucket, compare native options with [Appium mobile testing complete guide](/blog/appium-mobile-testing-complete-guide) and [Espresso vs XCUITest vs Appium 2026](/blog/espresso-vs-xcuitest-vs-appium-2026) before you standardize.

For QA teams using Claude Code, Cursor, Copilot, or another AI coding agent, treat \`integration_test\` as a high-signal harness rather than a record-and-replay tool. Give the agent a narrow flow, stable finders, fixture data, and a command that proves the test on a real target. Do not ask it to "add E2E tests" without naming the target device, state reset, network contract, and assertion you expect after each action.

## Verified Status And Tool Boundary

Official sources verified for this guide include https://docs.flutter.dev/testing/integration-tests, https://docs.flutter.dev/cookbook/testing/integration/introduction, https://docs.flutter.dev/cookbook/testing/integration/profiling, and the Flutter API docs for \`IntegrationTestWidgetsFlutterBinding\`. The important product-status facts are simple: \`integration_test\` is not renamed, not discontinued, and not a separate third-party package you fetch from pub.dev. It ships as part of the Flutter SDK and is enabled from your app's \`pubspec.yaml\` using \`sdk: flutter\`.

The practical boundary is also simple. \`integration_test\` runs your app and lets you interact with Flutter widgets. It does not become Espresso, XCUITest, or Appium. When a system permission prompt appears, the Flutter widget tree cannot see the native button. When a bank login opens a native WebView or an external browser, your \`find.text()\` checks are no longer looking at the same surface. The failure often looks like a timeout, but the diagnosis is "wrong automation layer."

| Test need | Use \`integration_test\`? | Reason |
| --- | --- | --- |
| Verify a Flutter checkout flow with mocked payment status | Yes | The visible app state and assertions stay in Flutter. |
| Validate counter, navigation, forms, local persistence, or API-backed screens | Yes | These are complete app behaviors without native chrome. |
| Capture Flutter-rendered screenshots on Android, iOS, or web | Yes, with driver plumbing | \`takeScreenshot()\` is supported through the binding and driver callback. |
| Measure scroll or animation timeline on mobile or desktop | Yes | \`traceAction()\` and \`watchPerformance()\` report host-readable data. |
| Accept iOS notification permission prompt | No | Native dialogs are outside the Flutter widget tree. |
| Pull down Android notifications and tap one | No | You need native automation. |
| Drive an OAuth provider inside platform WebView | Usually no | The auth UI is not normal Flutter widget content. |

The mistake people get wrong is assuming "integration" means "everything a user could possibly touch." In Flutter docs, integration testing means the complete app under test, but the test API is still Flutter-centric. The more native the flow becomes, the more you should move it to Patrol, Appium, Espresso, or XCUITest rather than piling sleeps onto a Flutter finder.

## Project Layout That Agents Can Maintain

Use a small, boring layout. Keep \`test/\` for unit and widget tests. Put device-level app flows under \`integration_test/\`. Keep test data and fake services in normal Dart files that can also be imported from widget tests. Avoid hiding setup in opaque shell scripts until the command has passed locally.

\`\`\`yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter
\`\`\`

That dependency block matters when an AI agent is changing code. It can see that \`integration_test\` comes from the SDK and should not invent a version constraint. It also tells the agent that \`flutter_test\` matchers, \`Finder\`, \`WidgetTester\`, and normal \`expect()\` assertions are available.

| File or directory | Ownership | What belongs there |
| --- | --- | --- |
| \`integration_test/app_smoke_test.dart\` | QA and app engineers | One or two high-value smoke flows that must pass before release. |
| \`integration_test/performance_scroll_test.dart\` | QA, performance owner | Timeline or frame timing checks that produce artifacts. |
| \`test/support/fake_catalog.dart\` | App engineers | Deterministic data builders shared by widget and integration tests. |
| \`test_driver/integration_test.dart\` | Test infrastructure | Driver callbacks for screenshots or performance response data. |
| \`.github/workflows/flutter-integration.yml\` | CI owner | Device boot, Flutter install, test command, artifacts, and timeout policy. |

Keep the first test brutally small. It should launch the app, prove a known start state, perform one user action, and assert a durable outcome. A long flow that covers onboarding, login, search, settings, and logout is not a smoke test. It is five failure modes sharing one timeout.

## A Minimal Test With A Real Assertion

The sample below is a complete integration test file. It defines a tiny app inside the test so the mechanics are obvious. In a production app you would import your app entry widget instead, but the testing pattern is the same: initialize the binding once, pump the app, check the precondition, act, settle async work, and assert the visible side effect.

\`\`\`dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('increments the saved counter from the home screen', (tester) async {
    await tester.pumpWidget(const CounterApp());
    await tester.pumpAndSettle();

    expect(find.text('Count: 0'), findsOneWidget);

    final Finder incrementButton = find.byKey(const ValueKey<String>('increment'));
    expect(incrementButton, findsOneWidget);

    await tester.tap(incrementButton);
    await tester.pumpAndSettle();

    expect(find.text('Count: 1'), findsOneWidget);
    expect(find.text('Count: 0'), findsNothing);
  });
}

class CounterApp extends StatefulWidget {
  const CounterApp({super.key});

  @override
  State<CounterApp> createState() => _CounterAppState();
}

class _CounterAppState extends State<CounterApp> {
  int count = 0;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: const Text('Demo counter')),
        body: Center(child: Text('Count: \${count}')),
        floatingActionButton: FloatingActionButton(
          key: const ValueKey<String>('increment'),
          onPressed: () => setState(() => count += 1),
          child: const Icon(Icons.add),
        ),
      ),
    );
  }
}
\`\`\`

Notice the assertion style. The test checks that the button exists before tapping. It verifies the old value disappears after the new value appears. That catches stale UI, duplicate labels, and no-op taps. A weak version would tap blindly, call \`pumpAndSettle()\`, and assert only that some status is not an exception. That kind of test gives an AI coding agent too much room to "fix" the symptom by extending a timeout.

## Choosing The Right Command

The official docs show both \`flutter test\` and \`flutter drive\`. For mobile and desktop flows that only need the test process, \`flutter test integration_test/app_test.dart\` or \`flutter test integration_test\` is the clean path. For web and for host-side callbacks such as screenshot writing or response data processing, use \`flutter drive\` with a driver file.

| Command | Best use | Notes |
| --- | --- | --- |
| \`flutter test integration_test/app_test.dart\` | One mobile or desktop test file on a connected target | Flutter may ask you to choose a device if several are attached. |
| \`flutter test integration_test -d linux -r github\` | Linux desktop tests in CI | On Linux CI, wrap the command with an X server such as \`xvfb-run\`. |
| \`flutter drive --driver=test_driver/integration_test.dart --target=integration_test/app_test.dart -d chrome\` | Browser run with ChromeDriver | Requires ChromeDriver running separately. |
| \`flutter drive --driver=test_driver/integration_test.dart --target=integration_test/app_test.dart -d web-server\` | Headless web run | Official docs show this for headless web driver execution. |
| Firebase Test Lab instrumentation | Android or iOS device matrix | Build debug app and test artifacts, then upload to the lab. |

\`\`\`bash
flutter devices
flutter test integration_test/app_smoke_test.dart -d emulator-5554
flutter test integration_test -d macos
\`\`\`

For web, the official guide still shows ChromeDriver. Keep the driver script explicit and make the browser dependency visible in CI.

\`\`\`dart
import 'package:integration_test/integration_test_driver.dart';

Future<void> main() {
  return integrationDriver();
}
\`\`\`

\`\`\`bash
CHROMEDRIVER="$(npx @puppeteer/browsers install chromedriver@stable --format '{{path}}')"
"$CHROMEDRIVER" --port=4444 &
flutter drive \\
  --driver=test_driver/integration_test.dart \\
  --target=integration_test/app_smoke_test.dart \\
  -d chrome
\`\`\`

Use \`flutter drive\` intentionally. Do not convert every mobile integration test to a driver run just because a blog from the \`flutter_driver\` era did so. The modern docs explicitly describe \`flutter test integration_test\` as a host-machine command for these tests.

## Finders That Survive Product Change

Good finders reflect product contracts. Bad finders reflect incidental layout. A \`ValueKey\` on a login button is useful because the button is part of the release flow. \`find.byType(ElevatedButton).at(2)\` is fragile because a designer adding a secondary action changes the index without changing the user's intent.

| Finder pattern | Stability | Use it when |
| --- | --- | --- |
| \`find.byKey(const ValueKey('submit-order'))\` | High | QA and developers agree the element is a testable contract. |
| \`find.text('Place order')\` | Medium | The visible label is the behavior and localization is fixed for the test. |
| \`find.bySemanticsLabel('Close dialog')\` | High | Accessibility labels are maintained and meaningful. |
| \`find.byType(ListTile).first\` | Low | Only for throwaway local diagnostics. |
| \`find.descendant(...)\` | Medium | You need to scope a repeated label to a known parent. |

A durable flow uses preconditions. Before comparing text positions, assert both widgets exist. Before tapping a row, assert the row is visible. Before claiming a toast disappeared, first assert it appeared. This reduces false positives and helps AI agents avoid "fixes" that only reorder assertions.

\`\`\`dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('filters paid invoices before exporting', (tester) async {
    await tester.pumpWidget(const InvoiceApp());
    await tester.pumpAndSettle();

    final Finder paidFilter = find.byKey(const ValueKey<String>('filter-paid'));
    final Finder exportButton = find.byKey(const ValueKey<String>('export-visible'));

    expect(find.text('INV-1001'), findsOneWidget);
    expect(find.text('INV-1002'), findsOneWidget);
    expect(paidFilter, findsOneWidget);

    await tester.tap(paidFilter);
    await tester.pumpAndSettle();

    expect(find.text('INV-1001'), findsOneWidget);
    expect(find.text('INV-1002'), findsNothing);
    expect(exportButton, findsOneWidget);

    await tester.tap(exportButton);
    await tester.pumpAndSettle();

    expect(find.text('Export queued for 1 invoice'), findsOneWidget);
  });
}

class InvoiceApp extends StatefulWidget {
  const InvoiceApp({super.key});

  @override
  State<InvoiceApp> createState() => _InvoiceAppState();
}

class _InvoiceAppState extends State<InvoiceApp> {
  bool paidOnly = false;
  String message = '';

  @override
  Widget build(BuildContext context) {
    final List<String> invoices = paidOnly ? <String>['INV-1001'] : <String>['INV-1001', 'INV-1002'];
    return MaterialApp(
      home: Scaffold(
        body: Column(
          children: <Widget>[
            TextButton(
              key: const ValueKey<String>('filter-paid'),
              onPressed: () => setState(() => paidOnly = true),
              child: const Text('Paid'),
            ),
            for (final String invoice in invoices) Text(invoice),
            TextButton(
              key: const ValueKey<String>('export-visible'),
              onPressed: () => setState(() => message = 'Export queued for \${invoices.length} invoice'),
              child: const Text('Export'),
            ),
            Text(message),
          ],
        ),
      ),
    );
  }
}
\`\`\`

## Async Work Without Sleeps

The most common integration test failure mode is a race hidden behind a fixed delay. A test taps a button, calls \`pump(const Duration(seconds: 3))\`, and expects a result. It passes locally, fails on CI, gets another two seconds, then fails on a slower emulator. That is not a slow test. It is an unobserved state transition.

Prefer waiting for visible app state or a controlled future. \`pumpAndSettle()\` is useful when animations and scheduled frames really settle. It is a poor fit for infinite animations, loading spinners that never stop, or background streams. In those cases, wait for a specific finder with bounded polling.

\`\`\`dart
import 'package:flutter_test/flutter_test.dart';

Future<void> waitForVisible(
  WidgetTester tester,
  Finder finder, {
  Duration timeout = const Duration(seconds: 10),
}) async {
  final DateTime deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 100));
    if (finder.evaluate().isNotEmpty) {
      expect(finder, findsOneWidget);
      return;
    }
  }
  fail('Timed out waiting for \${finder.description}');
}
\`\`\`

This helper is intentionally small. It does not swallow exceptions. It does not wait forever. It verifies the final condition before returning. If a coding agent introduces a new spinner or background animation, this helper keeps the failure message tied to the missing UI state rather than a generic timeout.

## Screenshots For Evidence, Not Assertions

\`IntegrationTestWidgetsFlutterBinding.takeScreenshot()\` takes a screenshot and returns PNG bytes through the integration driver callback. Flutter's API docs note that Android needs \`convertFlutterSurfaceToImage()\` and a pumped frame before taking a screenshot, and \`convertFlutterSurfaceToImage()\` is expensive enough that you should avoid it during performance tests. The integration_test README also documents screenshot support for Android, iOS, and web.

\`\`\`dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  final IntegrationTestWidgetsFlutterBinding binding =
      IntegrationTestWidgetsFlutterBinding.ensureInitialized() as IntegrationTestWidgetsFlutterBinding;

  testWidgets('captures the signed-in dashboard', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: Text('Dashboard ready'))));
    await tester.pumpAndSettle();

    expect(find.text('Dashboard ready'), findsOneWidget);

    await binding.convertFlutterSurfaceToImage();
    await tester.pump();
    // convertFlutterSurfaceToImage() registers a teardown that restores the Flutter surface.
    await binding.takeScreenshot('dashboard-ready');
  });
}
\`\`\`

\`\`\`dart
import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() async {
  await integrationDriver(
    onScreenshot: (String name, List<int> bytes, [Map<String, Object?>? args]) async {
      final Directory output = Directory('build/integration_screenshots');
      if (!output.existsSync()) {
        output.createSync(recursive: true);
      }
      final File image = File('\${output.path}/\${name}.png');
      image.writeAsBytesSync(bytes);
      return image.lengthSync() > 0;
    },
  );
}
\`\`\`

Do not turn these screenshots into a visual regression system by accident. A screenshot artifact helps a human diagnose a failed flow. A visual assertion needs baseline management, pixel tolerances, device normalization, and review policy. If the goal is visual diffing, make that a separate tool decision.

## Performance Traces That Produce Useful Artifacts

Flutter's profiling recipe uses \`IntegrationTestWidgetsFlutterBinding.traceAction()\` to record a \`Timeline\` while an action runs. The API docs say \`traceAction()\` adds timeline JSON to \`reportData\` under a \`reportKey\`, with \`timeline\` as the default. If you call it multiple times, use unique report keys or provide a custom driver callback to write separate files.

\`\`\`dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  final IntegrationTestWidgetsFlutterBinding binding =
      IntegrationTestWidgetsFlutterBinding.ensureInitialized() as IntegrationTestWidgetsFlutterBinding;

  testWidgets('records catalog scroll timeline', (tester) async {
    await tester.pumpWidget(const CatalogApp());
    await tester.pumpAndSettle();

    final Finder list = find.byKey(const ValueKey<String>('catalog-list'));
    final Finder lastItem = find.text('Item 80');
    expect(list, findsOneWidget);

    await binding.traceAction(
      () async {
        await tester.scrollUntilVisible(lastItem, 500, scrollable: list);
        expect(lastItem, findsOneWidget);
      },
      reportKey: 'catalog_scroll_timeline',
    );
  });
}

class CatalogApp extends StatelessWidget {
  const CatalogApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: ListView.builder(
        key: const ValueKey<String>('catalog-list'),
        itemCount: 100,
        itemBuilder: (context, index) => ListTile(title: Text('Item \${index + 1}')),
      ),
    );
  }
}
\`\`\`

Use performance traces for targeted questions: "Did the catalog scroll jank after image caching changed?" is a useful question. "Is the app fast?" is too broad for one trace. Also remember that Flutter's docs say recording performance timelines is not supported on web through this recipe.

## CI Shape For GitHub Actions

CI should prove three things: dependencies resolve, the app can build for the chosen target, and the integration test can run without a human picking a device. For Linux desktop tests, the official Flutter docs show using an X server. For Android emulator tests, keep a generous timeout and accept that device farms are often more stable than general-purpose CI runners.

\`\`\`yaml
name: flutter-integration

on:
  pull_request:
  workflow_dispatch:

jobs:
  linux-desktop:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
      - run: flutter pub get
      - run: flutter test
      - run: xvfb-run -a flutter test integration_test -d linux -r github
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: flutter-integration-\${{ github.run_id }}
          path: build/integration_screenshots
          if-no-files-found: ignore
\`\`\`

I verified the requested GitHub core action majors for this project standard, so \`actions/checkout@v7\` and \`actions/upload-artifact@v7\` are used above. I did not pin \`subosito/flutter-action\` to a claimed latest major because that is a third-party action and should be verified in the repo when you adopt it.

For Android in GitHub Actions, you can run an emulator, but keep it separate from fast pull-request checks unless the team can tolerate the runtime. A more scalable pattern is: run widget tests on every PR, run one integration smoke on selected PRs, and run a Firebase Test Lab matrix before release.

## Firebase Test Lab Without Magical Thinking

Flutter's official integration test guide documents Android and iOS paths for Firebase Test Lab. For Android, you build a debug app APK and an Android test APK, then run an instrumentation test in Test Lab. The docs specifically warn that a standard release build will not include \`package:integration_test\`.

\`\`\`bash
pushd android
flutter build apk --debug
./gradlew app:assembleAndroidTest
./gradlew app:assembleDebug -Ptarget=integration_test/app_smoke_test.dart
popd
\`\`\`

The reliable Test Lab pattern is not "upload every test and hope." Start with one smoke flow, select a small device set that matches your supported OS floor and a current flagship profile, then expand. Base64-encode Dart defines if you pass them through Gradle as official docs describe. Keep secrets out of the command and prefer a test environment with throwaway data.

| CI tier | Command target | Failure owner |
| --- | --- | --- |
| PR quick check | Unit and widget tests, optional desktop integration | Feature engineer |
| PR gated smoke | One \`integration_test\` file on one emulator or desktop target | Feature engineer plus QA |
| Nightly device run | Android and iOS device matrix | QA automation owner |
| Release candidate | Device lab plus manual exploratory charter | Release owner |

This tiering keeps integration tests valuable. When every PR waits on a fragile device matrix, engineers start bypassing it. When device coverage never runs until release day, QA inherits all risk at once.

## Failure Mode: The Test Passes Locally And Hangs In CI

Symptom: \`flutter test integration_test/app_smoke_test.dart\` passes on a developer laptop, but CI logs stop after "Building Linux application" or after the first frame. Diagnosis starts with the target. On Linux desktop, Flutter needs an X server. The official docs show an error where the debug connection log reader stops unexpectedly if the integration is not configured with an X Window system. Use \`xvfb-run\` for Linux desktop runs.

Second diagnosis: the test may be waiting for a native dialog. If CI runs a fresh simulator, the first launch can trigger notification, location, photo, tracking, or Bluetooth permissions. \`integration_test\` cannot accept those dialogs. Disable the permission path for that test build, pre-grant permissions with the platform tooling outside Flutter, or move that case to a native automation framework.

Third diagnosis: the app is not isolated. Flutter's docs tell you to verify the app was removed after real Android and iOS device tests because subsequent tests can fail if it was not. For CI, prefer a fresh emulator, explicit data clearing, or app logic that resets test state through a supported test-only route.

## What To Ask An AI Coding Agent To Do

An agent works well when the task includes the exact flow, the selectors, and the command to prove the result. It works poorly when it has to infer product intent from a failing timeout. A good prompt for this repository would say: "Add \`integration_test/app_smoke_test.dart\` that launches the app, signs in with seeded test user, opens Settings, toggles email receipts, verifies persisted enabled state after navigating away and back, and passes \`flutter test integration_test/app_smoke_test.dart -d emulator-5554\`."

Also ask the agent to preserve testability. It may need to add keys or semantics labels to app widgets. That is usually better than brittle index-based finders. Require side-effect assertions, not only visible success banners. For example, if a preference is saved, assert that the switch remains enabled after a route change or app restart path, not just that a snackbar appeared.

Ready-made QA skills can install from qaskills.sh with the qaskills CLI, but the skill still needs project-specific contracts. No directory can guess which user, API fixture, or device profile represents your release risk.

## Frequently Asked Questions

### Is integration_test still the official Flutter integration test package?

Yes. The Flutter docs describe \`integration_test\` as the official integration test package and part of the Flutter SDK. It is active in the current docs I verified. Add it with \`sdk: flutter\` under \`dev_dependencies\`, initialize \`IntegrationTestWidgetsFlutterBinding.ensureInitialized()\`, and write tests with \`flutter_test\` style APIs. The main caveat is scope: it exercises Flutter app behavior but does not drive native OS UI.

### Should I run Flutter integration tests with flutter test or flutter drive?

Use \`flutter test integration_test\` for most mobile and desktop integration tests. Use \`flutter drive\` when you need a driver process, such as web runs with ChromeDriver, screenshot callbacks, or custom response data processing. Older \`flutter_driver\` examples can mislead teams into using \`flutter drive\` everywhere. The current official docs show both paths, so pick the command based on artifact and platform needs.

### Can integration_test handle permission dialogs?

No, not by itself. Flutter's integration testing concepts page explicitly says \`integration_test\` cannot interact with native platform UI. Permission dialogs, notifications, OS settings, and many WebView login surfaces sit outside the Flutter widget tree. For those flows, use native automation such as Patrol, Espresso, XCUITest, or Appium, or structure the integration test build so the native prompt is not part of the scenario.

### How many Flutter integration tests should run on every pull request?

Keep pull-request coverage small: one or two smoke flows on a predictable target, plus unit and widget tests for breadth. Run larger device matrices nightly or before release. Integration tests are expensive because they build, install, launch, and wait for real app behavior. A small reliable gate catches broken launches and critical routes. A huge flaky gate teaches engineers to ignore it.
`,
};
