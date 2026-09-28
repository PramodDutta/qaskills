import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Kaspresso Android UI Testing Guide',
  description: 'Learn kaspresso setup, flaky-safety tuning, Kautomator, Allure, CI, and failure triage so Android UI tests stay readable and stable for QA teams.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# Kaspresso Android UI Testing Guide

Kaspresso is an actively maintained Android UI testing framework from KasperskyLab that wraps Espresso and UI Automator with a Kotlin DSL, page objects, step logging, flaky-safety interceptors, device helpers, screenshot and video artifacts, and optional Allure reporting. The current GitHub releases page shows 1.6.1 as the latest release, published on April 8, 2026. That matters because Kaspresso is not an abandoned Espresso wrapper: recent releases include interceptor switching, selector improvements, video step overlays, permission dialog changes, and fixes around flaky-safety restoration.

Use Kaspresso when your Android UI suite already depends on Espresso, or when you want Espresso-level app synchronization but need readable test stories, controlled retries, Android system interactions, and diagnostic output that an AI coding agent can inspect without replaying a whole device session. If your team is still deciding between raw Espresso and a higher-level DSL, read this together with [Espresso Android Testing Guide](/blog/espresso-android-testing-guide) and the newer [Espresso Android UI Testing Tutorial 2026](/blog/espresso-android-ui-testing-tutorial-2026).

The official project describes Kaspresso as based on Espresso and UI Automator, with Kakao-style readable wrappers, Kautomator for UI Automator coverage, built-in flaky protection, ADB support through AdbServer, Allure support, Compose support, screenshot testing, Robolectric support, and artifact pulling. Official pages verified for this guide include https://github.com/KasperskyLab/Kaspresso, https://github.com/KasperskyLab/Kaspresso/releases, and https://kasperskylab.github.io/Kaspresso/.

## Current Status And What 1.6.1 Changes

Kaspresso 1.6.1 is a small but meaningful release for teams that treat UI tests as CI assets rather than local demos. The release notes list new functionality for video resolution override, a permission dialog "do not ask again" deny button, logical OR in selector declarations, showing a step on video, easier interceptor switching, and Compose documentation metadata. The bug fixes include restoring interceptors on exception in flaky safety and an R class crash fix.

That set of changes tells you where the framework is evolving: not toward replacing Espresso, but toward making Android UI tests more observable and less fragile. For QA engineers using Claude Code, Cursor, Copilot, or another AI coding agent, the most useful part is not the syntax sugar. It is the structured evidence Kaspresso can produce: step names, screenshots, logs, hierarchy dumps, video, and failure-specific context.

| Area | Current fact to plan around | Practical impact |
|---|---|---|
| Maintenance | Latest release is 1.6.1 from April 8, 2026 | Safe to evaluate for modern Android UI suites, but still verify compatibility with your Android Gradle Plugin and Kotlin versions |
| Foundation | Built on Espresso and UI Automator | You still need solid Android test fundamentals, idling resources, stable selectors, and device strategy |
| DSL | Uses Kakao-based screen objects and Kautomator wrappers | Tests become easier to read and easier for agents to modify in small patches |
| Stability | Default behavior interceptors retry, scroll, and handle system dialogs | Reduces false failures, but can hide real timing bugs if overused |
| Artifacts | Supports logs, screenshots, video, Allure, and automatic artifact pulling | CI failures become diagnosable without rerunning locally |

What people get wrong: they treat Kaspresso as a magic flake eraser. It is better to think of it as a disciplined observation layer around Espresso and UI Automator. If the app never exposes a stable loaded state, if RecyclerView items have weak matchers, or if the test data setup races the UI, Kaspresso can make the failure easier to survive and diagnose, but it should not be used to paper over unknown application behavior forever.

## Install Kaspresso With Gradle

