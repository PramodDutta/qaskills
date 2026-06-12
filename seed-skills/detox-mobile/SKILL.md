---
name: Detox Mobile Testing
description: Gray-box end-to-end testing for React Native apps with Detox. Covers .detoxrc.js configuration, build and test commands, matchers, device.launchApp control, automatic synchronization, and macOS CI pipelines.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [detox, react-native, mobile, e2e, ios, android, simulator, emulator, gray-box]
testingTypes: [mobile, e2e]
frameworks: [appium, jest]
languages: [javascript, typescript]
domains: [mobile]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Detox Mobile Testing

This skill makes an AI agent write and run Detox gray-box E2E tests for React Native apps: configure `.detoxrc.js` for iOS simulators and Android emulators, build test binaries, write tests with `element(by.id(...))` matchers, control the app lifecycle with `device.launchApp`, and lean on Detox's automatic synchronization instead of sleeps. Trigger it in React Native repositories containing an `e2e/` directory, `detox` in package.json, or when the user asks for end-to-end tests on iOS/Android simulators.

## Core Principles

1. **Detox is gray-box: it waits for the app to be idle.** Detox monitors the JS event loop, network requests, timers, and animations, and only acts when the app is quiescent. Trust this; almost every `sleep()` in a Detox suite is a bug.
2. **Match by `testID`, never by text or traversal.** Text changes with copy edits and localization; view hierarchy changes with refactors. Add `testID="login-button"` props in the app code as part of writing the test.
3. **Test release builds.** Dev builds bundle the dev menu, yellow boxes, and a Metro dependency that makes timing unrealistic. CI must run `assembleRelease` / `-configuration Release` binaries.
4. **Each test starts from a known app state.** Use `device.launchApp({ newInstance: true })` or `device.reloadReactNative()` in `beforeEach`; tests that depend on the previous test's screen are unmaintainable.
5. **Handle permissions at launch, not with dialog-clicking.** `device.launchApp({ permissions: { notifications: 'YES', location: 'inuse' } })` sets iOS permissions deterministically; tapping system dialogs is flaky and Detox cannot see them anyway.
6. **Disable synchronization only as a last resort, and re-enable immediately.** Endless animations (spinners, maps, video) can keep the app permanently busy; scope `device.disableSynchronization()` to the smallest possible window.

## Setup

```bash
npm install --save-dev detox jest @types/jest
# iOS dependency for simulator control
brew tap wix/brew
brew install applesimutils
# Scaffold e2e/ folder and config
npx detox init
```

### .detoxrc.js

```js
// .detoxrc.js
/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      config: 'e2e/jest.config.js',
      _: ['e2e'],
    },
    jest: { setupTimeout: 120000 },
  },
  apps: {
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/ShopApp.app',
      build:
        'xcodebuild -workspace ios/ShopApp.xcworkspace -scheme ShopApp -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build:
        'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release && cd ..',
    },
  },
  devices: {
    simulator: { type: 'ios.simulator', device: { type: 'iPhone 15' } },
    emulator: { type: 'android.emulator', device: { avdName: 'Pixel_7_API_34' } },
  },
  configurations: {
    'ios.sim.release': { device: 'simulator', app: 'ios.release' },
    'android.emu.release': { device: 'emulator', app: 'android.release' },
  },
};
```

### Build, then test

```bash
npx detox build --configuration ios.sim.release
npx detox test --configuration ios.sim.release --cleanup

npx detox build --configuration android.emu.release
npx detox test --configuration android.emu.release --headless --record-logs failing
```

## Patterns

### 1. Login flow with matchers and lifecycle control

```js
// e2e/login.test.js
describe('Login', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('logs in with valid credentials', async () => {
    await element(by.id('email-input')).typeText('qa@example.com');
    await element(by.id('password-input')).typeText('Str0ngPass!');
    await element(by.id('login-button')).tap();

    await expect(element(by.id('home-screen'))).toBeVisible();
    await expect(element(by.text('Welcome back'))).toBeVisible();
  });

  it('shows a validation error for a bad password', async () => {
    await element(by.id('email-input')).typeText('qa@example.com');
    await element(by.id('password-input')).typeText('nope');
    await element(by.id('login-button')).tap();

    await expect(element(by.id('login-error'))).toHaveText('Invalid email or password');
    await expect(element(by.id('home-screen'))).not.toBeVisible();
  });
});
```

