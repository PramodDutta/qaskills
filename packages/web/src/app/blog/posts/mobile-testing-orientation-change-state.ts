import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mobile Testing Orientation Change State Without False Confidence',
  description: 'Use mobile testing orientation change state workflows to catch lost input, duplicate requests, broken layouts, and lifecycle bugs across native and mobile web apps.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Mobile Testing Orientation Change State Without False Confidence

Mobile testing orientation change state requires more than rotating a screenshot from portrait to landscape. A useful test establishes meaningful state, triggers a real configuration or viewport transition, and verifies continuity afterward. The user’s committed data, in-progress input, navigation position, selected content, scroll context, media progress, and pending operations should follow an explicit preservation policy. Layout must adapt without hiding actions or creating overlapping controls.

The central distinction is between durable domain state, restorable UI state, and transient presentation state. A saved cart belongs in durable storage or a server session. Draft text may belong in a saved-state mechanism or view model. A temporary ripple or open tooltip may reasonably disappear. QA should turn those decisions into an oracle before automating rotation. “Looks okay after rotate” is not a state test.

On Android, a configuration change commonly destroys and recreates the activity so resources can be selected for the new configuration. On iOS, rotation changes the interface orientation and layout environment without copying Android’s lifecycle model. Mobile web apps experience a viewport and media-query change, often with browser chrome and virtual-keyboard complications. The workflows below test each platform at its real boundary while keeping common state invariants consistent.

## Build a state ledger before touching the device

Choose a user journey that contains enough state to expose loss or duplication. A checkout address, multi-step onboarding form, selected search filters, playing video, or editable document works better than an empty home screen. Record the precondition, expected post-rotation value, persistence scope, and evidence source.

| State item | Example | Expected after rotation | Evidence |
|---|---|---|---|
| committed domain data | cart line item | unchanged | UI plus API or local repository |
| unsaved user input | address line | preserved according to draft policy | field value |
| navigation | checkout step 2 | same logical destination | route and heading |
| selection | chosen delivery method | still selected | control state and price summary |
| scroll context | item under review | still reasonably in context | visible anchor or index |
| transient UI | toast animation | may disappear | product decision |
| pending network work | submit request | completes once, never duplicates | server request ID and UI result |

