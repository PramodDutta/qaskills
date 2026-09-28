import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Flutter Golden Tests: Visual Regression with matchesGoldenFile',
  description: 'Flutter golden tests guide for matchesGoldenFile, stable fonts, custom comparators, CI baselines, and practical visual regression workflows.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# Flutter Golden Tests: Visual Regression with matchesGoldenFile

Flutter golden tests compare a rendered widget or image against a committed reference image. The core matcher is \`matchesGoldenFile\` from \`flutter_test\`. It can receive a \`Finder\`, image, future image, bytes, or future bytes, and for widget finders it captures the first \`RepaintBoundary\` ancestor. The official API still documents \`flutter test --update-goldens\` as the way to create or refresh the reference images.

As of the current Flutter docs, the default \`flutter test\` comparator is \`LocalFileComparator\`. It resolves golden file keys relative to the test file, decodes PNG bytes, and performs pixel-for-pixel comparison. The docs for \`goldenFileComparator\` also show that you can replace the comparator in test setup, including with a tolerance comparator. Flutter 3.47 is the current stable documentation line on docs.flutter.dev, and the golden APIs discussed here remain active.

Use Flutter golden tests when you want fast visual regression coverage for widgets, component states, design-system variants, and carefully controlled screen slices. Do not use them as a full replacement for device-level mobile visual testing or browser visual testing. They are strongest when they run in a deterministic widget-test harness with fixed surface size, loaded fonts, mocked data, and a known Flutter SDK version.

## The Exact Thing \`matchesGoldenFile\` Compares

\`matchesGoldenFile\` does not compare your intent. It compares pixels. When passed a finder, Flutter evaluates the finder, requires exactly one widget, captures the rendered image at the nearest useful repaint boundary, encodes that image, and passes the bytes to \`goldenFileComparator\`. With \`flutter test\`, that comparator normally reads a PNG from disk and returns success only for an exact match.

That simplicity is the strength of Flutter golden tests. It is also the trap. If the text style, font loader, device pixel ratio, test surface size, theme, locale, animation frame, or Flutter engine version changes, the pixels can change even when the product behavior did not.

| Moving part | Why it affects pixels | How to control it |
|---|---|---|
| Surface size | Layout constraints change wrapping and overflow | Set \`tester.view.physicalSize\` or use package helpers |
| Text scale | Larger text changes line breaks and clipping | Test explicit text scales as separate cases |
| Fonts | Ahem or host fonts alter glyph metrics | Load test fonts or use a package strategy |
| Locale | Strings and directionality change layout | Wrap with \`MaterialApp\` and fixed locale |
| Theme | Material defaults can change across SDKs | Provide explicit \`ThemeData\` |
| Animations | Capturing a different frame changes pixels | Pump to a known frame or settle intentionally |
| Flutter SDK | Rasterization and default widgets evolve | Pin CI SDK and review SDK upgrades separately |

This is the main difference from browser visual regression testing. Browser tools often render pages in managed browser versions and compare screenshots across viewport widths. Flutter goldens run inside the Flutter test environment and are tightly coupled to the local SDK and host rendering details. For web-first visual workflows, see [Playwright visual regression testing guide](/blog/playwright-visual-regression-testing-guide).

## Start With A Small, Stable Widget Golden

A useful first golden test should prove one component contract in one fixed state. The code below avoids network data, provides a complete widget, sets a stable app wrapper, waits for rendering work to settle, checks that the expected widget exists, and then compares the golden.

\`\`\`dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class StatusBanner extends StatelessWidget {
  const StatusBanner({
    required this.title,
    required this.message,
    super.key,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: Material(
        color: const Color(0xfff8fafc),
        child: SizedBox(
          width: 360,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Text(message, style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

void main() {
  testWidgets('StatusBanner renders the warning state', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Center(
          child: StatusBanner(
            title: 'Payment needs review',
            message: 'Ask the account owner to approve the new card.',
          ),
        ),
      ),
    );

    expect(find.text('Payment needs review'), findsOneWidget);
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(StatusBanner),
      matchesGoldenFile('goldens/status_banner_warning.png'),
    );
  });
}
\`\`\`

Generate or refresh the image with:

\`\`\`bash
flutter test test/status_banner_test.dart --update-goldens
\`\`\`

Then compare it in normal test mode:

\`\`\`bash
flutter test test/status_banner_test.dart
\`\`\`

The update command is not a harmless convenience. The \`GoldenFileComparator.update\` API is invoked instead of comparison when \`autoUpdateGoldenFiles\` is true, and Flutter sets that when the test runner receives \`--update-goldens\`. In other words, update mode writes new truth. It should run intentionally, produce a code review diff of PNG files, and be tied to a human decision.

## What To Commit And What To Ignore

Commit golden PNGs when they represent product intent. Ignore temporary failure output if your comparator or package writes diff artifacts under local build directories. A clean repository policy avoids the two worst outcomes: missing baselines in CI, or noisy generated artifacts committed after every failed run.

| File type | Commit it? | Notes |
|---|---|---|
| \`test/**/goldens/*.png\` | Yes | Baselines are test fixtures |
| \`test/**/failures/*.png\` | Usually no | Useful locally, noisy in mainline |
| Package-specific CI goldens | Yes, if CI uses them | Alchemist can separate \`goldens/ci\` from platform goldens |
| Screenshots from manual debugging | No | Store outside the repo or attach to issues |
| Generated HTML reports | Usually no | Upload as CI artifacts instead |

Teams sometimes avoid committing PNGs because they feel heavy. That usually creates a worse problem. A golden without a baseline is not a regression test. If a binary diff is hard to review in your code host, add CI artifacts or a small script to render before and after images in the pull request.

## Host Drift: The Failure Mode You Will Hit First

The official \`matchesGoldenFile\` docs call out a major source of drift: custom fonts can render differently across platforms, and even the same platform can differ across Flutter versions. That warning is not theoretical. A golden generated on macOS can fail on Linux CI because text rasterization, font fallback, subpixel positioning, or antialiasing differs.

The symptom is frustrating: the UI is visually acceptable, but the diff shows tiny colored outlines around text. If the comparator is exact, even a small antialiasing difference fails the test. Before approving a mass baseline update, diagnose the host.

| Symptom | Likely cause | First check |
|---|---|---|
| Every text edge differs | Font or host renderer mismatch | Compare local OS and CI OS |
| Only shadows differ | Rasterization or blur behavior | Disable or standardize shadows in test theme |
| Layout wraps differently | Font metrics, width, or text scale changed | Print surface size and test text scale |
| Many goldens fail after SDK upgrade | Flutter engine or widget defaults changed | Review Flutter release notes and update in one PR |
| One state fails intermittently | Animation or async load not settled | Pump to deterministic frame |

The boring but effective policy is to generate and compare goldens on the same host class. If CI runs Linux, update goldens on Linux. If the team wants human-readable macOS goldens for local review, store them separately or use a package designed for platform-specific baselines.

## Loading Fonts Deliberately

By default, Flutter widget tests use the Ahem test font in many contexts. Ahem is useful because it is deterministic, but it makes text look like blocks and can hide real typography issues. Packages such as \`golden_toolkit\` provide utilities for loading app fonts. You can also load fonts directly in test setup.

The following \`flutter_test_config.dart\` loads a font before tests run. It is a complete test configuration file, assuming the font asset path exists in the project and is declared in \`pubspec.yaml\`.

\`\`\`dart
import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  TestWidgetsFlutterBinding.ensureInitialized();

  final fontLoader = FontLoader('Inter')
    ..addFont(rootBundle.load('assets/fonts/Inter-Regular.ttf'));

  await fontLoader.load();
  await testMain();
}
\`\`\`

Use this when the text itself is part of the visual contract. Use Ahem or obscured text when text shape should not be tested and cross-host stability is more important. Alchemist formalizes that split: its docs describe platform tests with human-readable text and CI tests where text is obscured with Ahem to avoid host-specific rendering differences.

## Choosing Native Goldens, Golden Toolkit, Or Alchemist

Native Flutter goldens are enough for many teams. Add a package when you need scenario grids, multiple device frames, font helpers, or a more opinionated separation between local and CI artifacts. Do not add a package just because a generated test looks shorter.

| Option | Current status checked | Best use | Caution |
|---|---|---|---|
| Native \`matchesGoldenFile\` | Official Flutter API, active | Precise widget or screen-slice baselines | You own surface, fonts, and comparator setup |
| \`golden_toolkit\` 0.15.0 | Pub documentation is available, API docs list 0.15.0 | Device scenarios, builders, font loading helpers | Check repository activity before new adoption |
| \`alchemist\` 0.14.0 | Pub package is active and changelog shows recent 0.14.0 changes | Separate local and CI goldens, scenario tables, diff thresholds | CI obscured text may be less useful for typography review |
| Percy or App Percy | BrowserStack product, active | Cross-browser or native-device screenshot review | External service and screenshot-based billing |

For native mobile app screenshots on real or hosted devices, a service workflow may be a better fit. See [Percy visual testing complete guide](/blog/percy-visual-testing-complete-guide) when the review process needs dashboard approvals, branch baselines, and broader visual collaboration.

## A Golden Toolkit Scenario Grid

\`golden_toolkit\` is useful when the same component must be captured across several states in one image. Its docs describe \`testGoldens\`, \`GoldenBuilder\`, \`pumpWidgetBuilder\`, \`screenMatchesGolden\`, and \`multiScreenGolden\`. The package also documents \`flutter test --update-goldens --tags=golden\` as a focused update workflow.

\`\`\`dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:golden_toolkit/golden_toolkit.dart';

class PlanPill extends StatelessWidget {
  const PlanPill({required this.label, required this.selected, super.key});

  final String label;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final color = selected ? Colors.green.shade700 : Colors.grey.shade300;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label, textDirection: TextDirection.ltr),
    );
  }
}

void main() {
  testGoldens('PlanPill states render correctly', (tester) async {
    final builder = GoldenBuilder.grid(columns: 2, widthToHeightRatio: 3)
      ..addScenario('Free plan', const PlanPill(label: 'Free', selected: false))
      ..addScenario('Pro plan selected', const PlanPill(label: 'Pro', selected: true));

    await tester.pumpWidgetBuilder(
      builder.build(),
      wrapper: materialAppWrapper(theme: ThemeData(useMaterial3: true)),
      surfaceSize: const Size(420, 220),
    );

    await screenMatchesGolden(tester, 'plan_pill_states');
  });
}
\`\`\`

The advantage is review density: one PNG can show the matrix of states. The risk is overpacking. If a single golden contains 40 tiny variants, reviewers stop seeing details. Prefer scenario groups that fit on one screen without zooming.

## An Alchemist CI-Oriented Example

Alchemist focuses on making golden tests easier to write and on separating platform goldens from CI goldens. Its documentation says CI tests obscure text and can disable shadow rendering to avoid platform-specific differences. Its 0.14.0 changelog includes a \`diffThreshold\` feature for comparison failures that depend on the image generation environment.

\`\`\`dart
import 'package:alchemist/alchemist.dart';
import 'package:flutter/material.dart';

class EmptyInbox extends StatelessWidget {
  const EmptyInbox({super.key});

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Text('No messages need your review.'),
      ),
    );
  }
}

void main() {
  goldenTest(
    'EmptyInbox renders the default state',
    fileName: 'empty_inbox',
    builder: () => GoldenTestGroup(
      scenarioConstraints: const BoxConstraints(maxWidth: 320),
      children: const [
        GoldenTestScenario(
          name: 'default',
          child: EmptyInbox(),
        ),
      ],
    ),
  );
}
\`\`\`

Alchemist is appealing for design-system teams because it makes scenario composition concise. Still, decide up front whether CI goldens with obscured text match your risk. If your regressions are usually spacing, color, icon alignment, and clipping, obscured text may be perfect. If your regressions are font weight, baseline alignment, and copy wrapping, keep a readable platform-golden workflow too.

## Custom Tolerance With \`goldenFileComparator\`

Flutter's docs show replacing \`goldenFileComparator\` with a custom comparator. This is a powerful escape hatch. Use it for known, tiny cross-host differences, not to hide real layout changes. A tolerance should be small, documented, and limited to the tests that need it.

\`\`\`dart
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class TolerantGoldenFileComparator extends LocalFileComparator {
  TolerantGoldenFileComparator(
    super.testFile, {
    required double precisionTolerance,
  })  : assert(precisionTolerance >= 0),
        assert(precisionTolerance <= 1),
        _precisionTolerance = precisionTolerance;

  final double _precisionTolerance;

  @override
  Future<bool> compare(Uint8List imageBytes, Uri golden) async {
    final result = await GoldenFileComparator.compareLists(
      imageBytes,
      await getGoldenBytes(golden),
    );

    final passed = result.passed || result.diffPercent <= _precisionTolerance;
    if (passed) {
      result.dispose();
      return true;
    }

    final error = await generateFailureOutput(result, golden, basedir);
    result.dispose();
    throw FlutterError(error);
  }
}

void main() {
  testWidgets('Icon badge allows tiny raster drift', (tester) async {
    final previous = goldenFileComparator;
    goldenFileComparator = TolerantGoldenFileComparator(
      Uri.parse('test/icon_badge_test.dart'),
      precisionTolerance: 0.001,
    );
    addTearDown(() {
      goldenFileComparator = previous;
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: Center(child: Icon(Icons.verified, size: 48)),
      ),
    );

    await expectLater(
      find.byIcon(Icons.verified),
      matchesGoldenFile('goldens/icon_badge.png'),
    );
  });
}
\`\`\`

The hidden danger is that tolerances become permanent folklore. If a test needs \`0.001\`, explain why in the test name or helper. If it needs \`0.05\`, it probably is not a trustworthy golden.

## CI That Separates Compare From Update

CI should compare goldens on pull requests. Updating goldens should be a separate, explicit workflow or a local developer action. Mixing the two means a pull request can overwrite the evidence of its own regression.

\`\`\`yaml
name: flutter-goldens

on:
  pull_request:
  workflow_dispatch:

jobs:
  compare-goldens:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7

      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true

      - run: flutter --version

      - run: flutter pub get

      - run: flutter test --tags=golden

      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: golden-failures-\${{ github.run_id }}
          path: test/**/failures/*.png
          if-no-files-found: ignore
\`\`\`

The \`subosito/flutter-action@v3\` major should be verified before adopting in your repository. The GitHub-owned actions in this workflow use their current major versions. If your organization pins Flutter with FVM, Docker, mise, or a self-hosted runner, use that instead of \`channel: stable\`. Reproducibility matters more than the action brand.

An update workflow should be manual and should either commit regenerated PNGs to a branch or upload them for review. Many teams prefer local updates inside a devcontainer or Linux container that matches CI.

\`\`\`bash
flutter --version
flutter pub get
flutter test --tags=golden --update-goldens
git status --short test
\`\`\`

The final \`git status\` is part of the workflow. It reminds the developer that updating goldens changes source-controlled artifacts.

## Directory-Level Tags And Test Selection

Flutter uses the Dart test runner under the hood, so tags are a practical way to separate golden tests from regular widget tests. Packages such as \`golden_toolkit\` encourage \`--tags=golden\`. Declare the tag so the runner recognizes it cleanly.

\`\`\`yaml
tags:
  golden:
    timeout: 2x
\`\`\`

Then use the same selector in CI and local updates:

\`\`\`bash
flutter test --tags=golden
flutter test --tags=golden --update-goldens
\`\`\`

Use tags with restraint. A test tagged \`golden\` should actually write or compare a golden file. If everything is tagged, selection loses meaning and pull request feedback slows down.

## What People Get Wrong About Golden Tests

The biggest mistake is treating golden tests as screenshots of the whole app. A full-screen golden is sometimes useful, but only if the state is deterministic and the reviewer can understand the contract. Most high-value Flutter golden tests are smaller: a form field with error text, a pricing card in selected and unselected states, a banner under text scaling, a component under right-to-left directionality, or a navigation rail at a breakpoint.

The second mistake is updating goldens during the same change that modifies many visual foundations. If a Flutter SDK upgrade, Material version change, app theme refactor, and feature redesign all happen in one pull request, the golden diff is unreadable. Split those changes. First upgrade the SDK and review mechanical baseline changes. Then land the feature visual change.

The third mistake is missing assertions before the visual comparison. If the widget never reached the intended state, \`matchesGoldenFile\` compares the wrong thing very precisely. Always assert presence of the state marker before comparing pixels.

## A Practical Baseline Review Checklist

Give reviewers a checklist that turns PNG changes into engineering decisions. It should fit in the pull request description or team docs.

| Review question | Accept when | Reject when |
|---|---|---|
| Did the intended component change? | The diff matches the described UI change | Unrelated states moved or recolored |
| Is text still readable? | Contrast, weight, and wrapping remain acceptable | Text clips, overlaps, or shrinks unexpectedly |
| Are layout constraints stable? | Fixed-size examples still fit | Content depends on local window size |
| Is the baseline generated on the right host? | Host matches CI policy | macOS, Linux, and Windows baselines are mixed accidentally |
| Are animations deterministic? | Capture frame is chosen intentionally | Diff shows transitional frames |

Reviewing goldens is not rubber-stamping PNG churn. It is deciding whether the new reference image should become truth. That is why good naming, small surfaces, and stable fixtures matter more than screenshot count.

## Frequently Asked Questions

### When should I use Flutter golden tests instead of device screenshots?

Use Flutter golden tests for fast widget-level visual contracts: design-system components, empty states, error states, responsive slices, and text-scale variants. They run without installing the app on a device and can be much faster than end-to-end screenshot workflows. Use device screenshots when the contract depends on native system UI, platform views, real keyboard behavior, permission prompts, or full app navigation. Many mature teams use both, with goldens catching component drift early.

### Why do golden tests pass locally but fail in CI?

The usual cause is host drift. Fonts, operating system rendering, Flutter SDK version, surface size, and antialiasing can differ between a developer laptop and CI. Start by printing \`flutter --version\` in CI, confirming the runner OS, and checking whether fonts are loaded identically. Generate baselines on the same host class that compares them. If tiny raster drift remains, consider a very small custom comparator tolerance, but do not use tolerance to hide layout changes.

### Should golden files be updated automatically on pull requests?

No. Pull requests should compare goldens and expose diffs. Updating with \`flutter test --update-goldens\` writes new baselines, so it should be an explicit local or manual workflow followed by human review of the changed PNGs. Automatic updates in PR CI can erase the evidence of a regression. A good policy is compare on every relevant pull request, update only when the UI change is intentional, and isolate mass updates such as Flutter SDK upgrades.

### Are Alchemist and golden_toolkit replacements for \`matchesGoldenFile\`?

They are helpers around Flutter's golden-testing model, not a different fundamental concept. \`golden_toolkit\` adds builders, wrappers, device scenarios, and focused golden tags. Alchemist adds a terse scenario API and separates platform and CI goldens, including obscured text for more stable CI output. Native \`matchesGoldenFile\` is still the underlying baseline idea. Choose a package when it reduces repeated setup or solves host-stability policy, not just to make the first test shorter.
`,
};
