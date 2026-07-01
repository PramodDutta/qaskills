import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Espresso Android Testing: The Complete 2026 Tutorial',
  description:
    'Learn Espresso Android testing with onView, withId, ViewMatchers, ViewActions, ViewAssertions, and IdlingResource. Runnable Kotlin examples for 2026.',
  date: '2026-07-01',
  category: 'Guide',
  content: `
# Espresso Android Testing: The Complete 2026 Tutorial

Espresso is Google's official UI testing framework for native Android apps, and in 2026 it remains the fastest, most reliable way to write instrumented tests that run on a real device or emulator. If you have ever fought flaky UI tests that fail because a view was not yet on screen, Espresso's biggest gift is automatic synchronization: it waits for the app to become idle before it interacts with a view, so you rarely need explicit sleeps or waits. Tests read almost like plain English through three core building blocks, ViewMatchers to find a view, ViewActions to do something to it, and ViewAssertions to verify state, all orchestrated by the \`onView\` entry point.

This tutorial is a thorough, code-first walkthrough of Espresso as it is used in modern Android projects. We cover project setup with AndroidX Test, the anatomy of an Espresso statement, matching views with \`withId\`, \`withText\`, and \`ViewMatchers\`, performing actions with \`ViewActions\`, asserting with \`ViewAssertions\`, testing RecyclerViews, handling adapter-backed data, controlling asynchronous work with \`IdlingResource\`, using Intents and Espresso-Intents, and structuring maintainable suites. Every example is real, runnable Kotlin. Espresso tests are instrumented tests, meaning they run inside an Android runtime on a device or emulator, not on the JVM, which is what gives them access to the real view hierarchy. If you are building a broader mobile strategy, pair this with our [mobile testing](/blog/mobile-testing-automation-guide) guide and the wider set of [QA skills](/skills) for AI coding agents. Let us begin.

## Setting Up Espresso in Your Android Project

Espresso ships as part of AndroidX Test. Add the dependencies to your module-level \`build.gradle\` (or \`build.gradle.kts\`) and set the instrumentation runner. Instrumented tests live under \`src/androidTest\`.

\`\`\`kotlin
// build.gradle.kts (module)
android {
    defaultConfig {
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
}

dependencies {
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.test.espresso:espresso-intents:3.6.1")
    androidTestImplementation("androidx.test.espresso:espresso-contrib:3.6.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test:rules:1.6.1")
}
\`\`\`

A tip that saves hours of flakiness: disable system animations on your test device so Espresso's idle detection stays accurate. On the device go to Developer options and set Window, Transition, and Animator scales to off, or automate it via the Gradle managed devices configuration. Animations matter because Espresso considers the app idle when the main thread message queue is empty; a running animation keeps posting frames, which can either delay your test or, worse, let Espresso act mid-transition and hit a view that is still moving. In continuous integration, always run on emulators with animations disabled at boot so results are deterministic across machines. It also helps to pin a specific emulator API level and device profile in your Gradle managed devices block, because subtle rendering differences between API levels occasionally change which view is considered visible, and reproducibility is the whole point of an automated suite.

## The Anatomy of an Espresso Statement

Almost every Espresso interaction follows one pattern: find a view, then either act on it or assert on it. The entry point is \`onView(matcher)\`, which returns a \`ViewInteraction\`. You chain \`.perform(action)\` to interact and \`.check(assertion)\` to verify.

\`\`\`kotlin
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId

// find the button by id, click it, then assert a result is displayed
onView(withId(R.id.submit_button)).perform(click())
onView(withId(R.id.success_message)).check(matches(isDisplayed()))
\`\`\`

Read it aloud: on the view with id submit_button, perform click; on the view with id success_message, check that it matches isDisplayed. That symmetry, matcher then action or assertion, is the whole framework in miniature.

## Writing Your First Espresso Test with ActivityScenario

Modern Espresso uses \`ActivityScenarioRule\` (or \`ActivityScenario\`) to launch the Activity under test. Annotate the class with \`@RunWith(AndroidJUnit4::class)\` and \`@LargeTest\`.

\`\`\`kotlin
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText

@RunWith(AndroidJUnit4::class)
@LargeTest
class LoginActivityTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(LoginActivity::class.java)

    @Test
    fun validCredentials_showWelcomeMessage() {
        onView(withId(R.id.username)).perform(typeText("alice"), closeSoftKeyboard())
        onView(withId(R.id.password)).perform(typeText("secret123"), closeSoftKeyboard())
        onView(withId(R.id.login_button)).perform(click())

        onView(withId(R.id.welcome))
            .check(matches(withText("Welcome, alice")))
    }
}
\`\`\`

\`ActivityScenarioRule\` launches the Activity before each test and closes it afterwards, giving you a clean state every time, much like isolated fixtures in other frameworks.

## Finding Views with ViewMatchers

\`ViewMatchers\` are Hamcrest matchers that locate a view in the current hierarchy. \`withId\` is the most reliable because ids are stable, but you also have \`withText\`, \`withContentDescription\`, \`withHint\`, \`isChecked\`, and structural matchers. Combine them with \`allOf\` when a single matcher is ambiguous.

\`\`\`kotlin
import org.hamcrest.Matchers.allOf
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import androidx.test.espresso.matcher.ViewMatchers.isDescendantOfA

// a button with a specific label inside a specific container
onView(
    allOf(
        withId(R.id.action_button),
        withText("Save"),
        isDescendantOfA(withId(R.id.toolbar))
    )
).perform(click())

// match by content description for an icon-only button
onView(withContentDescription("Open navigation drawer")).perform(click())
\`\`\`

When a matcher resolves to more than one view, Espresso throws an \`AmbiguousViewMatcherException\` and prints the hierarchy, which is your cue to add \`allOf\` constraints. Prefer ids and content descriptions over text so tests survive copy changes and localization.

## Performing Interactions with ViewActions

\`ViewActions\` describe user interactions. The most common are \`click\`, \`typeText\`, \`replaceText\`, \`clearText\`, \`scrollTo\`, \`swipeLeft\`, \`swipeRight\`, and \`pressBack\`. Note that \`typeText\` requires the view to be visible, so wrap it with \`scrollTo\` when the field is below the fold.

\`\`\`kotlin
import androidx.test.espresso.action.ViewActions.scrollTo
import androidx.test.espresso.action.ViewActions.replaceText
import androidx.test.espresso.action.ViewActions.clearText
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard

onView(withId(R.id.email))
    .perform(scrollTo(), replaceText("alice@example.com"), closeSoftKeyboard())

onView(withId(R.id.notes)).perform(clearText())

onView(withId(R.id.terms_checkbox)).perform(click())
\`\`\`

Multiple actions in a single \`perform\` call run in sequence, so \`perform(scrollTo(), replaceText("x"), closeSoftKeyboard())\` scrolls, replaces, then dismisses the keyboard. Chaining like this keeps tests compact and mirrors real user behavior.

## Verifying State with ViewAssertions

\`ViewAssertions\` verify the state of a view after your actions. The workhorse is \`matches(viewMatcher)\`, which asserts the found view satisfies a matcher such as \`isDisplayed\`, \`withText\`, \`isChecked\`, or \`isEnabled\`. Use \`doesNotExist()\` to assert absence.

\`\`\`kotlin
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.assertion.ViewAssertions.doesNotExist
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isChecked
import androidx.test.espresso.matcher.ViewMatchers.isEnabled
import androidx.test.espresso.matcher.ViewMatchers.withText
import org.hamcrest.Matchers.not

onView(withId(R.id.progress_bar)).check(matches(isDisplayed()))
onView(withId(R.id.remember_me)).check(matches(isChecked()))
onView(withId(R.id.submit)).check(matches(not(isEnabled())))
onView(withText("Error")).check(doesNotExist())
onView(withId(R.id.total)).check(matches(withText("Total: $42.00")))
\`\`\`

Wrapping a matcher in \`not(...)\` from Hamcrest inverts the assertion, letting you check for the negative case like a disabled button or an unchecked box.

## Testing RecyclerViews and Lists

Lists are where new Espresso users struggle, because items may be off screen and recycled. The \`espresso-contrib\` library provides \`RecyclerViewActions\` to scroll to and act on items by position or by a matcher on the item view.

\`\`\`kotlin
import androidx.test.espresso.contrib.RecyclerViewActions
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.matcher.ViewMatchers.hasDescendant
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.espresso.matcher.ViewMatchers.withId

// scroll to a specific position and click it
onView(withId(R.id.recycler))
    .perform(RecyclerViewActions.actionOnItemAtPosition<RecyclerView.ViewHolder>(10, click()))

// scroll to the item whose row contains specific text, then click it
onView(withId(R.id.recycler))
    .perform(
        RecyclerViewActions.actionOnItem<RecyclerView.ViewHolder>(
            hasDescendant(withText("Premium Plan")),
            click()
        )
    )
\`\`\`

For \`ListView\` and \`Spinner\` backed by adapters, use \`onData(matcher)\` instead of \`onView\`, because those items are not in the view hierarchy until scrolled into view. \`onData\` searches the adapter's data set directly.

## Handling Asynchronous Work with IdlingResource

Espresso synchronizes automatically with the main thread's message queue and AsyncTask, but it cannot see your custom background work, network calls, coroutines, or thread pools. When your test acts before the app finishes loading, you get flakiness. The fix is an \`IdlingResource\`, an object that tells Espresso when your app is busy versus idle so it waits.

\`\`\`kotlin
import androidx.test.espresso.idling.CountingIdlingResource

object EspressoIdlingResource {
    private const val RESOURCE = "GLOBAL"
    @JvmField
    val countingIdlingResource = CountingIdlingResource(RESOURCE)

    fun increment() = countingIdlingResource.increment()
    fun decrement() {
        if (!countingIdlingResource.isIdleNow) {
            countingIdlingResource.decrement()
        }
    }
}

// In production code, wrap async work:
fun loadData() {
    EspressoIdlingResource.increment()
    repository.fetch { result ->
        render(result)
        EspressoIdlingResource.decrement()
    }
}
\`\`\`

Register the resource in your test so Espresso knows to consult it:

\`\`\`kotlin
import androidx.test.espresso.IdlingRegistry
import org.junit.After
import org.junit.Before

@Before
fun registerIdlingResource() {
    IdlingRegistry.getInstance().register(EspressoIdlingResource.countingIdlingResource)
}

@After
fun unregisterIdlingResource() {
    IdlingRegistry.getInstance().unregister(EspressoIdlingResource.countingIdlingResource)
}
\`\`\`

While the counter is above zero the app is busy and Espresso blocks. When it returns to zero Espresso proceeds. This is the single most important technique for eliminating flaky Android UI tests. For a deeper dive on flakiness across frameworks, see our guide on how to [fix flaky tests](/blog/fix-flaky-tests-guide).

## Testing Intents with Espresso-Intents

When a button launches another Activity or fires an implicit Intent (dialer, browser, share sheet), Espresso-Intents lets you stub the response and verify the Intent was sent. Use \`IntentsTestRule\` or wrap with \`Intents.init()\` and \`Intents.release()\`.

\`\`\`kotlin
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.intent.Intents.intended
import androidx.test.espresso.intent.matcher.IntentMatchers.hasAction
import androidx.test.espresso.intent.matcher.IntentMatchers.hasData
import android.content.Intent
import org.junit.After
import org.junit.Before
import org.junit.Test

class ShareTest {
    @Before fun setUp() = Intents.init()
    @After fun tearDown() = Intents.release()

    @Test
    fun tappingCall_firesDialIntent() {
        onView(withId(R.id.call_button)).perform(click())
        intended(allOf(hasAction(Intent.ACTION_DIAL), hasData("tel:5551234")))
    }
}
\`\`\`

You can also stub outgoing Intents with \`intending(...)\` so the real Activity or app never launches, keeping tests hermetic and fast.

## Espresso Cheat Sheet: Matchers, Actions, Assertions

Keep this reference handy when writing tests. It maps the most-used APIs to their purpose.

| API | Category | What it does |
|---|---|---|
| \`withId(R.id.x)\` | Matcher | Find a view by resource id |
| \`withText("x")\` | Matcher | Find a view by exact text |
| \`withContentDescription("x")\` | Matcher | Find by accessibility description |
| \`click()\` | Action | Tap the view |
| \`typeText("x")\` | Action | Type into an editable view |
| \`replaceText("x")\` | Action | Clear then set text |
| \`scrollTo()\` | Action | Scroll the view into view |
| \`matches(isDisplayed())\` | Assertion | Assert the view is visible |
| \`matches(withText("x"))\` | Assertion | Assert the text content |
| \`doesNotExist()\` | Assertion | Assert the view is absent |

Combine any matcher with Hamcrest's \`allOf\`, \`anyOf\`, and \`not\` to build precise, resilient locators that survive UI changes.

## Structuring Maintainable Espresso Suites

At scale, raw \`onView\` calls scattered across tests become hard to maintain. Apply the same discipline you would in web testing: encapsulate screen interactions in Robot classes or Page Objects, centralize matchers, and keep assertions in the test rather than the robot. This mirrors the Page Object pattern from our [Playwright guide](/blog/playwright-e2e-complete-guide).

\`\`\`kotlin
class LoginRobot {
    fun enterUsername(value: String) = apply {
        onView(withId(R.id.username)).perform(typeText(value), closeSoftKeyboard())
    }
    fun enterPassword(value: String) = apply {
        onView(withId(R.id.password)).perform(typeText(value), closeSoftKeyboard())
    }
    fun submit() = apply { onView(withId(R.id.login_button)).perform(click()) }
}

fun login(block: LoginRobot.() -> Unit) = LoginRobot().apply(block)

// usage in a test
@Test
fun loginFlow() {
    login {
        enterUsername("alice")
        enterPassword("secret123")
        submit()
    }
    onView(withId(R.id.welcome)).check(matches(isDisplayed()))
}
\`\`\`

The Kotlin \`apply\` and receiver-lambda pattern gives your Espresso suites a fluent, readable DSL. Each robot method returns the receiver so calls chain naturally, and because assertions stay in the test rather than the robot, a single robot can serve dozens of tests with different verification goals. Keep one robot per screen, name methods after user intent rather than widget mechanics, for example \`submit()\` instead of \`clickLoginButton()\`, and your suite reads like a specification of behavior instead of a script of taps. This separation of the how (robot) from the what (test assertions) is the backbone of a suite that survives years of UI churn.

Choosing between Espresso and cross-platform tools is a real decision; the table below summarizes the trade-offs.

| Aspect | Espresso | Cross-platform (Appium/Maestro) |
|---|---|---|
| Language | Kotlin/Java | Many (JS, Python, YAML) |
| Speed | Very fast (in-process) | Slower (client-server) |
| Platforms | Android only | Android + iOS |
| Sync model | Built-in idle detection | Manual waits often needed |
| Access to app internals | Full (IdlingResource, test hooks) | Black-box only |
| Best for | Native Android team | Shared mobile QA team |

For teams shipping Android-only, Espresso's speed and synchronization win. For shared iOS and Android suites, a cross-platform tool from our [mobile testing](/blog/mobile-testing-automation-guide) guide may fit better.

## Testing Jetpack Compose Screens with Espresso Interop

Many 2026 apps mix classic Android Views with Jetpack Compose. Compose has its own testing API based on \`createAndroidComposeRule\` and semantics matchers, but you often need Espresso and Compose to cooperate in one test, for example when a Compose screen is hosted inside a View-based Activity. The Compose test rule synchronizes with Espresso's idle detection automatically, so you can interleave both APIs.

\`\`\`kotlin
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.assertIsDisplayed
import org.junit.Rule
import org.junit.Test

class ComposeCheckoutTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<CheckoutActivity>()

    @Test
    fun placingOrder_showsConfirmation() {
        // Compose-native interaction via semantics
        composeRule.onNodeWithText("Place Order").performClick()

        // A classic View shown afterwards, verified with Espresso
        onView(withId(R.id.confirmation_banner)).check(matches(isDisplayed()))

        // Back to Compose to assert the receipt node
        composeRule.onNodeWithText("Order confirmed").assertIsDisplayed()
    }
}
\`\`\`

The rule finds Compose nodes through the merged semantics tree using matchers like \`onNodeWithText\`, \`onNodeWithTag\`, and \`onNodeWithContentDescription\`. Add \`Modifier.testTag("x")\` in your composables to expose stable identifiers, the Compose equivalent of a resource id. Because both frameworks report idleness to the same synchronization mechanism, you avoid the race conditions that plague hybrid screens.

## Debugging Failing Espresso Tests

When a test fails, Espresso prints the full view hierarchy at the point of failure, which is your primary debugging tool. Read the exception type first: \`NoMatchingViewException\` means your matcher found nothing, \`AmbiguousViewMatcherException\` means it found several, and \`PerformException\` usually means the view was found but could not be acted upon, often because it was not visible or was disabled. Capturing a screenshot on failure accelerates diagnosis.

\`\`\`kotlin
import androidx.test.core.app.takeScreenshot
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.rules.TestWatcher
import org.junit.runner.Description

class ScreenshotOnFailure : TestWatcher() {
    override fun failed(e: Throwable, description: Description) {
        val bitmap = takeScreenshot()
        // save to app cache or test storage for the CI artifact upload
        val ctx = InstrumentationRegistry.getInstrumentation().targetContext
        ctx.cacheDir.resolve("\${description.methodName}.png").outputStream().use {
            bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it)
        }
    }
}
\`\`\`

Attach it as a \`@get:Rule\` alongside your \`ActivityScenarioRule\`. In CI, upload the saved screenshots as artifacts so you can see exactly what the screen looked like when the assertion failed, rather than guessing from a stack trace. Combined with disabling animations and using IdlingResources, screenshot-on-failure turns intermittent red builds into quick, actionable fixes.

## Custom ViewMatchers and ViewActions

Sometimes the built-in matchers and actions are not enough. You might need to match a custom view attribute, assert a specific tint color, or perform a gesture Espresso does not ship. Espresso is designed to be extended: a custom matcher is a Hamcrest \`TypeSafeMatcher<View>\`, and a custom action implements \`ViewAction\` with a constraint matcher, a description, and a \`perform\` body.

\`\`\`kotlin
import android.view.View
import androidx.test.espresso.UiController
import androidx.test.espresso.ViewAction
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import org.hamcrest.Matcher
import org.hamcrest.Matchers.allOf

// A custom action that sets the progress on a SeekBar
fun setProgress(value: Int): ViewAction = object : ViewAction {
    override fun getConstraints(): Matcher<View> =
        allOf(isDisplayed(), isAssignableFrom(SeekBar::class.java))

    override fun getDescription(): String = "Set SeekBar progress to \$value"

    override fun perform(uiController: UiController, view: View) {
        (view as SeekBar).progress = value
        uiController.loopMainThreadUntilIdle()
    }
}

// usage
onView(withId(R.id.volume_slider)).perform(setProgress(75))
\`\`\`

A custom matcher follows a similar shape. Override \`matchesSafely(view)\` to return your boolean condition and \`describeTo(description)\` for readable failure messages. Encapsulating domain-specific interactions this way keeps tests declarative and reusable across your suite, and it is exactly the kind of reusable pattern worth packaging as a shared [QA skill](/skills).

## Frequently Asked Questions

### What is Espresso in Android testing?

Espresso is Google's official UI testing framework for native Android apps, part of AndroidX Test. It runs instrumented tests on a device or emulator and interacts with the real view hierarchy. Its defining feature is automatic synchronization: it waits for the app's main thread to become idle before acting, which eliminates most manual sleeps and makes UI tests far more reliable than naive approaches.

### What is the difference between onView and onData in Espresso?

\`onView\` finds a view that is currently present in the view hierarchy, which is most views on screen. \`onData\` is used for AdapterView widgets like \`ListView\` and \`Spinner\`, where items are not in the hierarchy until scrolled into view. \`onData\` searches the adapter's data set to bring the target item on screen first. For modern \`RecyclerView\`, use \`RecyclerViewActions\` from espresso-contrib instead.

### How do I fix flaky Espresso tests?

Most flakiness comes from Espresso acting before asynchronous work finishes. The fix is an IdlingResource: wrap background operations so the app reports busy versus idle, then register the resource with \`IdlingRegistry\` in your test. Also disable system animations on the test device, prefer stable id matchers over text, and avoid \`Thread.sleep\`. These steps let Espresso's built-in synchronization do its job reliably.

### What is an IdlingResource and when do I need one?

An IdlingResource tells Espresso whether your app is busy or idle for work it cannot see automatically, such as network calls, coroutines, or custom thread pools. When you need one, use \`CountingIdlingResource\`: increment before async work starts and decrement when it completes. While the counter is above zero Espresso waits. Without it, tests may act on stale UI and fail intermittently.

### Are Espresso tests unit tests or instrumented tests?

Espresso tests are instrumented tests. They run inside an Android runtime on a physical device or emulator, under \`src/androidTest\`, using \`AndroidJUnitRunner\`. This is different from local unit tests that run on the JVM under \`src/test\`. Instrumented execution is what gives Espresso access to the real view hierarchy, resources, and Activity lifecycle, which is required for genuine UI testing.

### How do I test navigation between activities with Espresso?

Use Espresso-Intents. Call \`Intents.init()\` in setup and \`Intents.release()\` in teardown, perform the action that triggers navigation, then assert with \`intended(...)\` combined with matchers like \`hasComponent\`, \`hasAction\`, or \`hasData\`. You can also stub responses with \`intending(...)\` so external apps never actually launch, keeping tests hermetic. This verifies the correct Intent was fired without depending on the destination screen.

### Can I run Espresso tests in a CI pipeline?

Yes. Run them on emulators in CI using Gradle managed devices or a hosted device farm. Use the command \`./gradlew connectedAndroidTest\` to execute instrumented tests against a connected device or emulator. Disable animations, allocate enough emulator memory, and shard tests across parallel emulators for speed. Because Espresso synchronizes automatically, its tests are more CI-stable than many alternatives when IdlingResources are configured correctly.

## Conclusion

Espresso rewards a small amount of discipline with fast, dependable Android UI tests. Master the core rhythm, match a view, perform an action, check an assertion, and you can express almost any user flow. Add \`RecyclerViewActions\` for lists, IdlingResources for asynchronous work, and Espresso-Intents for navigation, then structure everything behind Robot classes so your suite scales cleanly. The framework's built-in synchronization is the reason well-written Espresso tests stay green while other frameworks flake.

Take the next step: browse curated [QA skills](/skills) for AI coding agents that package Espresso and mobile testing patterns ready to use, and combine this tutorial with our [mobile testing](/blog/mobile-testing-automation-guide) guide. Head to the [skills directory](/skills) and start building an Android test suite your team can trust on every release.
`,
};
