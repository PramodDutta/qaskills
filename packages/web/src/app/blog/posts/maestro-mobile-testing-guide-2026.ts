import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Maestro Mobile Testing: The Complete YAML-Based Guide for 2026',
  description:
    'Master Maestro mobile testing in 2026: install the CLI, write YAML flows, use selectors, conditionals, loops, JS, Maestro Studio, Maestro Cloud, GitHub Actions CI, and compare it to Appium and Detox.',
  date: '2026-06-14',
  category: 'Guide',
  content: `
# Maestro Mobile Testing: The Complete YAML-Based Guide for 2026

Mobile UI test automation has historically been painful: brittle locators, heavy code instrumentation, flaky waits, and toolchains that fight you at every step. Maestro takes a radically simpler approach. It is an open-source mobile and web UI testing framework where tests are written in plain YAML, run against your real release builds, and require zero code instrumentation. With roughly 10,800 GitHub stars and rapidly growing adoption in 2026, Maestro has become the go-to choice for teams that want readable, low-maintenance end-to-end tests across every mobile stack.

This guide is a complete, hands-on walkthrough of Maestro mobile testing for 2026. You will install the Maestro CLI, write your first flow in YAML, learn the selector model (text, id, and index), run flows from the command line, add conditionals and loops, drop into JavaScript when you need real logic, use Maestro Studio with its visual element inspector and MaestroGPT AI assistant, wire everything into GitHub Actions, scale across devices with Maestro Cloud, and finally compare Maestro head-to-head with Appium and Detox. Every example is runnable and idiomatic for the current Maestro release. If you are building a mobile QA strategy with AI coding agents, this pairs naturally with our [mobile testing automation guide](/blog/mobile-testing-automation-guide) and the in-depth [Appium mobile testing complete guide](/blog/appium-mobile-testing-complete-guide).

## Key Takeaways

- Maestro tests are written in declarative YAML -- readable by anyone, not just engineers.
- It works at the UI layer with no code instrumentation and runs against release builds.
- One framework covers React Native, Flutter, Swift, Kotlin, native Android/iOS, .NET MAUI, Ionic, and Capacitor.
- Maestro has built-in tolerance for flakiness, with automatic waits and retries baked into every command.
- Maestro Studio gives you a visual element inspector, a flow builder, and the MaestroGPT AI assistant.
- Maestro Cloud runs your flows in parallel across many real devices for fast, reliable CI.
- Compared to Appium and Detox, Maestro trades raw flexibility for dramatically simpler authoring and maintenance.

---

## Why Maestro for Mobile Testing in 2026

Maestro was built to fix the two biggest problems in mobile testing: flakiness and authoring friction. It does this with a deliberately small, declarative command set and a runtime that handles timing for you.

**YAML, not code.** A Maestro flow is a YAML file. There is no test framework to learn, no build step for your tests, and no instrumentation library to wire into your app. Product managers and manual QA can read and even write flows.

**No code instrumentation.** Maestro drives the app from the outside, through the same accessibility layer a user's assistive technology would use. You test your actual release build -- the exact artifact you ship -- not a special debug build.

**Built-in flakiness tolerance.** Every command waits for the UI to settle and retries automatically. You almost never write explicit sleeps or waits. This single design decision eliminates the most common source of mobile test flakiness.

**Truly cross-stack.** The same YAML works across an enormous range of platforms.

| Platform | Supported | Notes |
|----------|-----------|-------|
| React Native | Yes | First-class support |
| Flutter | Yes | Works against release builds |
| Native Android (Kotlin/Java) | Yes | UiAutomator under the hood |
| Native iOS (Swift) | Yes | XCUITest under the hood |
| .NET MAUI | Yes | UI-layer driving |
| Ionic / Capacitor | Yes | Hybrid web views |
| Web | Yes | Same YAML, browser target |

If you build your QA workflow with AI agents, you can install a ready-made mobile testing skill and have an agent scaffold Maestro flows for you. Start at the [QASkills.sh skills library](/skills).

---

## Installing Maestro

Maestro installs with a single shell command. It bundles everything it needs and works on macOS, Linux, and Windows (via WSL).

\`\`\`bash
# Install Maestro
curl -fsSL "https://get.maestro.mobile.dev" | bash
\`\`\`

After installation, add Maestro to your PATH if the installer prompts you, then verify it is available:

\`\`\`bash
# Confirm the install
maestro --version

# List devices/emulators Maestro can see
maestro test --help
\`\`\`

Maestro needs an Android emulator or a connected device for Android testing, and the iOS Simulator (with Xcode) for iOS. For Android, make sure an emulator is running or a device is attached via \`adb\`. For iOS, boot a simulator from Xcode or with \`xcrun simctl\`. Maestro auto-detects the running device, so there is no driver server to start -- a major contrast with Appium.

\`\`\`bash
# Start an Android emulator (example)
emulator -avd Pixel_7_API_34 &

# Boot an iOS simulator
xcrun simctl boot "iPhone 15 Pro"
\`\`\`

---

## Your First Maestro Flow

A Maestro flow is a YAML file. It opens with an \`appId\` (the package name on Android or bundle identifier on iOS), followed by a list of commands that run top to bottom. Here is a complete login flow:

\`\`\`yaml
appId: com.example.myapp
---
- launchApp
- tapOn: "Login"
- tapOn:
    id: "email_input"
- inputText: "qa@example.com"
- tapOn:
    id: "password_input"
- inputText: "SuperSecret123"
- tapOn: "Sign In"
- assertVisible: "Welcome back"
\`\`\`

Read it top to bottom and it does exactly what it says: launch the app, tap the Login button, fill the email and password fields, submit, and assert the welcome screen appeared. There is no setup boilerplate, no driver configuration, and no explicit waits -- Maestro waits for each element automatically before acting.

The most common commands you will use are:

| Command | Purpose | Example |
|---------|---------|---------|
| \`launchApp\` | Start (or restart) the app | \`- launchApp\` |
| \`tapOn\` | Tap an element | \`- tapOn: "Sign In"\` |
| \`inputText\` | Type into a focused field | \`- inputText: "hello"\` |
| \`assertVisible\` | Assert an element is on screen | \`- assertVisible: "Welcome"\` |
| \`assertNotVisible\` | Assert an element is absent | \`- assertNotVisible: "Error"\` |
| \`scroll\` | Scroll the view | \`- scroll\` |
| \`swipe\` | Swipe in a direction | \`- swipe: { direction: LEFT }\` |
| \`back\` | Press the system back button | \`- back\` |
| \`takeScreenshot\` | Capture a screenshot | \`- takeScreenshot: home\` |

---

## Selectors: Finding Elements

Maestro offers three primary ways to locate elements, and choosing the right one is the difference between a stable flow and a flaky one.

**By visible text.** The simplest selector matches the text a user sees. Great for buttons and labels, but fragile if your copy changes or is localized.

\`\`\`yaml
- tapOn: "Add to cart"
\`\`\`

**By id.** The most stable selector. It matches the accessibility identifier, resource id, or test id your developers set on the element. Prefer this for anything you control.

\`\`\`yaml
- tapOn:
    id: "add_to_cart_button"
\`\`\`

**By index.** When several elements match the same selector, \`index\` disambiguates by position (zero-based). Use sparingly -- index-based selection is the least resilient because it breaks when layout order changes.

\`\`\`yaml
- tapOn:
    text: "Buy now"
    index: 1
\`\`\`

You can also combine matchers and add modifiers. The table below is a quick reference.

| Selector form | Stability | When to use |
|---------------|-----------|-------------|
| \`text\` | Medium | Buttons/labels with stable copy |
| \`id\` | High | Anything with a test id (preferred) |
| \`index\` | Low | Disambiguate duplicate matches |
| \`text\` + \`enabled: true\` | High | Skip disabled elements |
| Regex in \`text\` | Medium | Dynamic content like "Item 42" |

A regex example for dynamic content:

\`\`\`yaml
- assertVisible:
    text: "Order #[0-9]+ confirmed"
\`\`\`

---

## Running Tests from the CLI

Run a single flow with \`maestro test\`:

\`\`\`bash
# Run one flow
maestro test login.yaml

# Run an entire folder of flows
maestro test flows/

# Pass environment variables into a flow
maestro test -e USERNAME=qa@example.com -e PASSWORD=secret login.yaml

# Record a video of the run
maestro test --format junit --output report.xml flows/
\`\`\`

Maestro prints a live, step-by-step view of each command as it executes, with a green check or red cross. On failure it captures the screen state so you can see exactly where the flow broke. The \`--format junit\` option emits a JUnit XML report that CI systems parse natively, and \`--output\` writes it to disk for upload as a build artifact.

For continuous local development, \`maestro test\` with a folder is the workhorse command. You can organize flows into subfolders (\`onboarding/\`, \`checkout/\`, \`settings/\`) and run the whole suite or a single area at will.

---

## Conditionals, Loops, and Subflows

Real-world flows need control flow: skip a step when a banner is present, repeat an action, or reuse a shared login. Maestro supports all of this declaratively.

**Conditionals** run a command only when a condition holds, using \`when\`:

\`\`\`yaml
- runFlow:
    when:
      visible: "Allow notifications?"
    commands:
      - tapOn: "Allow"
\`\`\`

**Loops** repeat a set of commands with \`repeat\`:

\`\`\`yaml
- repeat:
    times: 3
    commands:
      - tapOn: "Load more"
      - scroll
\`\`\`

You can also repeat while a condition holds:

\`\`\`yaml
- repeat:
    while:
      visible: "Next"
    commands:
      - tapOn: "Next"
\`\`\`

**Subflows** let you extract a reusable sequence -- such as login -- into its own file and call it with \`runFlow\`. This is Maestro's answer to the Page Object pattern: shared, parameterized building blocks.

\`\`\`yaml
# login-subflow.yaml
appId: com.example.myapp
---
- tapOn:
    id: "email_input"
- inputText: \${EMAIL}
- tapOn:
    id: "password_input"
- inputText: \${PASSWORD}
- tapOn: "Sign In"
\`\`\`

\`\`\`yaml
# checkout.yaml
appId: com.example.myapp
---
- launchApp
- runFlow:
    file: login-subflow.yaml
    env:
      EMAIL: "qa@example.com"
      PASSWORD: "secret"
- tapOn: "Checkout"
- assertVisible: "Order confirmed"
\`\`\`

---

## JavaScript in Flows

When declarative YAML is not enough -- generating dynamic test data, computing values, or making an HTTP call to seed state -- Maestro lets you drop into JavaScript. You can run inline expressions or evaluate a script file, and the results flow back into your YAML via the output object.

\`\`\`yaml
appId: com.example.myapp
---
- launchApp
- evalScript: \${output.timestamp = Date.now()}
- inputText: \${"user_" + output.timestamp + "@example.com"}
\`\`\`

For more substantial logic, put it in a \`.js\` file and run it. Variables you assign to \`output\` become available to subsequent YAML commands:

\`\`\`javascript
// generate-user.js
const id = Math.floor(Math.random() * 100000);
output.email = \`qa+\${id}@example.com\`;
output.password = \`Pass\${id}!aB\`;
\`\`\`

\`\`\`yaml
appId: com.example.myapp
---
- launchApp
- runScript: generate-user.js
- tapOn:
    id: "email_input"
- inputText: \${output.email}
- tapOn:
    id: "password_input"
- inputText: \${output.password}
- tapOn: "Register"
- assertVisible: "Welcome"
\`\`\`

You can also call HTTP APIs from JavaScript to set up or tear down server-side state, which keeps your UI flows focused purely on the user journey. Reach for JavaScript only when you truly need it -- the more your flow stays in plain YAML, the more readable and maintainable it remains.

---

## Maestro Studio and MaestroGPT

Maestro Studio is the visual companion to the CLI, and it dramatically speeds up authoring. Launch it with:

\`\`\`bash
maestro studio
\`\`\`

Studio opens a browser-based IDE connected to your running device. It gives you three powerful capabilities:

- **Element inspector.** Click any element on the mirrored device and Studio shows you its text, id, bounds, and accessibility attributes -- exactly the data you need to write a stable selector. No more guessing which id to use.
- **Flow builder.** Interact with the app and Studio records your taps and inputs as YAML commands you can copy straight into a flow file. It is the fastest way to bootstrap a new flow.
- **MaestroGPT.** The built-in AI assistant turns plain-English instructions ("test the checkout flow with an invalid coupon") into Maestro YAML, and helps you debug flows that are failing. It understands the Maestro command set and the current screen, so its suggestions are grounded in your actual app.

The typical workflow is to draft a flow in Studio using the inspector and flow builder, refine the selectors to prefer ids, then save the YAML and run it from the CLI in CI. For AI-driven mobile testing more broadly, see our overview of [AI test automation tools for 2026](/blog/ai-test-automation-tools-2026).

---

## Running Maestro in CI with GitHub Actions

Maestro is built for CI. Because there is no driver server to manage and flows are just files, a pipeline is short. The official Maestro GitHub Action installs the CLI and runs your flows. Here is a complete Android workflow that boots an emulator and runs the suite:

\`\`\`yaml
name: Maestro Mobile Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  maestro-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Install Maestro
        run: |
          curl -fsSL "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> "$GITHUB_PATH"

      - name: Run tests on Android emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          script: |
            adb install app-release.apk
            maestro test --format junit --output report.xml flows/

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: maestro-report
          path: report.xml
\`\`\`

A few CI tips: install the release APK before running flows, use \`--format junit\` so your CI surfaces pass/fail per flow, and upload the report and any screenshots with \`if: always()\` so you get artifacts even when the suite fails. For iOS, swap the emulator step for a macOS runner that boots an iOS Simulator before \`maestro test\`.

---

## Maestro Cloud for Parallel Device Runs

Running flows locally or on a single CI emulator is fine for small suites, but it does not scale and it does not cover real device fragmentation. Maestro Cloud solves both. You upload your app build and flows, and Maestro Cloud runs them in parallel across many real devices, returning a consolidated report with videos and logs for each run.

\`\`\`bash
# Upload a build and run your flows in the cloud in parallel
maestro cloud --apiKey "$MAESTRO_CLOUD_API_KEY" app-release.apk flows/
\`\`\`

The benefits are immediate:

- **Parallelism.** A suite that takes 20 minutes on one emulator finishes in a couple of minutes across many cloud devices.
- **Real devices.** You catch device-specific rendering and behavior bugs that emulators hide.
- **Stable CI.** Offloading device management to the cloud removes the flakiest, slowest part of a mobile pipeline.

In CI you simply call \`maestro cloud\` instead of \`maestro test\`, passing your API key as a secret. The command blocks until the cloud run completes and exits non-zero on failure, so it slots straight into the same GitHub Actions job shown above.

---

## Maestro vs Appium vs Detox

Maestro is not the only mobile testing framework, and the right choice depends on your priorities. Appium is the long-standing, maximally flexible WebDriver-based option; Detox is the gray-box framework popular in the React Native world; Maestro is the declarative, low-maintenance newcomer that has won a lot of ground.

| Dimension | Maestro | Appium | Detox |
|-----------|---------|--------|-------|
| Test language | YAML | Any WebDriver lang | JavaScript |
| Instrumentation | None | None | Required (gray-box) |
| Setup complexity | Very low | High | Medium |
| Flakiness handling | Built-in waits/retries | Manual | Synchronized |
| Platform coverage | Very broad | Very broad | RN-focused |
| Release-build testing | Yes | Yes | Debug builds |
| Cloud parallelism | Maestro Cloud | Many vendors | Limited |
| Learning curve | Minimal | Steep | Moderate |

**Choose Maestro** when you want fast authoring, readable tests, minimal maintenance, and broad platform support without instrumentation. It is ideal for teams where non-engineers contribute to tests and for getting reliable end-to-end coverage quickly.

**Choose Appium** when you need maximum flexibility, want to write tests in a specific language with full programmatic control, or already have a large WebDriver-based suite. See our [Appium mobile testing complete guide](/blog/appium-mobile-testing-complete-guide) for a deep dive.

**Choose Detox** when you are all-in on React Native and want gray-box synchronization that hooks into the app's internals for deterministic waits.

For most teams starting fresh in 2026, Maestro's combination of readability and low flakiness makes it the fastest path to a trustworthy mobile suite. Pair it with the strategy in our [mobile testing automation guide](/blog/mobile-testing-automation-guide).

---

## Frequently Asked Questions

### Is Maestro free and open source?

Yes. The Maestro framework and CLI are fully open source and free to use, with roughly 10,800 GitHub stars as of 2026. You can run flows locally and in your own CI at no cost. Maestro Cloud, the hosted service for parallel runs on real devices, is a paid product, but you never need it to author or run flows yourself.

### What platforms does Maestro support?

Maestro supports an unusually broad set of stacks from a single YAML format: React Native, Flutter, native Android (Kotlin/Java), native iOS (Swift), .NET MAUI, Ionic, and Capacitor, plus web. It drives the app at the UI layer through the accessibility tree, so the same flow can target multiple platforms with little or no change, which is rare among mobile testing frameworks.

### Does Maestro require code instrumentation?

No. Maestro works entirely at the UI layer and requires zero code instrumentation, which means you test your actual release build rather than a special debug build. This is a key difference from gray-box tools like Detox that hook into the app's internals. It makes Maestro setup dramatically simpler and lets you test the exact artifact you ship to users.

### How does Maestro handle flaky tests?

Flakiness tolerance is built into Maestro's runtime. Every command automatically waits for the UI to settle and retries before failing, so you rarely write explicit sleeps or waits. This design eliminates the most common source of mobile test flakiness -- timing -- and is one of the main reasons teams migrate to Maestro from older frameworks where manual waits were a constant maintenance burden.

### Can I use JavaScript in Maestro flows?

Yes. While flows are primarily declarative YAML, Maestro lets you drop into JavaScript when you need real logic. Use \`evalScript\` for inline expressions or \`runScript\` to execute a \`.js\` file. Values you assign to the \`output\` object become available to later YAML commands, so you can generate dynamic test data, compute values, or call HTTP APIs to seed state before driving the UI.

### What is Maestro Studio?

Maestro Studio is a browser-based visual IDE that connects to your running device. It includes an element inspector for reading any element's id and attributes, a flow builder that records your interactions as YAML, and MaestroGPT, an AI assistant that turns plain-English instructions into Maestro YAML and helps debug failing flows. Studio is the fastest way to author new flows and pick stable selectors.

### How is Maestro different from Appium?

Maestro uses declarative YAML with built-in waits and retries and needs no driver server, making setup and maintenance far simpler. Appium is a WebDriver-based framework you script in any language, offering maximum flexibility but a steeper learning curve and more manual flakiness handling. Maestro suits teams that want readable, low-maintenance tests; Appium suits teams that need full programmatic control or have an existing WebDriver suite.

### Can Maestro run in CI/CD pipelines?

Absolutely. Maestro is designed for CI. The official GitHub Action installs the CLI, and you run \`maestro test --format junit\` to produce a report CI can parse. Because flows are plain files and there is no driver server to manage, pipelines are short. For scale, swap \`maestro test\` for \`maestro cloud\` to run flows in parallel across many real devices and get consolidated videos and logs.

---

## Conclusion

Maestro reframes mobile testing around simplicity: declarative YAML flows, no code instrumentation, automatic flakiness tolerance, and broad platform support from a single format. You install it with one command, write your first flow in minutes, author quickly with Maestro Studio and MaestroGPT, scale across real devices with Maestro Cloud, and slot it into GitHub Actions with a short pipeline. Compared to Appium and Detox, it trades some raw flexibility for dramatically lower authoring and maintenance cost -- a trade most teams happily make.

Ready to bring Maestro and AI-driven mobile testing into your workflow? Explore the full library of QA skills for AI coding agents on [QASkills.sh](/skills) and install a mobile testing skill directly into Claude Code, Cursor, and 30+ other agents. Then keep going with our [mobile testing automation guide](/blog/mobile-testing-automation-guide) and the [Appium mobile testing complete guide](/blog/appium-mobile-testing-complete-guide).
`,
};
