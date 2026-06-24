import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Maestro Mobile UI Testing Guide: YAML Flows for Android & iOS',
  description:
    'Learn Maestro mobile testing with this hands-on tutorial. Write YAML flow files, run the CLI on Android and iOS, handle flakiness, and wire Maestro into CI.',
  date: '2026-06-24',
  category: 'Guide',
  content: `
# Maestro Mobile UI Testing Guide: YAML Flows for Android and iOS

Maestro is the mobile UI testing framework that finally makes end-to-end mobile automation feel approachable. Instead of fighting with Appium servers, WebDriver capabilities, and brittle XPath selectors, you describe what a user does in a plain YAML flow file, and Maestro runs it against an Android emulator, a physical device, or an iOS simulator. The framework was built by the team at mobile.dev specifically to address the two problems that have plagued mobile automation for a decade: setup complexity and flakiness.

This Maestro mobile testing tutorial walks you through everything from installation to advanced patterns. You will learn how Maestro flow YAML works on both Android and iOS, how to run flows from the CLI, how to use selectors that survive UI changes, how to handle conditional logic and loops, and how to plug Maestro into a continuous integration pipeline. Every example is a real, runnable YAML flow or bash command you can paste into your own project.

If you have ever written a Selenium or Appium suite, the contrast will be immediate. A Maestro flow that logs a user in, navigates to a settings screen, and asserts a value is roughly eight lines of declarative YAML. The equivalent Appium test is often a hundred lines of imperative Java or Python with explicit waits scattered throughout. Maestro builds the waiting in: every command automatically retries against the latest view hierarchy until it succeeds or times out, which eliminates the single largest source of flakiness in mobile testing. By the end of this Maestro UI testing tutorial you will be writing Maestro flow YAML for Android and iOS with confidence.

## What Is Maestro and Why It Matters

Maestro is an open-source mobile UI testing framework that uses a declarative YAML syntax to describe test flows. A "flow" is a single YAML file that lists a sequence of commands -- launch the app, tap a button, type text, assert that something is visible. Maestro reads the flow, talks to the device through the platform's own automation channels (UIAutomator on Android, XCUITest/XCTest on iOS), and executes each step.

The design philosophy centers on three ideas. First, **tolerance to flakiness**: every command retries automatically, so a button that takes 800ms to appear after an animation just works without an explicit wait. Second, **simplicity**: there is no compilation step, no driver server to manage, and no programming language to learn beyond YAML. Third, **fast iteration**: Maestro Studio and the \`maestro test\` continuous mode let you edit a flow and see it re-run instantly.

| Capability | Maestro | Appium | Espresso/XCUITest |
|---|---|---|---|
| Language | YAML | Java/Python/JS | Kotlin / Swift |
| Setup time | Minutes | Hours | Moderate |
| Cross-platform flow reuse | Yes | Partial | No |
| Built-in auto-retry | Yes | No | Partial |
| Server/driver required | No | Appium server | No |
| Best for | E2E user journeys | Legacy/complex | White-box unit-ish UI |

Maestro is not a replacement for Espresso or XCUITest unit-level UI tests that need access to app internals. It is a black-box end-to-end tool: it sees what the user sees. That makes it ideal for smoke tests, critical-path regression, and acceptance testing across both platforms with the same flow file.

## Installing Maestro and Setting Up Devices

Maestro ships as a single CLI binary. The install script handles the JVM-based runtime and puts the \`maestro\` command on your PATH. On macOS and Linux you run a one-line installer; on Windows you use WSL or the dedicated installer.

\`\`\`bash
# Install Maestro on macOS or Linux
curl -fsSL "https://get.maestro.mobile.dev" | bash

# Verify the install
maestro --version

# On macOS you can also use Homebrew
brew tap mobile-dev-inc/tap
brew install maestro
\`\`\`

For Android you need an emulator or a connected device with USB debugging enabled. Maestro discovers devices through ADB, so make sure the Android SDK platform-tools are installed.

\`\`\`bash
# List connected Android devices/emulators
adb devices

# Start an emulator from the command line
emulator -avd Pixel_7_API_34 &

# Confirm Maestro can see it
maestro test --help
\`\`\`

For iOS you need Xcode and at least one booted simulator. Maestro drives iOS simulators via Facebook's idb under the hood, which the installer sets up for you.

\`\`\`bash
# List available iOS simulators
xcrun simctl list devices available

# Boot a simulator
xcrun simctl boot "iPhone 15 Pro"
open -a Simulator
\`\`\`

Once a device is up, you are ready to write your first flow.

## Your First Maestro Flow YAML

A Maestro flow always begins with an \`appId\` declaration that tells Maestro which app to launch, followed by three dashes, then the ordered list of commands. The \`appId\` is the Android package name (\`com.example.app\`) or the iOS bundle identifier (\`com.example.app\`). Using the same flow for both platforms is possible when the app IDs match and the UI is consistent.

\`\`\`yaml
# login.yaml -- a minimal Maestro flow
appId: com.example.shop
---
- launchApp
- tapOn: "Sign In"
- tapOn:
    id: "email_field"
- inputText: "qa@example.com"
- tapOn:
    id: "password_field"
- inputText: "Sup3rSecret!"
- tapOn: "Log In"
- assertVisible: "Welcome back"
\`\`\`

Run it from the CLI:

\`\`\`bash
# Run a single flow against whatever device is connected
maestro test login.yaml

# Run against a specific device
maestro --device emulator-5554 test login.yaml
\`\`\`

Notice what is missing: there are no explicit waits, no driver setup, no try/catch around stale elements. When Maestro executes \`tapOn: "Sign In"\`, it captures the current view hierarchy, searches for a matching element, and if it is not there yet, it waits and retries automatically up to the default timeout. This auto-waiting is the heart of why Maestro flows are so stable compared to hand-written Appium.

## Selectors: Finding Elements Reliably

Maestro offers several selector strategies, and choosing the right one is the difference between a durable flow and a flaky one. The most common is matching by visible text, but you can also match by accessibility identifier, by index, by a regular expression, or by relative position to another element.

\`\`\`yaml
appId: com.example.shop
---
# Match by visible text (simplest, but localization-sensitive)
- tapOn: "Add to Cart"

# Match by accessibility id (most stable -- prefer this)
- tapOn:
    id: "checkout_button"

# Match by text with a regex
- tapOn:
    text: "Item.*in stock"

# Match the second matching element
- tapOn:
    text: "Delete"
    index: 1

# Match relative to another element
- tapOn:
    text: "Remove"
    below: "Premium Plan"
\`\`\`

The strong recommendation is to give your views stable accessibility identifiers in the app code and select by \`id\`. Text changes with copy edits and translations; an accessibility id is a contract. The table below summarizes when to reach for each selector type.

| Selector | Stability | When to use |
|---|---|---|
| \`id\` | Highest | Default choice; requires app-side ids |
| \`text\` | Medium | Quick scripts, English-only screens |
| \`text\` + regex | Medium | Dynamic strings like prices or counts |
| \`index\` | Low | Lists where order is guaranteed |
| relative (\`below\`/\`above\`) | Medium | Repeated controls in cards/rows |

If you are coming from web automation, the principles mirror the selector discipline in our [Playwright end-to-end testing guide](/blog/playwright-e2e-complete-guide): prefer semantic, intent-revealing locators over positional ones.

## Assertions, Waiting, and Conditions

Beyond tapping and typing, real flows assert state and sometimes branch on it. Maestro provides \`assertVisible\`, \`assertNotVisible\`, and conditional execution with \`runFlow\` guarded by a \`when\` clause.

\`\`\`yaml
appId: com.example.shop
---
- launchApp
- assertVisible: "Home"

# Wait for an element to appear before continuing
- extendedWaitUntil:
    visible: "Daily Deals"
    timeout: 10000

# Assert something is NOT on screen
- assertNotVisible: "Error"

# Conditional step: only dismiss the banner if it shows up
- runFlow:
    when:
      visible: "Allow notifications?"
    commands:
      - tapOn: "Don't Allow"

# Assert with an accessibility id
- assertVisible:
    id: "cart_badge"
    text: "3"
\`\`\`

The \`extendedWaitUntil\` command is your escape hatch for genuinely slow operations like a network fetch on a cold start -- it polls until the element is visible or the timeout elapses. The \`when\` guard on \`runFlow\` is how you handle non-deterministic dialogs (OS permission prompts, A/B-tested banners) without your whole flow failing when they do not appear.

## Reusable Subflows and Parameters

As a suite grows you will repeat the login sequence in dozens of flows. Maestro supports composing flows by calling one from another with \`runFlow\`, and passing variables with \`env\`. This keeps flows DRY and readable.

\`\`\`yaml
# subflows/login.yaml
appId: com.example.shop
---
- tapOn: "Sign In"
- tapOn:
    id: "email_field"
- inputText: \${EMAIL}
- tapOn:
    id: "password_field"
- inputText: \${PASSWORD}
- tapOn: "Log In"
- assertVisible: "Welcome back"
\`\`\`

\`\`\`yaml
# checkout.yaml -- composes the login subflow
appId: com.example.shop
env:
  EMAIL: "qa@example.com"
  PASSWORD: "Sup3rSecret!"
---
- launchApp
- runFlow: subflows/login.yaml
- tapOn: "Add to Cart"
- tapOn: "Checkout"
- assertVisible: "Order Confirmed"
\`\`\`

Variables interpolate with \`\${VAR}\` syntax and can come from the flow's \`env\` block, the CLI, or the environment. To override at runtime:

\`\`\`bash
# Pass variables from the CLI
maestro test -e EMAIL=other@example.com -e PASSWORD=Hunter2 checkout.yaml
\`\`\`

This is how you parameterize the same flow across staging credentials, different test accounts, or locale-specific data without duplicating YAML.

## Handling Scroll, Swipe, and Gestures

Mobile UIs depend on gestures that web tests rarely need. Maestro exposes a full gesture vocabulary: \`scroll\`, \`scrollUntilVisible\`, \`swipe\`, \`longPress\`, and \`doubleTapOn\`. The most useful in practice is \`scrollUntilVisible\`, which scrolls a container until a target element comes into view -- essential for long lists and onboarding carousels.

\`\`\`yaml
appId: com.example.shop
---
- launchApp

# Simple scroll down
- scroll

# Scroll until a specific element is on screen, then tap it
- scrollUntilVisible:
    element:
      text: "Privacy Policy"
    direction: DOWN
    timeout: 20000
- tapOn: "Privacy Policy"

# Swipe a carousel left
- swipe:
    direction: LEFT

# Long press to open a context menu
- longPress: "Saved Item"
\`\`\`

For pull-to-refresh and other custom gestures you can swipe between explicit coordinates or use the \`start\`/\`end\` point form. Because gestures also benefit from auto-retry, a \`scrollUntilVisible\` will keep scrolling and re-checking rather than failing the first time the target is off-screen.

## Running Maestro from the CLI

The \`maestro\` CLI is the command center. Beyond \`maestro test\`, the most valuable subcommands are \`maestro studio\` for interactive authoring and \`maestro test --continuous\` for watch-mode development. You can run a whole directory of flows, generate reports, and target specific devices.

\`\`\`bash
# Run every flow in a directory (alphabetical order)
maestro test flows/

# Run with a JUnit XML report for CI
maestro test --format junit --output report.xml flows/

# Continuous mode: re-runs on file save -- great while authoring
maestro test --continuous login.yaml

# Launch Maestro Studio to inspect the view hierarchy and build selectors
maestro studio

# Record a video of the run
maestro record login.yaml
\`\`\`

Maestro Studio deserves special mention. It opens a browser-based inspector showing the live device, the full view hierarchy, and an interactive command builder. You click an element and Studio writes the exact \`tapOn\` selector for you, which removes the guesswork of finding the right id. It is the fastest way to author selectors that actually match. The same iterate-fast mindset applies across the mobile testing space -- see our broader [mobile testing automation guide](/blog/mobile-testing-automation-guide) for how this fits a complete strategy.

## Running Maestro in CI/CD

Maestro shines in continuous integration because a flow is just a file and the CLI exits non-zero on failure. The two common patterns are running against an emulator inside the CI runner, or offloading to Maestro Cloud (the hosted device farm) for parallel real-device runs.

Here is a GitHub Actions workflow that boots an Android emulator and runs the suite:

\`\`\`yaml
# .github/workflows/maestro.yml
name: Maestro E2E
on: [push, pull_request]
jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Maestro
        run: |
          curl -fsSL "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH

      - name: Run on Android emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          target: google_apis
          arch: x86_64
          script: |
            adb install app-debug.apk
            maestro test --format junit --output report.xml flows/

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: maestro-report
          path: report.xml
\`\`\`

To run on the hosted device cloud instead, you upload the build and the flows and let the cloud parallelize across real devices:

\`\`\`bash
# Run flows on Maestro Cloud across real devices
maestro cloud \\
  --apiKey "$MAESTRO_CLOUD_API_KEY" \\
  app-release.apk \\
  flows/
\`\`\`

The cloud path gives you a matrix of real Android and iOS hardware without maintaining your own device lab, and it parallelizes flows so a fifty-flow suite finishes in minutes. For teams that already manage their own pipelines, the emulator approach keeps everything in-house.

## Debugging Flaky and Failing Flows

Even with auto-retry, flows fail -- usually because of a selector that matches the wrong element, a network-dependent screen, or a timing assumption. Maestro gives you several debugging levers. The \`--debug-output\` flag dumps the view hierarchy and screenshots for every step, which is the fastest way to see what Maestro actually saw when a step failed.

\`\`\`bash
# Dump screenshots + hierarchy for every step into ./debug
maestro test --debug-output ./debug login.yaml

# Inspect the live hierarchy interactively
maestro studio
\`\`\`

A few hard-won debugging rules. If a \`tapOn\` hits the wrong element, your text matched something unexpected -- switch to an \`id\` selector. If a step times out, the element genuinely was not there: add an \`extendedWaitUntil\` for slow loads, or a \`when\`-guarded \`runFlow\` if the element is optional. If a flow passes locally but fails in CI, the emulator is usually slower or a different locale -- pin the emulator config and avoid text selectors. These flakiness patterns echo the framework-agnostic advice in our [guide to fixing flaky tests](/skills); the root causes are the same on mobile and web.

## Best Practices for Maintainable Maestro Suites

A Maestro suite stays healthy when you treat flows like production code. Organize flows by feature, factor common sequences into subflows, and prefer accessibility ids everywhere. Keep each flow focused on one user journey so a failure points at one feature, not a sprawling mega-flow that is impossible to diagnose.

| Practice | Why it matters |
|---|---|
| Select by \`id\`, not text | Survives copy and translation changes |
| One journey per flow | Failures localize to one feature |
| Extract login/setup to subflows | DRY, single place to update |
| Parameterize with \`env\` | Reuse across accounts and locales |
| Guard optional dialogs with \`when\` | Permission prompts do not break runs |
| Run in CI on every PR | Catch regressions before merge |
| Pin emulator/simulator versions | Reproducible runs across machines |

Add tags to flows so you can run subsets -- a fast smoke tag on every PR and a full regression tag nightly. Tags live in the flow's config block and are selected with \`--include-tags\`:

\`\`\`yaml
appId: com.example.shop
tags:
  - smoke
  - checkout
---
- launchApp
- assertVisible: "Home"
\`\`\`

\`\`\`bash
# Run only smoke-tagged flows on every PR
maestro test --include-tags smoke flows/
\`\`\`

## Frequently Asked Questions

### Is Maestro better than Appium for mobile testing?

For end-to-end black-box testing, Maestro is dramatically simpler and more stable than Appium. It requires no driver server, uses declarative YAML, and retries every command automatically. Appium remains stronger for deeply customized interactions, older platforms, and teams that need to script in a full programming language. For most user-journey and smoke testing, Maestro wins on setup time and flakiness resistance.

### Can the same Maestro flow run on both Android and iOS?

Yes, when the app's bundle id matches across platforms and the UI is consistent, a single Maestro flow YAML file runs unchanged on both Android and iOS. Selectors based on visible text or accessibility ids work cross-platform. You only need platform-specific flows when screens diverge significantly or when handling OS-level dialogs that differ between Android and iOS.

### How does Maestro handle flaky tests automatically?

Every Maestro command captures the current view hierarchy, searches for the target element, and if it is not yet present, waits and retries until a timeout. This built-in auto-waiting eliminates the explicit \`sleep\` and wait calls that cause most flakiness in Appium and Selenium. You rarely write manual waits; for genuinely slow screens you add \`extendedWaitUntil\` with a longer timeout.

### Do I need to know how to code to use Maestro?

No. Maestro flows are plain YAML files listing commands like \`tapOn\`, \`inputText\`, and \`assertVisible\`. There is no compilation, no programming language, and no driver setup. Maestro Studio even builds selectors for you visually. Engineers, QA analysts, and even product managers can author and read flows, which is a major reason teams adopt it over code-heavy frameworks.

### How do I run Maestro tests in a CI pipeline?

Install the Maestro CLI in your CI runner, boot an emulator or simulator, install the app build, then run \`maestro test --format junit --output report.xml flows/\`. The CLI exits non-zero on failure so the job fails correctly. For parallel real-device runs, use \`maestro cloud\` with an API key to offload execution to the hosted device farm.

### What is Maestro Studio and when should I use it?

Maestro Studio is a browser-based interactive inspector that shows the live device, the full view hierarchy, and an element picker. When you click an element, it generates the exact \`tapOn\` selector. Use it while authoring flows to find stable selectors quickly and to debug why a step matched the wrong element. It is the fastest way to build correct, durable selectors.

### Can Maestro test React Native and Flutter apps?

Yes. Because Maestro drives the OS-level view hierarchy through UIAutomator and XCUITest, it works with React Native, Flutter, native, and hybrid apps. For Flutter, ensure widgets expose semantic labels or accessibility identifiers so selectors can find them. React Native components map cleanly to native views, so text and accessibility-id selectors generally work without extra configuration.

## Conclusion

Maestro has changed what mobile UI testing feels like. By collapsing the setup, the driver management, and the manual waiting into a single CLI and a declarative YAML format, it lets teams write durable end-to-end tests for Android and iOS in minutes instead of days. The auto-retry model attacks flakiness at the root, the selector system rewards good app-side accessibility, and the CLI plus Maestro Studio make authoring and debugging genuinely fast. Whether you run flows against a local emulator in GitHub Actions or fan them out across the hosted device cloud, the same simple flow file is your single source of truth.

Start small: write one login flow, run it in continuous mode, and watch how rarely it flakes. Then factor it into a subflow, parameterize the credentials, and grow a smoke suite you trust on every pull request. To go deeper on mobile strategy, framework selection, and AI-assisted test authoring, explore the curated QA skills and ready-to-use testing playbooks at [QASkills.sh](/skills) and equip your AI coding agents with battle-tested mobile testing know-how.
`,
};