This ledger prevents accidental over-assertion. Pixel-perfect scroll coordinates may be wrong when landscape shows more content. The invariant is often that the same logical item remains visible, not that \`scrollY\` is identical. Likewise, a two-pane tablet layout may move the current detail into a second pane while preserving selection and back-navigation meaning.

Prioritize state by harm. Lost payment confirmation or duplicated order submission is more serious than a collapsed accordion. Run high-harm cases on every relevant release lane, and place exhaustive cosmetic combinations in a broader device matrix.

## Map the platform event you actually need

Several events look like rotation but exercise different code. Resizing an emulator window, changing device orientation, recreating an Android activity, folding a device, entering split screen, and resizing a browser viewport overlap in layout impact but are not interchangeable. Label tests by the event they produce.

| Test action | What it exercises | What it does not prove alone |
|---|---|---|
| Android \`ActivityScenario.recreate()\` | destruction and recreation restoration | landscape resources and geometry |
| Android device rotation | configuration, resources, and physical orientation policy | process death restoration |
| iOS device orientation change | trait and layout transition behavior | Android-style activity recreation |
| web viewport resize | responsive CSS and JS listeners | mobile browser sensor behavior |
| Android process recreation test | durable and saved state boundary | visual landscape quality |
| fold or window resize | adaptive width and continuity | phone rotation support |

Use at least two Android tests for important flows: a fast activity recreation test and a device-level orientation test. If state survives only because the activity is configured to handle orientation manually, recreation exposes that weakness. If it survives recreation but landscape resources are broken, physical rotation exposes the layout defect.

Android’s official configuration guidance explains that the system recreates activities for configuration changes by default and that applications must maintain continuity: https://developer.android.com/guide/topics/resources/runtime-changes. Activity testing guidance is available at https://developer.android.com/guide/components/activities/testing.

What people get wrong is adding \`android:configChanges\` to make a failing test pass. That shifts responsibility to the activity and does not automatically preserve state or handle every configuration. It can mask a lifecycle design problem while creating new work for screen size, font scale, locale, keyboard, and window changes. Treat manifest changes as architecture decisions, not test workarounds.

## Define a concrete orientation contract for a checkout

Suppose the test subject is a native checkout screen with recipient name, address, delivery method, an expandable order summary, and a “Place order” action. Write a contract that separates values and presentation:

1. Typed recipient and address drafts survive portrait to landscape and back.
2. The selected delivery method and calculated total remain consistent.
3. Validation messages stay associated with the correct fields.
4. The primary action remains reachable without clipping or overlap.
5. If submission begins immediately before rotation, the service receives one idempotent order attempt and the UI reaches one result.
6. The expanded summary may collapse only if the design explicitly treats expansion as transient.

Add accessibility continuity: focus should not jump to an unrelated destructive action, announcements should not repeat endlessly, text must reflow at supported font scales, and controls must retain accessible names. Orientation can create a landscape width that tempts the UI into a cramped horizontal form, so test large text and display scaling rather than orientation in isolation.

The contract becomes a review artifact shared by product, development, and QA. Without it, a developer may preserve every widget mechanically while design expects responsive restructuring, or QA may accept data loss because the app does not crash.

## Test Android activity recreation directly


\`ActivityScenario.recreate()\` is a focused way to verify that an activity survives destruction and recreation. The following instrumentation test assumes the application exposes a \`CheckoutActivity\` with labeled views and stable IDs. It enters a draft, selects standard delivery, recreates the activity, and verifies restored values.

\`\`\`kotlin
package com.example.checkout

import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.replaceText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isChecked
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CheckoutRecreationTest {
    @Test
    fun draftAndSelectionSurviveRecreation() {
        ActivityScenario.launch(CheckoutActivity::class.java).use { scenario ->
            onView(withId(R.id.recipient_name)).perform(replaceText("Asha Rao"))
            onView(withId(R.id.address_line)).perform(replaceText("42 Test Avenue"))
            onView(withId(R.id.standard_delivery)).perform(click())

            scenario.recreate()

            onView(withId(R.id.recipient_name)).check(matches(withText("Asha Rao")))
            onView(withId(R.id.address_line)).check(matches(withText("42 Test Avenue")))
            onView(withId(R.id.standard_delivery)).check(matches(isChecked()))
        }
    }
}
\`\`\`

This test does not rotate the screen. Its name says what it proves: state restoration across recreation. It is fast, deterministic, and valuable even for activities currently locked to portrait because system-driven recreation can happen for other reasons.

If the activity launches background work, add an observable test seam for the repository or use a test server. After \`recreate()\`, assert that the work was not enqueued twice. Avoid asserting lifecycle callback counts as the business oracle. Callback patterns can change while the user-facing invariant remains correct.

For Jetpack Compose, use semantics instead of view IDs and access the scenario managed by the activity rule. This complete example checks a draft value through recreation:

\`\`\`kotlin
package com.example.checkout

import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performTextInput
import org.junit.Rule
import org.junit.Test

class CheckoutComposeRecreationTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<CheckoutActivity>()

    @Test
    fun recipientDraftSurvivesRecreation() {
        composeRule.onNodeWithTag("recipient-name").performTextInput("Asha Rao")

        composeRule.activityRule.scenario.recreate()

        composeRule.onNodeWithTag("recipient-name").assertTextEquals("Asha Rao")
    }
}
\`\`\`

Use a test tag only when a stable user-facing semantic locator is not suitable. The application still needs accessible labels. A test passing through a tag says nothing about spoken feedback or control meaning.

## Trigger physical orientation on Android instrumentation

Device rotation verifies resource selection, window geometry, and the complete configuration path. UI Automator can control emulator or device orientation from instrumentation. Restore rotation in a \`finally\` block so one failed test does not contaminate the rest of the suite.

\`\`\`kotlin
package com.example.checkout

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.replaceText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isCompletelyDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CheckoutOrientationTest {
    @get:Rule
    val activityRule = ActivityScenarioRule(CheckoutActivity::class.java)

    @Test
    fun landscapePreservesDraftAndPrimaryAction() {
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        try {
            device.setOrientationNatural()
            onView(withId(R.id.recipient_name)).perform(replaceText("Asha Rao"))

            device.setOrientationLeft()

            onView(withId(R.id.recipient_name)).check(matches(withText("Asha Rao")))
            onView(withId(R.id.place_order)).check(matches(isCompletelyDisplayed()))
        } finally {
            device.unfreezeRotation()
        }
    }
}
\`\`\`

The call freezes orientation until released. On a shared device lab, cleanup is part of correctness. Add screenshots and window metrics on failure, but do not use screenshots as the only assertion. A button can be visible while covered by another view or unreachable through accessibility navigation.

Orientation terms are device-relative. “Left” may produce a specific landscape direction based on the device’s natural orientation. If left versus right matters because of a camera cutout or hardware controls, test both explicitly on representative hardware.

## Cover iOS with orientation-aware UI tests

iOS UI tests can set \`XCUIDevice.shared.orientation\`. Establish portrait before launch, enter state, rotate, and assert value and reachability. Use accessibility identifiers for disambiguation and accessible labels for the user contract.

\`\`\`swift
import XCTest

final class CheckoutOrientationUITests: XCTestCase {
    override func tearDown() {
        XCUIDevice.shared.orientation = .portrait
        super.tearDown()
    }

    func testDraftAndSubmitButtonSurviveLandscape() {
        XCUIDevice.shared.orientation = .portrait
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()

        let recipient = app.textFields["checkout.recipient"]
        XCTAssertTrue(recipient.waitForExistence(timeout: 5))
        recipient.tap()
        recipient.typeText("Asha Rao")

        XCUIDevice.shared.orientation = .landscapeLeft

        XCTAssertEqual(recipient.value as? String, "Asha Rao")
        let submit = app.buttons["Place order"]
        XCTAssertTrue(submit.waitForExistence(timeout: 5))
        XCTAssertTrue(submit.isHittable)
    }
}
\`\`\`

\`isHittable\` is useful but not a complete layout assertion. Also capture whether the button frame intersects the visible application window and whether scrolling can reach it when the keyboard is open. A false failure can arise if the software keyboard covers content immediately after text entry. Decide whether rotation should dismiss the keyboard, keep it, or adjust the view, then assert that policy.

Test iPad multitasking and resizable windows separately. Modern mobile interfaces cannot assume that orientation maps to one fixed width. A landscape phone and a narrow app window on a landscape tablet may choose different layouts. Prefer width-class and content-continuity oracles over a binary “portrait layout versus landscape layout” model.

## Test mobile web state through viewport transitions

For mobile web, Playwright can set a viewport on a browser context, but a viewport resize is a responsive-layout test rather than proof of physical sensor events. That is still the right deterministic layer for most CSS and client-state regressions. Use a real-device pass when code depends on \`screen.orientation\`, fullscreen behavior, or mobile browser chrome.

The test below enters a draft, changes viewport geometry, and checks the logical anchor and action. It uses a context created with an initial viewport and the documented \`page.setViewportSize\` method.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('mobile checkout preserves draft across responsive resize', async ({ page }) => {
  const checkoutUrl = process.env.MOBILE_CHECKOUT_URL;
  if (!checkoutUrl) throw new Error('Set MOBILE_CHECKOUT_URL');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(checkoutUrl);
  await page.getByLabel('Recipient name').fill('Asha Rao');
  await page.getByRole('radio', { name: 'Standard delivery' }).check();

  await page.setViewportSize({ width: 844, height: 390 });

  await expect(page.getByLabel('Recipient name')).toHaveValue('Asha Rao');
  await expect(page.getByRole('radio', { name: 'Standard delivery' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Place order' })).toBeVisible();
});
\`\`\`

Do not recreate the browser context between orientations unless process-like loss is the test. A new context clears more state than a rotation and changes the meaning of the result. Conversely, if the application reloads on width change by design, assert storage-backed restoration across that reload explicitly.

Stable locators keep these checks resilient as layouts restructure. The [Playwright best practices for locators in 2026](/blog/playwright-best-practices-locators-2026) covers role, label, test ID, filtering, and strictness choices for responsive interfaces.

## Stress the risky moment: rotate during asynchronous work

The most valuable orientation test often begins an operation and rotates before it completes. Examples include loading search results, uploading a photo, calculating delivery options, saving a draft, starting payment authorization, or requesting a one-time code. The expected invariant is usually one logical operation with one terminal user result.

Create a controllable test backend that accepts the request, records an idempotency or correlation key, and delays the response until the test releases it. Avoid racing a fixed \`sleep\` against production timing. The test sequence is:

1. Fill the form and submit.
2. Wait until the test backend confirms exactly one request is pending.
3. Rotate or recreate the UI.
4. Release the response.
5. Assert one server operation, one navigation transition, and one confirmation.

| Failure | Likely cause | Diagnostic evidence |
|---|---|---|
| request sent twice | effect or observer re-subscribed on recreation | correlation keys and timestamps |
| spinner never resolves | new UI lost reference to existing work | repository state and observer lifecycle |
| confirmation appears twice | event replay treated as state | navigation and analytics events |
| draft returns after success | stale saved state overwrites committed state | restoration order |
| rotated screen shows old price | computed state cached by old configuration | model and render snapshots |

Idempotency at the service boundary is still necessary even if the UI is fixed. Mobile networks retry, users tap twice, and processes restart. The orientation test is a reliable way to expose duplicate-submission weaknesses, not the only scenario that can cause them.

## Diagnose a realistic state-loss failure by ownership

Imagine a Compose checkout where recipient text survives rotation, but the delivery choice resets and the total returns to zero. The text field uses a saveable state mechanism, while the choice and total were local variables initialized during composition. The API still contains the cart.

Diagnose ownership before patching symptoms:

1. Verify whether the selection is domain state, UI draft state, or a derivation of another value.
2. Inspect whether a view model or repository owns the source of truth.
3. Determine whether the total should be recomputed from the selected delivery method and cart rather than saved independently.
4. Reproduce with activity recreation and with device rotation to separate restoration from resource-layout defects.
5. Add assertions for the selected method and computed total in one test so they cannot drift.

The correct fix may be to save only the selected delivery identifier and derive the total. Saving every displayed value can create contradictory restoration. A good defect report says which state owners changed, which persisted, and whether the activity instance changed. “Landscape resets checkout” is too broad for fast diagnosis.

Another realistic failure is duplicated analytics rather than visible state loss. A screen-view event fires in \`onCreate\`, so every rotation creates another event. Decide whether analytics measures activity instances or user-visible screens. If the intended metric is a logical screen view, add a correlation guard and test the event stream through rotation.

## Expand the matrix beyond one portrait-landscape pair

Orientation interacts with device size, fold state, font scale, locale, theme, keyboard, permissions, camera use, and multi-window. Pairwise coverage gives better value than an impossible Cartesian product. Select combinations based on layout breakpoints and state risk.

| Lane | Suggested coverage | Purpose |
|---|---|---|
| pull request | one Android recreation, one responsive web resize | fast state regression signal |
| native integration | portrait to both landscape directions on emulator | resources and geometry |
| nightly device lab | representative phone and tablet or foldable | OEM and adaptive behavior |
| accessibility lane | large text, keyboard or switch path, both orientations | reachability and reflow |
| release critical path | rotate during submit and background-foreground | duplicate and continuity risks |

Use the [complete 2026 guide to JavaScript testing frameworks](/blog/javascript-testing-frameworks-complete-guide-2026) when deciding which web state calculations belong in fast unit tests and which responsive behaviors require a real browser. Keep native lifecycle checks in their platform test frameworks.

Record the device model, OS version, natural orientation, window dimensions, application build, and test action. “Failed on landscape” is insufficient on foldables and desktop-style windows. Include before and after screenshots, hierarchy or accessibility-tree evidence, and server correlation logs for asynchronous cases.

## Keep the suite stable and restore the lab

Orientation suites become flaky when they infer readiness from time. Wait for an observable UI element, stable repository status, server checkpoint, or framework idling mechanism. Rotation animations and activity creation can vary by device. A five-second sleep hides performance regressions and still fails on a loaded lab.

Always return shared devices to a known state. Unfreeze rotation, restore portrait or natural orientation according to lab policy, dismiss the keyboard, clear only test-owned data, and stop test backend delays. Put cleanup in framework teardown or \`finally\` blocks. If cleanup fails, quarantine the device session rather than letting contaminated state cascade through unrelated tests.

Use unique test accounts and correlation labels with explicit variable boundaries in CI:

\`\`\`bash
set -eu
: "\${CI_PIPELINE_ID:?CI_PIPELINE_ID is required}"
: "\${CI_NODE_INDEX:?CI_NODE_INDEX is required}"

TEST_RUN="orientation_\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}"
export TEST_RUN
./gradlew connectedDebugAndroidTest
\`\`\`

Keep screenshots and videos for failures, but make semantic assertions the gate. Visual artifacts accelerate diagnosis. They should not be the sole judge of state continuity, request counts, selection, or accessibility.

## Verify orientation policy instead of assuming rotation is allowed

Some screens intentionally request or restrict orientation. Camera capture, video playback, kiosk tasks, games, and regulated workflows may have a documented constraint. The test oracle is then policy enforcement plus state continuity when the surrounding configuration changes. Do not mark a portrait-only screen defective merely because it stays portrait. Verify that the restriction is intentional, limited to the correct screen, compatible with supported large-screen behavior, and released when navigation leaves that experience.

Test the request from both directions. Enter the restricted screen while the device is already landscape, then leave it and confirm the next adaptive screen can rotate. Background and foreground the application while restricted. Open a system picker or permission dialog and return. A common defect is a global orientation lock that survives beyond its owning activity or view controller, leaving unrelated screens stuck until restart.

Large screens deserve separate expectations because device makers and platform policies may treat orientation requests differently in adaptive environments. Assert content reachability and window responsiveness rather than relying only on the reported orientation. A resizable landscape window can be narrow, and a portrait device can host a wide external display. The state ledger should follow logical destination and user work across these changes.

Record rejected rotation attempts as evidence too: requested orientation, reported orientation, current window bounds, device posture, and applicable product policy. That tells the team whether the platform correctly ignored a restriction, the test device has rotation locked, or the application failed to respond.

## Preserve media, camera, and sensor continuity

Media and capture flows expose resources beyond ordinary text fields. During video playback, test whether position, play or pause state, captions, selected audio track, playback speed, and full-screen intent follow the contract. Exact millisecond equality is usually unreasonable because playback advances during transition. Use an allowed tolerance defined by the product and verify that a rotation never restarts the content or creates two audio streams.

For camera screens, rotate before capture, during a pending capture, and on the review screen. Verify the saved image orientation through decoded metadata and visible presentation, not merely the preview. Confirm that controls remain reachable around cutouts and safe areas. If the camera session is restarted, the application should not silently discard an accepted capture or submit it twice.

Sensor-driven applications need a coordinate-system oracle. A device rotation can change how accelerometer or gyroscope axes map to the interface. Feed a known synthetic or recorded test sequence through the supported test seam and assert the domain result, then run a smaller device check for real integration. Testing only the rendered arrow can miss a sign inversion that appears in stored measurements.

Resource cleanup is part of state correctness. Inspect whether the old activity, view controller, camera session, player, or listener remains active after transition. Symptoms include duplicated callbacks, warm devices, audio continuing behind a new screen, and tests that pass alone but fail in a suite. Correlate lifecycle logs with one opaque test run identifier and assert a single active owner after rotation.

## Frequently Asked Questions

### Is ActivityScenario recreate the same as rotating an Android device?

No. \`recreate()\` directly tests destruction and recreation of the activity, which is excellent for restoration logic. Device rotation additionally changes orientation, dimensions, resources, and potentially layout branches. An application may pass one and fail the other. Use recreation as a fast focused test, then add device-level rotation for important journeys. For especially critical state, also test process recreation because activity recreation alone does not prove that values survive when in-memory repositories and singletons disappear.

### What state should survive an orientation change?

Preserve state that represents the user’s work, committed domain data, logical navigation, and active operations, according to the product contract. Do not mechanically preserve every visual detail. An animation frame, tooltip, or accordion may be transient, while a typed address, selected delivery method, and pending order are meaningful. Classify each item as durable domain state, restorable UI state, derived state, or transient presentation. Save the minimal source of truth and recompute derived values to avoid restoring contradictions.

### How do I test rotation without creating flaky waits?

Wait on evidence that marks each boundary. Before rotation, confirm the draft or server request exists. After rotation, wait for the expected screen identity, field, or repository state. For asynchronous operations, use a controllable test backend that signals receipt and releases its response on command. Framework idling and explicit UI expectations are preferable to arbitrary sleeps. Restore orientation in teardown even on failure. If a timeout occurs, report the last activity state, orientation, window size, and pending operation so the failure is diagnosable.

### Does responsive viewport testing replace real mobile devices?

No. Viewport changes give fast, deterministic coverage for mobile web layout and client-state behavior. They do not reproduce physical sensors, browser chrome, every virtual-keyboard behavior, safe areas, OEM customizations, fold hinges, or native lifecycle transitions. Use them heavily in pull requests, then run high-risk journeys on representative real devices or high-fidelity emulators. Choose hardware coverage from supported users and layout boundaries rather than collecting many nearly identical screen sizes.
`,
};
