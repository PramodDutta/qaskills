---
name: Maestro Mobile Testing
description: Black-box mobile UI testing with Maestro YAML flows - launchApp, tapOn, inputText, assertVisible, reusable runFlow subflows, environment parameters, JUnit reporting, and emulator-based CI pipelines.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [maestro, mobile, e2e, ios, android, yaml, flows, ui-testing, flutter, react-native]
testingTypes: [mobile, e2e]
frameworks: [appium]
languages: [typescript]
domains: [mobile]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Maestro Mobile Testing

This skill makes an AI agent write Maestro flows - declarative YAML files that drive iOS and Android apps black-box style with built-in waiting, no test harness compiled into the app, and no WebDriver session management. Trigger it when a repository contains a `.maestro/` directory or `*.yaml` flows with `appId:` headers, or when the user wants fast, low-maintenance smoke tests for a native, React Native, or Flutter app without the weight of Appium.

## Core Principles

1. **Maestro waits by default; do not teach it to sleep.** Every `tapOn` and `assertVisible` polls until the element appears or a timeout expires. Reach for `extendedWaitUntil` for slow screens; never add fixed delays as a first resort.
2. **One flow per user-visible behavior.** A flow named `checkout-with-saved-card.yaml` that does exactly that is debuggable. A 200-line `regression.yaml` is not. Compose bigger journeys from subflows with `runFlow`.
3. **Select by accessibility id first, visible text second.** `tapOn: id: "submit-button"` survives copy changes and localization; text selectors are acceptable for stable, single-language labels only.
4. **Start from a clean, deterministic state.** `launchApp` with `clearState: true` resets the app between flows; tests that inherit the previous flow's logged-in session fail in random orders.
5. **Parameterize with env, not copies.** Credentials and hosts go in `env:` blocks or `-e KEY=value` CLI arguments so the same flow runs against dev, staging, and CI builds.
6. **Treat flows as code.** They live in the repo next to the app, run on every PR via emulator CI, and produce JUnit XML that the pipeline understands.

## Setup

```bash
# Install the Maestro CLI
curl -fsSL "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro --version

# Run one flow against the booted simulator/emulator
maestro test .maestro/login.yaml

# Run the whole suite with JUnit output for CI
maestro test .maestro/ --format junit --output maestro-report.xml

# Interactive selector explorer while authoring
maestro studio
```

## Patterns

### 1. A complete login flow

```yaml
# .maestro/login.yaml
appId: com.example.shop
env:
  EMAIL: qa@example.com
  PASSWORD: Str0ngPass!
---
- launchApp:
    clearState: true
- tapOn: 'Log in'
- tapOn:
    id: 'email-input'
- inputText: ${EMAIL}
- tapOn:
    id: 'password-input'
- inputText: ${PASSWORD}
- hideKeyboard
- tapOn:
    id: 'login-submit'
- assertVisible: 'Welcome back'
- assertNotVisible: 'Invalid email or password'
- takeScreenshot: logged-in-home
```

### 2. Subflows with runFlow: compose journeys, handle one-off dialogs

```yaml
# .maestro/subflows/login.yaml -- reusable building block
appId: com.example.shop
---
- launchApp:
    clearState: true
- tapOn: 'Log in'
- tapOn:
    id: 'email-input'
- inputText: ${EMAIL}
- tapOn:
    id: 'password-input'
- inputText: ${PASSWORD}
- tapOn:
    id: 'login-submit'
- assertVisible:
    id: 'home-screen'
```

```yaml
# .maestro/checkout.yaml -- the journey composes the subflow
appId: com.example.shop
env:
  EMAIL: qa@example.com
  PASSWORD: Str0ngPass!
---
- runFlow: subflows/login.yaml

# Dismiss the push-permission prompt only if it appears
- runFlow:
    when:
      visible: 'Allow notifications?'
    commands:
      - tapOn: 'Allow'

- tapOn: 'Deals'
- scrollUntilVisible:
    element:
      text: 'Wireless Headphones'
    direction: DOWN
    timeout: 20000
- tapOn: 'Wireless Headphones'
- tapOn:
    id: 'add-to-cart'
- tapOn:
    id: 'cart-icon'
- assertVisible: 'Wireless Headphones'
- assertVisible:
    text: 'Checkout'
    enabled: true
```