Kaspresso artifacts are published under \`com.kaspersky.android-components\`. The README shows \`kaspresso\`, \`kaspresso-allure-support\`, and \`kaspresso-compose-support\` as the main Android test dependencies. Use the concrete version you have validated, not a floating placeholder. For this article, 1.6.1 is the version verified from the official release page.

\`\`\`kotlin
// app/build.gradle.kts
plugins {
    id("com.android.application")
    kotlin("android")
}

android {
    namespace = "com.example.shop"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.example.shop"
        minSdk = 23
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    testOptions {
        animationsDisabled = true
    }
}

dependencies {
    androidTestImplementation("com.kaspersky.android-components:kaspresso:1.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
}
\`\`\`

For Allure reports, switch the runner and add the support artifact. The official Allure page shows \`com.kaspersky.kaspresso.runner.KaspressoRunner\` plus \`kaspresso-allure-support\`, then enables reporting with \`Kaspresso.Builder.withForcedAllureSupport()\`.

\`\`\`kotlin
// app/build.gradle.kts
android {
    defaultConfig {
        testInstrumentationRunner = "com.kaspersky.kaspresso.runner.KaspressoRunner"
    }
}

dependencies {
    androidTestImplementation("com.kaspersky.android-components:kaspresso:1.6.1")
    androidTestImplementation("com.kaspersky.android-components:kaspresso-allure-support:1.6.1")
}
\`\`\`

Keep dependency setup boring. Put Kaspresso only in \`androidTestImplementation\`, keep JVM unit tests separate, and make the version visible in your dependency catalog if the app already uses one. Agents are much safer at upgrading a version in \`libs.versions.toml\` than hunting scattered literals across Gradle files.

## Build Your First Useful Test Shape

A Kaspresso test should read like a short investigation report: preconditions, named user action, assertion, and cleanup. The framework gives you \`TestCase\`, \`beforeTest\`, \`afterTest\`, \`run\`, \`step\`, and \`scenario\` to make that shape explicit. A raw Espresso test often becomes a line-by-line interaction script. A Kaspresso test should become a user story with evidence boundaries.

\`\`\`kotlin
package com.example.shop

import androidx.test.ext.junit.rules.ActivityScenarioRule
import com.kaspersky.kaspresso.testcases.api.testcase.TestCase
import io.github.kakaocup.kakao.screen.Screen
import io.github.kakaocup.kakao.text.KButton
import io.github.kakaocup.kakao.text.KTextView
import org.junit.Rule
import org.junit.Test

class CheckoutSmokeTest : TestCase() {
    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun checkoutSummaryShowsTotalBeforePayment() = run {
        step("Open checkout") {
            CatalogScreen.checkoutButton {
                isVisible()
                click()
            }
        }

        step("Verify checkout summary") {
            CheckoutScreen.title.hasText("Checkout")
            CheckoutScreen.totalLabel {
                isVisible()
                containsText("Total")
            }
        }
    }
}

object CatalogScreen : Screen<CatalogScreen>() {
    val checkoutButton = KButton { withId(R.id.checkout_button) }
}

object CheckoutScreen : Screen<CheckoutScreen>() {
    val title = KTextView { withId(R.id.checkout_title) }
    val totalLabel = KTextView { withId(R.id.checkout_total) }
}
\`\`\`

This is the smallest Kaspresso style that pays off in CI. The screen objects isolate selectors, step names give readable logs, and assertions verify meaningful UI state rather than only checking that a click did not crash. When an AI coding agent extends this test, it has obvious insertion points: add a screen object field, add a step, or add an assertion.

## Design Screen Objects For Agent Edits

Screen objects are where Kaspresso becomes maintainable. The goal is not to hide every detail behind helper methods. The goal is to keep selectors stable and expressive, so test files remain readable. If you bury all actions in methods named \`completeCheckout()\`, you make failure diagnosis harder because the test says less about what the user did.

| Selector style | Use it when | Risk |
|---|---|---|
| \`withId(R.id.pay_button)\` | App-owned view with stable resource ID | Best default for classic Views |
| \`withText("Pay")\` | Static copy is the real contract | Breaks with localization or copy experiments |
| \`withContentDescription("Close")\` | Icon button or accessibility label is the contract | Weak if designers reuse the same label |
| Combined matchers | Repeated rows, duplicate buttons, scoped assertions | Requires care so failure output stays readable |
| Kautomator selector | System UI, permission dialog, other app, launcher | Slower and broader than app-owned Espresso selectors |

Prefer many small screen objects over a massive global object. A checkout screen, login screen, and settings screen should live near their tests or in a shared \`screens\` package. If the app has a design system with reusable components, create component objects only when several tests repeat the same selector pattern.

\`\`\`kotlin
package com.example.shop.screens

import com.example.shop.R
import io.github.kakaocup.kakao.edit.KEditText
import io.github.kakaocup.kakao.screen.Screen
import io.github.kakaocup.kakao.text.KButton
import io.github.kakaocup.kakao.text.KTextView

object LoginScreen : Screen<LoginScreen>() {
    val emailField = KEditText { withId(R.id.login_email_input) }
    val passwordField = KEditText { withId(R.id.login_password_input) }
    val submitButton = KButton { withId(R.id.login_submit_button) }
    val errorMessage = KTextView { withId(R.id.login_error_message) }
}
\`\`\`

The important design rule: screen objects should expose UI elements, not business promises. \`submitButton\` is better than \`loginSuccessfully\`. Let the test own the user intention and assertions. That makes reviews sharper because a changed assertion is visible in the test, not hidden inside an innocently named helper.

## Use Steps And Scenarios Without Hiding The Test

The official tutorial shows \`step()\` as the readable unit inside \`run {}\`, and \`Scenario\` as a way to combine repeated steps. Use steps for every visible phase of a test. Use scenarios only for a repeated journey that genuinely has the same meaning in multiple tests.

\`\`\`kotlin
package com.example.shop.scenarios

import com.example.shop.screens.LoginScreen
import com.example.shop.screens.ProfileScreen
import com.kaspersky.kaspresso.testcases.api.scenario.Scenario
import com.kaspersky.kaspresso.testcases.core.testcontext.TestContext

class LoginScenario(
    private val email: String,
    private val password: String
) : Scenario() {
    override val steps: TestContext<Unit>.() -> Unit = {
        step("Enter credentials") {
            LoginScreen.emailField.replaceText(email)
            LoginScreen.passwordField.replaceText(password)
        }

        step("Submit login form") {
            LoginScreen.submitButton {
                isVisible()
                click()
            }
        }

        step("Confirm profile opens") {
            ProfileScreen.header.hasText("Your profile")
        }
    }
}
\`\`\`

Good scenario boundaries usually match a reusable product capability: log in, grant onboarding permissions, create a draft item, or seed a cart. Bad scenario boundaries match implementation convenience: tap these six controls because several tests happen to do that today. The difference matters when an agent changes tests. Product-shaped scenarios survive UI evolution. Convenience-shaped scenarios accumulate surprising side effects.

## Tune Flaky Safety Instead Of Sleeping

Kaspresso includes behavior interceptors that retry actions and assertions, scroll when a view is not visible, and handle blocking system dialogs. The configuration docs state that \`BaseTestCase\`, \`TestCase\`, \`BaseTestCaseRule\`, and \`TestCaseRule\` use the default customized Kaspresso builder. The same docs describe default flaky handling around Kakao and Kautomator operations, with retry behavior that can rescue transient Espresso and UI Automator failures.

The right way to use this is targeted waiting, not global waiting. If a receipt appears after a real network-backed operation, assert the receipt with a longer \`flakySafely\` window and keep the rest of the test strict. Do not add \`Thread.sleep(10000)\` after every button click. Sleep makes local runs slower, cloud runs more expensive, and failure evidence less precise.

\`\`\`kotlin
package com.example.shop

import androidx.test.espresso.assertion.ViewAssertions
import androidx.test.espresso.matcher.ViewMatchers
import com.example.shop.screens.ReceiptScreen
import com.kaspersky.kaspresso.testcases.api.testcase.TestCase
import org.hamcrest.Matchers
import org.junit.Test

class ReceiptTest : TestCase() {
    @Test
    fun receiptAppearsAfterSuccessfulPayment() = run {
        step("Wait for receipt number") {
            ReceiptScreen.receiptNumber {
                flakySafely(timeoutMs = 15_000, intervalMs = 500) {
                    isVisible()
                    assert {
                        ViewAssertions.matches(
                            ViewMatchers.withContentDescription(Matchers.matchesPattern("^Receipt [0-9]{6}$"))
                        )
                    }
                }
            }
        }
    }
}
\`\`\`

The regex is anchored and the assertion checks the actual side effect: a receipt identifier exists. It is better than checking a generic success screen because checkout bugs often leave the UI on a pleasant-looking state without producing a durable order.

## Understand Interceptors Before Customizing Them

Kaspresso behavior interceptors sit around Kakao and Kautomator actions. The official configuration page warns that custom Kakao or Kautomator interceptors can prevent Kaspresso interceptors from working, especially when \`isOverride\` is set. That warning is easy to miss. It is the source of many "Kaspresso is flaky in my project" reports.

| Interceptor provider | Default job | Symptom if disabled too early |
|---|---|---|
| \`FlakySafetyProvider\` | Retry transient action and assertion failures | Immediate failures on short UI delays |
| \`SystemDialogSafetyProvider\` | Dismiss or handle blocking system dialogs | Permission, crash, or system prompts block the run |
| \`AutoScrollProvider\` | Scroll parent containers to locate elements | Off-screen elements fail even when present |
| \`ElementLoaderProvider\` | Reload stale Kautomator elements | System UI tests fail after view hierarchy refreshes |
| Step watchers | Log and report step lifecycle events | CI artifacts lose narrative structure |

Customize interceptors when you have a named policy. For example, you may want to disable automatic system dialog handling in a permission test because the dialog is the thing under test. You may want to add an interceptor that captures a business-specific screenshot after every payment assertion. You should not customize interceptors merely because a test failed twice.

\`\`\`kotlin
package com.example.shop

import com.kaspersky.kaspresso.kaspresso.Kaspresso
import com.kaspersky.kaspresso.testcases.api.testcase.TestCase

abstract class ShopUiTestCase : TestCase(
    kaspressoBuilder = Kaspresso.Builder.simple {
        beforeEachTest {
            testLogger.i("Starting shop UI test")
        }
        afterEachTest {
            testLogger.i("Finished shop UI test")
        }
    }
)
\`\`\`

This base class is deliberately small. It adds shared logging without weakening assertions or changing retry behavior. If you later change flaky-safety parameters, put the reason in the commit message and keep the blast radius visible.

## Use Kautomator For System UI And Cross App Flows

Espresso is scoped to your app process. UI Automator can interact with system UI and other apps. Kaspresso includes Kautomator, a Kotlin DSL over UI Automator, so tests can operate outside your app when needed. Official docs describe Kautomator as a wrapper over UI Automator with interceptors and acceleration settings, and recommend it over using raw \`UiDevice\` directly in most test code.

Good Kautomator use cases include permission dialogs, notification shade checks, Android settings pages, launcher interactions, and intents that leave your app. Poor use cases include ordinary app buttons that already have resource IDs. Stay inside Espresso where you can, cross the process boundary when you must.

\`\`\`kotlin
package com.example.shop

import com.kaspersky.kaspresso.testcases.api.testcase.TestCase
import com.kaspersky.kaspresso.testcases.core.testcontext.TestContext
import com.kaspersky.components.kautomator.component.common.views.UiView
import com.kaspersky.components.kautomator.screen.UiScreen
import org.junit.Test

class NotificationPermissionTest : TestCase() {
    @Test
    fun denyNotificationPermissionWithSystemDialog() = run {
        step("Request notifications") {
            NotificationsScreen.enableButton.click()
        }

        step("Deny Android permission dialog") {
            SystemPermissionScreen.denyButton {
                isDisplayed()
                click()
            }
        }
    }
}

object SystemPermissionScreen : UiScreen<SystemPermissionScreen>() {
    val denyButton = UiView { withText("Don\\'t allow") }
}
\`\`\`

If your test has to execute ADB commands from inside the test, Kaspresso documents AdbServer for that path. Use it sparingly. ADB from a test is powerful for toggling network, pushing files, or collecting device state, but it also ties the test to a runner environment. In Firebase Test Lab, for example, you should not assume that every local AdbServer pattern works the same way on hosted devices.

## Add Allure Only When You Will Read It

Allure support is useful when test reports are reviewed by humans or attached to release gates. The official Kaspresso Allure docs say support was added in 1.3.0 and list interceptors for video recording and view hierarchy dumps. With 1.6.1 adding video step overlays, Allure becomes more useful for remote diagnosis because the failure report can connect step names to visual evidence.

\`\`\`kotlin
package com.example.shop

import com.kaspersky.kaspresso.kaspresso.Kaspresso
import com.kaspersky.kaspresso.testcases.api.testcase.TestCase

abstract class AllureUiTestCase : TestCase(
    kaspressoBuilder = Kaspresso.Builder.withForcedAllureSupport()
)
\`\`\`

Do not enable every artifact forever without a retention plan. Videos and hierarchy dumps can be expensive to store and noisy to browse. A practical policy is: keep full artifacts on nightly and release-candidate runs, keep screenshots and logs on pull requests, and upload full video only for failures if your runner supports filtering after the run.

## Wire Kaspresso Into Local And CI Runs

Kaspresso tests run as Android instrumentation tests. Locally, keep a single command that builds and runs the debug variant, then let developers filter at the AndroidJUnitRunner level or from Android Studio while debugging.

\`\`\`bash
./gradlew :app:connectedDebugAndroidTest
\`\`\`

For pull requests, use a narrow smoke suite. For scheduled runs, expand to the full matrix. The example below uses current GitHub Actions major versions, installs JDK 21, builds app and test APKs, and uploads the connected test report. It assumes you run against a connected emulator that your workflow prepares in another reusable step or self-hosted runner.

\`\`\`yaml
name: android-ui

on:
  pull_request:
  workflow_dispatch:

jobs:
  kaspresso:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: "21"

      - name: Build debug and androidTest APKs
        run: ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest

      - name: Run connected Kaspresso suite
        run: ./gradlew :app:connectedDebugAndroidTest

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: kaspresso-report-\${{ github.run_id }}
          path: app/build/reports/androidTests/connected
\`\`\`

If your CI runner cannot host reliable emulators, build APKs in CI and run them on a device farm. Kaspresso remains the test framework either way. Device-farm strategy is a separate decision about hardware, queue time, and artifact retrieval.

## Diagnose A Realistic Failure Mode

Failure mode: a checkout test passes locally but fails in CI at "Verify checkout summary" with a Kaspresso retry timeout. The screenshot shows the checkout title, but the total label is missing. The test uses \`hasText("Total")\` on \`R.id.checkout_total\`.

Diagnosis path:

| Evidence | Question to ask | Likely action |
|---|---|---|
| Step log shows open checkout succeeded | Did navigation complete or only start? | Add assertion for stable checkout container before checking child content |
| Screenshot shows title but not total | Is data still loading? | Assert a loading spinner disappears, or expose an idling resource for checkout summary state |
| Local run passes quickly | Is CI using slower network or seeded backend? | Move test data setup into deterministic fixture path |
| Failure appears only on one API level | Is layout different or text hidden? | Inspect hierarchy dump and add responsive selector scope |
| Retrying whole test passes | Is there a real race? | Fix app synchronization instead of increasing global timeout |

The fix is usually not "make Kaspresso wait longer everywhere." The fix is to define the state the user actually needs: summary loaded, total visible, and total tied to the cart state. A stable test might first assert the checkout container is visible, then wait for the loading view to disappear, then assert the total text matches an anchored money format and the pay button is enabled.

## Agent Workflow For Maintaining Kaspresso Tests

AI coding agents are good at localized test maintenance when the suite is structured. Give them screen objects, scenario classes, and named steps. Ask them to modify the smallest unit that matches the product change. Keep failure artifacts in CI so the agent can inspect logs and screenshots before changing selectors.

| Agent task | Good prompt | Bad prompt |
|---|---|---|
| Add coverage | "Add a Kaspresso test for the empty cart checkout path using existing CartScreen selectors" | "Write more UI tests" |
| Fix failure | "Use the attached Kaspresso log and screenshot to diagnose why CheckoutSmokeTest fails on API 35" | "Make this test pass" |
| Refactor | "Extract repeated login steps into a Scenario without changing assertions" | "Clean up the suite" |
| Update UI | "The pay button id changed to pay_primary_button. Update selectors only" | "Fix checkout tests" |

Once in a while, a ready-made QA skill installed from qaskills.sh with the qaskills CLI can give an agent a repeatable playbook for these edits. The useful part is not replacing your test strategy, it is encoding team conventions such as where screens live, which artifacts to inspect first, and what not to weaken.

## Decision Guide: Kaspresso Or Plain Espresso

Choose plain Espresso when you have a small suite, minimal cross-app interaction, and a team that is comfortable reading raw matchers. Choose Kaspresso when test readability, failure artifacts, Android system interactions, and retry policy are starting to matter. Choose Kaspresso carefully if your app is mostly Compose: verify the Compose support against your exact Compose version, because Compose semantics and testing APIs move independently from classic Views.

Kaspresso is especially useful for medium to large Android apps where QA engineers need to review CI failures, not just developers. A step-named failure with a screenshot and hierarchy dump is easier to triage in a release channel than a raw Espresso stack trace.

## Frequently Asked Questions

### Is Kaspresso a replacement for Espresso?

No. Kaspresso is built on top of Espresso and UI Automator. You still rely on Espresso synchronization, AndroidJUnitRunner behavior, app selectors, and meaningful assertions. Kaspresso adds a Kotlin DSL, screen objects, step and scenario structure, flaky-safety interceptors, Kautomator wrappers, device helpers, and reporting. Treat it as an operational layer for making Android UI tests readable and diagnosable, not as a different testing model.

### Does Kaspresso remove flaky Android UI tests?

It reduces common framework and device flakiness by retrying actions and assertions, scrolling to off-screen elements, handling some system dialogs, and improving logs. It does not fix unclear app state, weak selectors, uncontrolled network data, missing idling resources, or assertions that check the wrong thing. The healthiest pattern is targeted \`flakySafely\` around known asynchronous UI states plus app fixes for repeatable races.

### Should I enable Allure for every Kaspresso run?

Enable Allure when people will actually inspect the report, especially for nightly, release-candidate, and flaky-test investigation runs. For every pull request, full video and hierarchy artifacts may be too noisy or heavy. A balanced setup uploads logs and screenshots always, keeps Allure reports for scheduled or failure-focused runs, and uses retention rules so old artifacts do not quietly become a storage problem.

### Can Kaspresso tests run on Firebase Test Lab?

Yes, Kaspresso tests are Android instrumentation tests, so the app APK and test APK can run anywhere instrumentation tests run. The caveat is environment-specific features. If your test depends on local AdbServer behavior, validate it on hosted devices before relying on it in release gates. Keep cloud runs focused on instrumentation-compatible flows, collect artifacts, and separate local-only device-control tests when needed.
`,
};