### 2. Explicit waits and scrolling for late content

```js
// e2e/orders.test.js
it('renders orders fetched from the API', async () => {
  await element(by.id('tab-orders')).tap();

  // Wait for async content beyond the automatic idle sync
  await waitFor(element(by.id('orders-list')))
    .toBeVisible()
    .withTimeout(10000);

  // Scroll inside the list until a row appears
  await waitFor(element(by.text('Order #1042')))
    .toBeVisible()
    .whileElement(by.id('orders-list'))
    .scroll(250, 'down');

  await element(by.text('Order #1042')).tap();
  await expect(element(by.id('order-detail-screen'))).toBeVisible();
});
```

### 3. Deep links, backgrounding, and multi-instance launches

```js
// e2e/deeplink.test.js
it('opens a product from a deep link', async () => {
  await device.launchApp({
    newInstance: true,
    url: 'shopapp://products/SKU-1042',
  });
  await expect(element(by.id('product-screen'))).toBeVisible();
  await expect(element(by.id('product-sku'))).toHaveText('SKU-1042');
});

it('survives backgrounding mid-checkout', async () => {
  await element(by.id('checkout-button')).tap();
  await device.sendToHome();
  await device.launchApp({ newInstance: false });
  await expect(element(by.id('checkout-screen'))).toBeVisible();
});
```

### 4. GitHub Actions: iOS simulator on macOS runners

```yaml
# .github/workflows/detox-ios.yml
name: detox-ios
on: [pull_request]

jobs:
  ios-e2e:
    runs-on: macos-14
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: cd ios && pod install && cd ..
      - name: Install simulator utils
        run: brew tap wix/brew && brew install applesimutils
      - name: Build app for Detox
        run: npx detox build --configuration ios.sim.release
      - name: Run Detox tests
        run: npx detox test --configuration ios.sim.release --cleanup --record-videos failing --take-screenshots failing
      - name: Upload failure artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: detox-artifacts
          path: artifacts
```

## Best Practices

- Add `testID` props during feature development, not retroactively; treat a missing `testID` as a review comment.
- Keep `e2e/jest.config.js` separate from the unit-test Jest config (`maxWorkers: 1`, longer timeouts, Detox environment).
- Use `--record-videos failing --take-screenshots failing` in CI so every red test ships with visual evidence.
- Reset app state through launch arguments your app understands (for example a `detoxEnableMockServer` flag) rather than tapping through logout flows in every test.
- Run Android tests headless in CI (`--headless`) and pin the AVD image version; emulator image drift is a top source of "works locally" failures.
- Quarantine the rare animation-heavy screen with `device.disableSynchronization()` plus `waitFor(...).withTimeout(...)`, then `device.enableSynchronization()` in a `finally` block.

## Anti-Patterns

- `await new Promise(r => setTimeout(r, 5000))` between steps: Detox's synchronization already waits for idle; sleeps only slow the suite and mask real sync bugs.
- Matching by `by.text()` for anything that will be localized or copy-edited.
- Testing against a debug build connected to Metro in CI, then wondering why timing differs from production.
- One mega-test that logs in, browses, checks out, and edits the profile; when step 14 fails you re-run 13 steps to debug it.
- Asserting on internal state via custom native modules instead of what is visible on screen.
- Skipping `--cleanup`, leaving zombie simulators that exhaust CI runner disk and memory.

## When to Trigger This Skill

- A React Native repository contains `detox` in devDependencies, a `.detoxrc.js`, or an `e2e/` folder with Detox tests.
- The user asks for E2E tests of a React Native app on the iOS simulator or Android emulator.
- Flaky mobile tests full of sleeps need migration to synchronized Detox waits.
- A mobile CI pipeline (GitHub Actions macOS runner, Android emulator job) needs to build and run device tests.
- Prefer Detox for React Native projects; recommend Appium or Maestro instead for native-only apps or teams that want black-box, framework-agnostic flows.
