import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Appium W3C gesture coordinate testing',
  description:
    'Appium W3C gesture coordinate testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Appium W3C gesture coordinate testing',
  keywords: [
    'Appium W3C gesture coordinate testing',
    'Appium W3C actions coordinates',
    'mobile gesture coordinate test',
    'Appium swipe safe area',
    'orientation gesture scaling',
    'pointer action viewport origin',
  ],
  relatedSlugs: [
    'appium-mobile-testing-complete-guide',
    'appium-3-migration-guide-2026',
    'mobile-testing-automation-guide',
    'appium-2-mobile-automation-reference-2026',
  ],
  sources: ['https://appium.io/docs/en/latest/guides/caps/', 'https://www.w3.org/TR/webdriver2/'],
  repoEvidence: ['seed-skills/appium-mobile/SKILL.md', 'seed-skills/mobile-device-farm/SKILL.md'],
  content: `Appium W3C gesture coordinate testing should derive each touch path from the current window, target bounds, screen turn, and safe insets. The suite must save that geometry, perform the W3C action, and prove the intended screen change instead of trusting fixed pixels or a command that returned without error.

Hardcoded points often pass on the phone used by the author. They then strike a system bar, miss a moved item, or leave the screen after a turn. A sound test can explain every start and end point from facts captured just before the action.

The repo already has the core pattern. \`seed-skills/appium-mobile/SKILL.md\` reads the live window size, scales swipe points, finds an element center, uses \`PointerInput.Origin.viewport()\`, and sends W3C sequences. \`seed-skills/mobile-device-farm/SKILL.md\` calls for focused, independent cases, async care, clean state, device records, and useful CI reports.

This article turns those facts into a cross-device test plan. Read the [Appium guide](/blog/appium-mobile-testing-complete-guide), then inspect [mobile testing skills](/skills) for a reusable runbook. Appium W3C gesture coordinate testing is about point math and visible outcomes, not a broad check of all mobile input.

## What Does Appium W3C Gesture Coordinate Testing Verify?

Appium W3C gesture coordinate testing verifies that start and end points come from live screen facts, remain inside the allowed touch area, and cause the expected view change. The test joins window size, target bounds, insets, screen direction, pointer origin, action path, final item state, and scroll state.

The Appium skill is direct repo proof for live geometry. Its swipe helper asks the driver for the window size, uses 80 and 20 percent points, and sends a touch sequence from the viewport origin. Its long press and double tap find the target center rather than storing one phone's pixel values.

That helper is a base, not the whole oracle. It does not read safe insets, prove an item moved, or set rules for every driver and phone. The test plan adds those checks as clear advice and keeps them apart from facts in the repo.

The W3C [WebDriver actions specification](https://www.w3.org/TR/webdriver2/) defines pointer state with x and y positions in viewport coordinates. It also defines an out-of-bounds error when a target point falls outside the viewport. Those rules support a preflight bound check and a saved origin for each move.

A successful action call is weak proof. The finger may start on a fixed toolbar, the list may already be at its end, or the target may have moved. Check a product result such as a newly visible item, changed scroll offset, open menu, or selected card after the path runs.

Use the [Appium 2 reference](/blog/appium-2-mobile-automation-reference-2026) for wider command details. Keep this suite focused on current geometry, W3C point rules, and the first visible effect.

## How Do You Build Appium W3C Actions Coordinates?

Build Appium W3C actions coordinates from one known scroll view that has stable item IDs above and below the fold. Start in portrait mode on a clean app screen, hide any keyboard, close popups, and wait until layout is still. Capture the window rectangle and the scroll view rectangle at that point.

Use ratios for broad swipes and target bounds for item gestures. A vertical swipe can start near 75 percent of the usable view and end near 30 percent. A long press should use the live center of its item unless the product calls for a handle or another hit zone.

Apply safe insets before rounding. The usable top is the greater of the view top and top inset, while the usable bottom is the lesser of the view bottom and window height minus the bottom inset. Clamp both points inside that span and keep a small margin from each edge.

Read all geometry after a screen turn. A width and height saved in portrait mode are stale once the phone is horizontal. Wait for the expected screen direction and stable target bounds, then compute the path again from those new facts.

The positive case should expose one item that began below the fold. Save the item's hidden state, run the upward swipe, wait for layout to stop, and require the item to be visible. Also save the exact start, end, duration, origin, and source kind used in the W3C sequence.

Set up each device through named [Appium capabilities](https://appium.io/docs/en/latest/guides/caps/) rather than a hidden local profile. The source explains standard and driver-specific capability groups. Pin the device name, platform version, app, automation driver, and reset choice in the test report.

Reset by returning to the known route and scroll start, not by swiping down an unknown number of times. The [mobile automation guide](/blog/mobile-testing-automation-guide) gives the wider screen setup context. A direct route plus an app-owned top marker makes this fixture much easier to trust.

## What Breaks a Mobile Gesture Coordinate Test?

A mobile gesture coordinate test breaks when point math uses facts from the wrong time or origin. Common causes include fixed pixels, stale width after a turn, a system bar inside the path, a moved item, a shown keyboard, and element offsets treated as full-screen points.

Fixed pixels hide a scale error until the suite reaches a small or tall phone. The action can still return success because the point is valid, yet it touches empty space. Save point ratios with raw points so reviewers can see whether the math scaled as planned.

Stale geometry has a clear signature. The report says the phone is horizontal, but the saved width is less than its height or matches the earlier portrait sample. Fail preflight before sending the touch because a later item miss would only hide the first bad state.

Safe bars can change the usable span without changing the full screen size. A point may be inside the viewport while it sits under a home bar, cutout, or app header. Test the app's actual touch zone, then store the inset source and fallback rule.

Element movement creates another race. A list may finish loading after the target rectangle is read, or an alert may shift the page. Read the rectangle again just before the first pointer move, and reject a change beyond the allowed layout tolerance.

Origin mixups are easy to spot when the test saves both the declared origin and resolved points. An element-relative offset should not be logged as a viewport point without adding the element position. The repo helper uses viewport origin, so its coordinates are already full-window points.

A runner fault fails before the app result, such as \`move target out of bounds\`, a lost session, or an unsupported action. An app fault starts after a valid path reaches the view but the expected scroll or item state does not change.

Review the [Appium 3 migration guide](/blog/appium-3-migration-guide-2026) when a driver update changes action behavior. Keep the same saved geometry so old and new runs can be compared on equal terms.

## Appium Swipe Safe Area Fixtures and Controls

An Appium swipe safe area fixture should define the full window, app view, fixed bars, system insets, and a small edge margin. The final usable rectangle is their overlap. Each start and end point must be inside that rectangle before the W3C action is built.

The positive control swipes within the middle of a long list and reveals a known lower item. The negative control sends a point just outside the computed bottom bound through the math layer, not the device. The layer should reject it and state which bound failed.

A boundary control uses points exactly at the safe margin. One point just inside should pass preflight, while one point just outside should fail. Do not send unsafe points to a shared phone merely to prove that the driver might reject them.

Add a fixed-header case. Begin below the header, end above the bottom bar, and verify list content moves while the header stays fixed. This case catches code that scales against the whole window and starts on app chrome.

Add a keyboard case only if the product allows gestures while a field is active. Record the window and target bounds before and after the keyboard opens. If the app requires the keyboard to close first, assert that state instead of hiding it in setup.

Repeat the same case after a full route reset and after a screen turn. A repeated run checks scroll cleanup, while the turned run checks fresh size reads. Both should use the same item goal but may produce different raw points.

The device-farm skill says tests should be independent and clean their resources. Apply that rule by giving each job one phone, one route, one app build, and one saved geometry record. A failed cleanup should block reuse of that phone.

Use [mobile test guidance](/blog) to keep safe-area checks separate from visual and speed checks. This fixture proves touch bounds and screen change, not frame rate or pixel layout.

## How Should Orientation Gesture Scaling Be Asserted?

Orientation gesture scaling should compare ratios and bounds, not demand equal pixels across screen turns. Capture the portrait rectangle, turn the screen, wait for a stable horizontal rectangle, and recompute. Require each point to keep its intended role within the new usable view.

Exact equality fits the reported screen direction, point origin, source kind, and target item ID. Range checks fit x and y bounds. Ratio tolerance fits a start meant to remain near 75 percent of usable height despite integer rounding.

Use a partial order for layout events. The turn must finish before the rectangle read, the rectangle read before path build, and the path before the view result. Their exact time gaps can vary, but reversing that order means stale data was used.

Use bounded timing for layout to become still. Poll a small target rectangle until two reads match within tolerance, then stop at a clear limit. A fixed sleep may waste time on fast phones and still race on slow ones.

The result should state more than \`perform\` completed. For a list swipe, require the chosen item to move from hidden to visible or require a known scroll marker to change in the right direction. For a drag, require the target to reach the planned drop zone.

Point clamping must not hide a large error. If raw math lands one pixel past a rounded edge, a clamp may be valid and should be logged. If it lands far outside the view, fail the case because the source facts or formula are wrong.

Compare runs by normalized facts: start ratio, end ratio, inset margin, target ID, and result. Raw pixels still belong in the artifact, but they should not be the cross-device pass rule. That split makes the report useful on compact and tall screens.

The [Appium complete guide](/blog/appium-mobile-testing-complete-guide) can supply broader wait and selector patterns. This oracle remains a direct link from live geometry to one intended view change.

## Pointer Action Viewport Origin in CI

Pointer action viewport origin should be an explicit field in each CI case. Save \`viewport\`, \`pointer\`, or element origin as the action declares it, then store the resolved start and end points. Never let a helper name such as \`swipeUp\` hide those facts.

Build a small device set with one compact screen, one tall screen, one device with insets, and both screen directions where the app supports them. Pin the platform and driver versions. Use real phones for selected runs because a simulator may not copy each system bar.

CI setup must wait for a still route. Save app build, device alias, platform version, automation driver, screen direction, window rectangle, view rectangle, insets, path, and target state. Avoid full page source dumps unless a secure debug job needs them.

Fail fast when any point is out of bounds. The diagnostic should name the source rectangle, raw point, safe point, margin, and formula. If preflight passes but the action fails, add the protocol error and session state without changing the first result.

Retries must return to the top marker and read all geometry again. Reusing the old path after a failed turn can turn one clear defect into several random misses. Count a device restart as an infrastructure retry, not a product pass.

Publish a short JSON artifact and one clipped screen image around the target when policy allows it. The artifact gives exact math, while the image shows fixed bars and item placement. Redact account names and private app data.

Tie failures to \`seed-skills/appium-mobile/SKILL.md\` for W3C path code or \`seed-skills/mobile-device-farm/SKILL.md\` for job isolation. Then check [the project FAQ](/faq) when packaging the test as a directory skill.

## Appium W3C Gesture Coordinate Testing Comparison Matrix

The matrix keeps the same product goal while changing one geometry condition. Each row should begin at the same top marker and end with the same lower item visible, unless the case is meant to stop during preflight.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Portrait device without a cutout | Clean route with the full window and list bounds saved after two stable layout reads. | Scaled path stays inside the list, keeps its planned ratios, and reveals the target item. | Fixed pixels miss the list, touch a fixed bar, or cause no view state change. | \`seed-skills/appium-mobile/SKILL.md\`. |
| Screen turn before the gesture | Turn first, confirm horizontal mode, then read the window and target again. | New width, height, ratios, and path match the current view and item bounds. | Path uses portrait facts, the old item rectangle, or a point made before layout stopped. | Both repository skills. |
| Device with top and bottom safe areas | Save both insets and intersect them with the live list bounds plus the edge margin. | Both points clear system bars and app chrome while staying inside the scroll view. | A point is valid for the full window but unsafe for touch within the app view. | \`seed-skills/mobile-device-farm/SKILL.md\`. |
| Gesture relative to a target item | Read the live item center, current rectangle, and chosen hit zone just before the move. | Resolved viewport point lies inside the current item rectangle and targets the planned control. | Element offset is sent as a full-screen point or stale movement shifts the target first. | Appium gesture helper. |
| Endpoint outside the current viewport | Feed one clearly invalid endpoint to the preflight layer while keeping all source facts valid. | Test rejects the path before any action reaches the phone and names the failed bound. | Helper clamps a large error, hides its source point, or sends an unsafe path. | W3C actions specification. |

The matrix does not claim that every phone reports safe insets through one Appium call. The adapter must name its source, such as app layout data, driver output, or a device profile. Missing inset data should select a stated fallback or skip with a clear reason.

Add a row for split screens or fold states only when the app supports them and setup can prove the mode. Do not treat a changed window size as enough proof of a hinge or pane contract. Keep product mode and point math as separate facts.

Appium W3C gesture coordinate testing works best when a reviewer can recompute each row from the saved artifact. Compare these cases with the [Appium 2 reference](/blog/appium-2-mobile-automation-reference-2026) before adding driver commands.

## How Do You Implement Appium W3C Gesture Coordinate Testing?

Implement Appium W3C gesture coordinate testing by proving the fixture, then the path, then the view result. Run the plain portrait case first. Add a bad path only after the positive case and route reset both work.

1. Read \`seed-skills/appium-mobile/SKILL.md\` and \`seed-skills/mobile-device-farm/SKILL.md\`, then list supported inputs, outputs, device facts, and cleanup steps.
2. Open one clean scroll view across portrait, horizontal, compact, tall, and inset-bearing device profiles.
3. Capture window size, view bounds, insets, screen direction, target bounds, path, target visibility, and scroll state for the positive case.
4. Inject one fault at a time, including fixed pixels, stale size, ignored bars, moved targets, mixed origins, and an out-of-range endpoint.
5. Compare each result with the five matrix rows, then report the first point or state that differs from the contract.
6. Run the gate in CI, retain safe geometry data, reset the route, release the phone, and link the failure to its repo source.

The first Java example builds a viewport path from the current window and a safe vertical span. It follows the live-size and W3C sequence pattern in the Appium skill.

\`\`\`java
record SwipePath(int x, int startY, int endY) {}

static SwipePath upwardPath(
    Rectangle window,
    Rectangle scrollView,
    int topInset,
    int bottomInset
) {
    int safeTop = Math.max(scrollView.y, topInset) + 12;
    int safeBottom = Math.min(
        scrollView.y + scrollView.height,
        window.height - bottomInset
    ) - 12;
    int usable = safeBottom - safeTop;
    if (usable < 100) throw new IllegalStateException("unsafe touch span");

    int x = scrollView.x + scrollView.width / 2;
    return new SwipePath(
        x,
        safeTop + Math.round(usable * 0.75f),
        safeTop + Math.round(usable * 0.30f)
    );
}
\`\`\`

Validate the returned path before building the action. Require x within the scroll view and both y values within the safe span. Save the raw rectangles and path when one rule fails.

The next example creates the W3C sequence and checks a visible result. It keeps the viewport origin named at each move, which prevents an element offset from being read as a full-window point.

\`\`\`java
SwipePath path = upwardPath(window, listRect, topInset, bottomInset);
assertInside(path.x(), path.startY(), listRect, topInset, bottomInset);
assertInside(path.x(), path.endY(), listRect, topInset, bottomInset);

PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
Sequence swipe = new Sequence(finger, 0);
swipe.addAction(finger.createPointerMove(
    Duration.ZERO,
    PointerInput.Origin.viewport(),
    path.x(),
    path.startY()
));
swipe.addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
swipe.addAction(finger.createPointerMove(
    Duration.ofMillis(600),
    PointerInput.Origin.viewport(),
    path.x(),
    path.endY()
));
swipe.addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));

driver.perform(List.of(swipe));
wait.until(visible(AppiumBy.accessibilityId("result-row-12")));
\`\`\`

Add a fault case that computes a portrait path, turns the screen, and tries to reuse the stale facts through preflight. The case should fail before \`driver.perform\`. That proves the harness catches stale geometry without sending a stray touch.

Keep device choice and reservation in the farm layer, geometry in one helper, and product results in the page object. This split gives each failure a clear owner. Browse [mobile testing skills](/skills) after the suite passes and add the runbook for reuse.

## Frequently Asked Questions

### How should Appium tests calculate W3C gesture coordinates across screen sizes, orientation changes, and safe areas?

Read the current window and target rectangles after layout is still, intersect them with known safe insets, and derive points by ratio or target bounds. Recompute after every screen turn. Save the origin and resolved points, then assert a product result instead of accepting a completed action call.

### What should an Appium W3C actions coordinates fixture record?

Record app build, device alias, platform and driver versions, screen direction, window rectangle, target rectangle, safe insets, point origin, source kind, duration, start point, end point, and final view state. Add route reset status so the next run cannot inherit a changed scroll position.

### Which failure proves a mobile gesture coordinate test is broken?

A strong harness failure occurs when preflight accepts a point outside the saved usable rectangle or reuses dimensions captured before a screen turn. An action error alone may be a driver issue. A valid path with no expected view change points instead to app behavior, target choice, or stale layout.

### How do teams isolate an Appium swipe safe area?

Reserve one phone, open one known scroll route, hide transient UI, and capture the full window, app view, fixed bars, and system insets. Form their shared usable rectangle and add an edge margin. Reset to an app-owned top marker before every repeated or turned-screen case.

### Which assertion is strongest for orientation gesture scaling?

Assert a chain of facts: the new screen direction is stable, geometry was read afterward, point ratios fit the new safe span, both points are in bounds, and the chosen item changes from hidden to visible. Equal raw pixels across screen turns would be the wrong goal and should not pass.

### How should CI report pointer action viewport origin failures?

Report the case, device facts, declared origin, source rectangles, raw point, resolved point, safe bounds, formula, protocol error, product result, and cleanup state. Keep the first differing fact at the top. A clipped target image can help, but geometry data must remain the main proof.

## Conclusion

Appium W3C gesture coordinate testing ties each touch to live window facts, target bounds, safe insets, screen direction, and an explicit W3C origin. Preflight bounds, fresh reads after turns, visible app results, and clean route resets make cross-device failures clear.

Run the five cases on one compact and one inset-bearing phone before widening the device set. Review the [Appium mobile testing guide](/blog/appium-mobile-testing-complete-guide), then open [QA skills](/skills) and implement the Appium W3C gesture coordinate testing matrix in the next test run.`,
};