### 3. Waiting, repeats, and assertions with conditions

```yaml
# .maestro/order-status.yaml
appId: com.example.shop
---
- launchApp
- tapOn:
    id: 'tab-orders'

# Wait up to 15s for async content instead of a blind sleep
- extendedWaitUntil:
    visible:
      id: 'orders-list'
    timeout: 15000

# Pull-to-refresh until the order flips to Shipped, max 5 tries
- repeat:
    while:
      notVisible: 'Shipped'
    times: 5
    commands:
      - swipe:
          direction: DOWN
          duration: 400

- assertVisible:
    text: 'Shipped'
- copyTextFrom:
    id: 'order-number'
- assertTrue: ${maestro.copiedText != ''}
```

### 4. CI: Android emulator on GitHub Actions

```yaml
# .github/workflows/maestro-android.yml
name: maestro-android
on: [pull_request]

jobs:
  flows:
    runs-on: ubuntu-latest
    timeout-minutes: 40
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - name: Build debug APK
        run: ./gradlew assembleDebug
      - name: Install Maestro
        run: |
          curl -fsSL "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> "$GITHUB_PATH"
      - name: Run flows on emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          profile: pixel_7
          script: |
            adb install app/build/outputs/apk/debug/app-debug.apk
            maestro test .maestro/ --format junit --output maestro-report.xml \
              -e EMAIL=ci-bot@example.com -e PASSWORD="${{ secrets.TEST_USER_PASSWORD }}"
      - name: Publish report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: maestro-report
          path: |
            maestro-report.xml
            ~/.maestro/tests
```

For hosted device execution, the same suite uploads unchanged: `maestro cloud --api-key "$MAESTRO_CLOUD_API_KEY" app-debug.apk .maestro/` runs every flow on cloud devices and returns a pass/fail exit code CI can gate on.

## Best Practices

- Use `maestro studio` to discover ids and text before writing selectors by hand; it shows exactly what the accessibility tree exposes.
- Add accessibility identifiers in app code (`testID` in React Native, `accessibilityIdentifier` on iOS, `contentDescription`/`resource-id` on Android) as part of feature work.
- Keep shared steps in `subflows/` and one top-level flow per journey; flows read top to bottom like a manual test script, keep them that readable.
- Tag smoke flows with YAML `tags: [smoke]` and run `maestro test --include-tags smoke` on every PR, the full suite nightly.
- Capture `takeScreenshot` at journey milestones; screenshots plus the JUnit report make CI failures diagnosable without a local repro.
- Pin the emulator API level and profile in CI; device drift is the top source of "passes locally" mysteries.

## Anti-Patterns

- Sprinkling `- waitForAnimationToEnd` and long `extendedWaitUntil` timeouts everywhere to paper over an app that never settles; fix the spinner, not the test.
- Selecting by index (`tapOn: point: 50%,30%` or index-based taps) for elements that have ids; coordinate taps break on every screen size.
- One giant flow covering login, browse, checkout, refunds, and settings: a failure at step 40 costs a full re-run to debug.
- Hardcoding production credentials in flow files; use `env:` plus CI secrets.
- Running flows only on a developer's personal device before release instead of an emulator on every PR.
- Re-implementing Appium-style page objects in JavaScript wrappers around Maestro; the YAML is the abstraction, keep logic out of it.

## When to Trigger This Skill

- A repository contains a `.maestro/` directory, YAML files starting with `appId:`, or `maestro` commands in CI workflows.
- The user wants mobile UI smoke tests with minimal setup, or asks to test a React Native, Flutter, or native app without Appium infrastructure.
- An existing Appium suite is too slow or flaky for PR-level smoke coverage and the team wants a lighter black-box layer on top.
- Mobile onboarding, login, or checkout journeys need regression coverage that designers and QA can read and edit.
- Choose Maestro for declarative cross-platform flows; recommend Detox when the team needs gray-box React Native synchronization, or Appium when tests must script complex logic in a full programming language.
