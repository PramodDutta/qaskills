import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Espresso Android UI Testing Tutorial (2026)",
  description: "Espresso Android UI testing tutorial for 2026: onView, withId, ViewActions, ViewMatchers, IdlingResource synchronization, RecyclerView, and Compose interop.",
  date: "2026-06-15",
  category: "Mobile",
  content: `# Espresso Android UI Testing Tutorial

Espresso is Google's official UI testing framework for native Android, part of AndroidX Test. You write instrumentation tests that run on a device or emulator and interact with your app the way a user does — finding a view, performing an action, and checking a result. Espresso's signature feature is **automatic synchronization with the UI thread and message queue**: it waits until the app is idle before each interaction, so you do not sprinkle \`Thread.sleep()\` through your tests. Its core API reads as one fluent line: \`onView(matcher).perform(action).check(assertion)\`.

This tutorial covers setup, \`onView\`/\`withId\`, \`ViewActions\` and \`ViewMatchers\`, assertions with \`ViewAssertions\`, handling RecyclerView and lists, \`IdlingResource\` for async work, running in CI, and interoperating with Jetpack Compose. For ready-to-install QA skills for AI coding agents, browse the [QASkills directory](/skills).

## How Espresso works

Espresso runs as an instrumentation test (\`androidTest\` source set) inside the same process as your app. Before every action and assertion, it blocks until the main thread's message queue is empty and there are no pending UI operations. This built-in idling is why Espresso tests are far less flaky than naive UI automation — you rarely add manual waits, and when you do need to wait on background work, you register an \`IdlingResource\` instead of sleeping.

The framework has three building blocks:

- **\`ViewMatchers\`** — find a view (\`withId\`, \`withText\`, \`isDisplayed\`, …)
- **\`ViewActions\`** — do something to it (\`click\`, \`typeText\`, \`scrollTo\`, …)
- **\`ViewAssertions\`** — verify state (\`matches\`, \`doesNotExist\`, …)

Everything composes into the entry point \`onView(...)\`.

## Setup and dependencies

Add the AndroidX Test and Espresso dependencies to your module \`build.gradle\` and set the instrumentation runner:

\`\`\`groovy
android {
  defaultConfig {
    testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
  }
}

dependencies {
  androidTestImplementation "androidx.test.ext:junit:1.2.1"
  androidTestImplementation "androidx.test.espresso:espresso-core:3.6.1"
  androidTestImplementation "androidx.test.espresso:espresso-contrib:3.6.1"   // RecyclerView, etc.
  androidTestImplementation "androidx.test.espresso:espresso-idling-resource:3.6.1"
}
\`\`\`

Before running, **disable system animations** on the test device (Settings → Developer options → Window/Transition/Animator scale = off). Animations make Espresso throw because the UI is never truly idle. CI emulators should disable them via ADB.

## Your first test: onView, withId, and ViewActions

A test class is annotated with \`@RunWith(AndroidJUnit4::class)\` and uses an activity rule to launch the screen under test. The modern approach uses \`ActivityScenarioRule\`:

\`\`\`kotlin
@RunWith(AndroidJUnit4::class)
class LoginActivityTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(LoginActivity::class.java)

    @Test
    fun validLogin_showsDashboard() {
        onView(withId(R.id.email))
            .perform(typeText("user@example.com"), closeSoftKeyboard())

        onView(withId(R.id.password))
            .perform(typeText("hunter2"), closeSoftKeyboard())

        onView(withId(R.id.loginButton)).perform(click())

        onView(withId(R.id.welcomeMessage))
            .check(matches(isDisplayed()))
            .check(matches(withText("Welcome back")))
    }
}
\`\`\`

Read it left to right: \`onView(withId(...))\` locates the view, \`.perform(...)\` runs one or more actions, \`.check(...)\` asserts. \`closeSoftKeyboard()\` is a small but important action — a covering keyboard can hide the button you tap next.

## ViewMatchers: finding the right view

\`withId\` is the most reliable matcher because IDs are stable. Other common matchers:

\`\`\`kotlin
onView(withId(R.id.title))                       // by view ID
onView(withText("Submit"))                       // by exact text
onView(withText(R.string.submit))                // by string resource
onView(withContentDescription("Profile photo")) // by accessibility description
onView(withHint("Search"))                       // by EditText hint
onView(isDisplayed())                            // any currently visible view
\`\`\`

When several views match (a common cause of \`AmbiguousViewMatcherException\`), combine matchers with \`allOf\`:

\`\`\`kotlin
import static androidx.test.espresso.matcher.ViewMatchers.*;
import static org.hamcrest.Matchers.*;

onView(allOf(withId(R.id.deleteButton),
             hasSibling(withText("Old item")),
             isDisplayed()))
    .perform(click())
\`\`\`

Espresso matchers are Hamcrest matchers, so \`allOf\`, \`anyOf\`, and \`not(...)\` all work — which is also why a basic grasp of Hamcrest pays off across Java/Kotlin testing.

## ViewAssertions: checking state

\`.check()\` takes a \`ViewAssertion\`. The two you use constantly:

\`\`\`kotlin
// matches: the view exists and satisfies a matcher
onView(withId(R.id.cart)).check(matches(withText("3 items")))
onView(withId(R.id.error)).check(matches(not(isDisplayed())))

// doesNotExist: the view is absent from the hierarchy
onView(withId(R.id.spinner)).check(doesNotExist())
\`\`\`

Be precise about the difference between "not displayed" (in the tree but invisible) and "does not exist" (absent). Asserting \`doesNotExist()\` when the view is merely hidden — or vice versa — is a frequent source of misleading passes and failures.

## RecyclerView and lists

Lists are special because items are recycled and may be off-screen. Use \`RecyclerViewActions\` from \`espresso-contrib\` to scroll to and act on items:

\`\`\`kotlin
import androidx.test.espresso.contrib.RecyclerViewActions

// Scroll to an item by position, then click it
onView(withId(R.id.recycler))
    .perform(RecyclerViewActions.actionOnItemAtPosition<RecyclerView.ViewHolder>(20, click()))

// Scroll to the item whose text matches, then click a child within it
onView(withId(R.id.recycler))
    .perform(RecyclerViewActions.scrollTo<RecyclerView.ViewHolder>(hasDescendant(withText("Settings"))))
onView(allOf(withId(R.id.toggle), hasSibling(withText("Settings")))).perform(click())
\`\`\`

Do not try to match a list item with a plain \`onView\` if it might be off-screen — it will not be in the hierarchy until scrolled into view. \`RecyclerViewActions\` handles the scroll for you.

## IdlingResource: synchronizing with async work

Espresso idles on the **main thread**, but it cannot see work on your own background threads, custom executors, or some networking stacks. If your screen loads data asynchronously, Espresso may assert before the data arrives. The correct fix is an \`IdlingResource\`, which tells Espresso "the app is still busy — keep waiting."

The simplest implementation wraps a counter you increment when work starts and decrement when it finishes:

\`\`\`kotlin
object EspressoIdlingResource {
    private const val RESOURCE = "GLOBAL"
    @JvmField
    val countingIdlingResource = CountingIdlingResource(RESOURCE)

    fun increment() = countingIdlingResource.increment()
    fun decrement() {
        if (!countingIdlingResource.isIdleNow) countingIdlingResource.decrement()
    }
}
\`\`\`

Wrap your async operations in production code (guarded so it is a no-op in release builds), then register it in the test:

\`\`\`kotlin
@Before
fun registerIdling() {
    IdlingRegistry.getInstance().register(EspressoIdlingResource.countingIdlingResource)
}

@After
fun unregisterIdling() {
    IdlingRegistry.getInstance().unregister(EspressoIdlingResource.countingIdlingResource)
}
\`\`\`

Now Espresso automatically blocks until your counter returns to zero — no \`Thread.sleep()\`. For long-polling or repeated checks where a counter does not fit, implement the \`IdlingResource\` interface directly and report idle state from a callback. Avoid sleeps entirely; they are slow and still flaky. More synchronization patterns are covered on the [QASkills blog](/blog), and you can compare Espresso against other mobile frameworks on [/compare](/compare).

### IdlingResource alternatives

Two AndroidX helpers cover common async sources without a hand-rolled counter. \`IdlingThreadPoolExecutor\` and \`IdlingScheduledThreadPoolExecutor\` wrap your executors so Espresso tracks every task they run. For \`OkHttp\`, the \`OkHttp3IdlingResource\` from the test-idling library registers against the dispatcher and idles while requests are in flight. Prefer these typed helpers when they fit, and keep \`IdlingResource\` registration scoped to the test (\`@Before\`/\`@After\`) so a leaked resource never stalls an unrelated test.

## Custom view actions and matchers

Espresso's built-in actions cover most needs, but occasionally you must drive a custom view or match on a property the library does not expose. You write a \`ViewAction\` by implementing the interface — \`getConstraints()\` declares when the action is valid, \`getDescription()\` feeds error messages, and \`perform()\` does the work:

\`\`\`kotlin
fun setProgress(value: Int): ViewAction = object : ViewAction {
    override fun getConstraints(): Matcher<View> =
        allOf(isAssignableFrom(SeekBar::class.java), isDisplayed())

    override fun getDescription() = "Set SeekBar progress to $value"

    override fun perform(uiController: UiController, view: View) {
        (view as SeekBar).progress = value
        uiController.loopMainThreadUntilIdle()
    }
}

// Usage:
onView(withId(R.id.volume)).perform(setProgress(70))
\`\`\`

Custom matchers follow the same pattern with Hamcrest's \`TypeSafeMatcher\`:

\`\`\`kotlin
fun withProgress(expected: Int): Matcher<View> =
    object : BoundedMatcher<View, SeekBar>(SeekBar::class.java) {
        override fun describeTo(d: Description) { d.appendText("with progress $expected") }
        override fun matchesSafely(bar: SeekBar) = bar.progress == expected
    }

onView(withId(R.id.volume)).check(matches(withProgress(70)))
\`\`\`

Calling \`uiController.loopMainThreadUntilIdle()\` inside a custom action keeps Espresso's idling guarantees intact for the work you trigger.

## Test data and dependency injection

Deterministic UI tests need deterministic data. The robust approach is to inject test doubles for your data layer rather than hitting a real network. With Hilt, annotate the test with \`@HiltAndroidTest\`, add \`HiltAndroidRule\`, and swap modules with \`@TestInstallIn\` so the screen renders seeded, predictable state:

\`\`\`kotlin
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class FeedActivityTest {
    @get:Rule(order = 0) val hiltRule = HiltAndroidRule(this)
    @get:Rule(order = 1) val activityRule = ActivityScenarioRule(FeedActivity::class.java)

    @Before fun init() = hiltRule.inject()

    @Test fun showsSeededItems() {
        onView(withText("Seeded headline")).check(matches(isDisplayed()))
    }
}
\`\`\`

Controlling data at the boundary removes both flakiness (no real network latency Espresso must idle on) and false failures from backend changes, and it lets you assert empty, error, and edge-case states on demand.

## Intents and navigation

To assert that your screen fired the right intent (or to stub external activities like the camera), use Espresso-Intents:

\`\`\`kotlin
@get:Rule
val intentsRule = IntentsRule()   // initializes/releases Espresso-Intents

@Test
fun tappingShare_launchesChooser() {
    onView(withId(R.id.shareButton)).perform(click())
    intended(hasAction(Intent.ACTION_CHOOSER))
}
\`\`\`

\`intending(...)\` lets you stub a result so a test never actually leaves your app, which keeps external-activity flows deterministic.

## Running Espresso tests in CI

Run the instrumented suite with Gradle's \`connectedAndroidTest\` against a running emulator. A GitHub Actions job:

\`\`\`yaml
jobs:
  espresso:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - name: Run Espresso tests on emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          disable-animations: true
          script: ./gradlew connectedDebugAndroidTest
\`\`\`

\`disable-animations: true\` is essential — without it Espresso will throw because the UI never idles. Configure Gradle to upload the test report and any failure screenshots as artifacts so you can diagnose CI-only failures.

## Espresso and Jetpack Compose

If your app mixes Views and Compose, the Compose test API is the counterpart to Espresso and the two interoperate. Compose uses \`composeTestRule.onNodeWithText(...)\` and \`onNodeWithTag(...)\` with \`assertIsDisplayed()\` / \`performClick()\`. You can launch a screen with \`createAndroidComposeRule\` and still drive any embedded Views with \`onView(...)\`. For a screen that is entirely Compose, prefer the Compose test API; for classic View-based screens, stay with Espresso.

## Common errors and troubleshooting

| Error | Cause | Fix |
|---|---|---|
| \`NoMatchingViewException\` | Matcher found nothing (off-screen, wrong ID) | Verify the ID; scroll into view; for lists use \`RecyclerViewActions\` |
| \`AmbiguousViewMatcherException\` | More than one view matched | Narrow with \`allOf(...)\`, \`hasSibling\`, or \`isDisplayed()\` |
| \`PerformException\` on type/click | Keyboard or another view obscures target | Add \`closeSoftKeyboard()\`; \`scrollTo()\` before acting |
| Assertion fails before data loads | Background work Espresso can't see | Register a \`CountingIdlingResource\`; never \`Thread.sleep()\` |
| Tests throw about animations | System animations enabled | Disable Window/Transition/Animator scales; \`disable-animations\` in CI |

## Frequently Asked Questions

### What is the difference between onView and onData in Espresso?

\`onView\` operates on the view hierarchy and is used for almost everything, including modern \`RecyclerView\` lists (via \`RecyclerViewActions\`). \`onData\` is the legacy API for the old \`AdapterView\` widgets such as \`ListView\` and \`Spinner\`, where items may not be in the hierarchy until scrolled. New code uses \`RecyclerView\`, so you will mostly use \`onView\` plus \`RecyclerViewActions\` and rarely touch \`onData\`.

### Do I need Thread.sleep in Espresso tests?

No — \`Thread.sleep()\` is an anti-pattern in Espresso. The framework already waits for the main thread and UI to be idle before each action, and for background work you register an \`IdlingResource\` so Espresso blocks until that work completes. Sleeps make tests slow and still flaky because they guess at timing instead of synchronizing with real state.

### Why does Espresso throw an exception about animations?

Espresso requires the UI to reach an idle state, but running animations keep the message queue busy indefinitely, so it raises an error rather than acting on a moving target. Turn off the Window animation scale, Transition animation scale, and Animator duration scale in Developer options on the test device, and disable animations on CI emulators via ADB or the emulator-runner option.

### How do I test a RecyclerView item that is off-screen?

Use \`RecyclerViewActions\` from the \`espresso-contrib\` artifact. Call \`actionOnItemAtPosition(position, click())\` to scroll to and act on an item by index, or \`scrollTo(hasDescendant(withText(...)))\` to scroll to the item matching a condition, then assert on its children. A plain \`onView\` will not find the item until it has been scrolled into the hierarchy.

### Can Espresso test Jetpack Compose screens?

Compose has its own testing API (\`onNodeWithTag\`, \`onNodeWithText\`, \`assertIsDisplayed\`, \`performClick\`) that is the Compose-native equivalent of Espresso, and the two interoperate in hybrid apps. Use \`createAndroidComposeRule\` to launch a screen, drive Compose nodes with the Compose API, and drive any embedded classic Views with Espresso's \`onView\` in the same test.

### What is the best selector strategy in Espresso?

Prefer \`withId(R.id.…)\` because view IDs are the most stable identifier and survive copy and localization changes. Fall back to \`withText\` or \`withContentDescription\` only when an ID is unavailable, and combine matchers with \`allOf(...)\` plus relationships like \`hasSibling\` to disambiguate when several views match. Stable IDs keep tests resilient and avoid \`AmbiguousViewMatcherException\`.
`,
};
