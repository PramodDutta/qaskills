import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'App Percy: Visual Testing for Native Mobile Apps',
  description: 'App Percy guide for native mobile visual testing, with Appium setup, CI wiring, baseline review, ignore regions, failure diagnosis, and agent tips.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# App Percy: Visual Testing for Native Mobile Apps

App Percy is BrowserStack's visual testing product for native mobile applications. Use it when the thing you need to protect is the rendered Android or iOS app, not a web page in a browser. It is related to Percy for web, and both appear in the same BrowserStack Percy ecosystem, but App Percy has native mobile SDKs, native screenshot capture, App Automate integration, device metadata, and mobile-specific controls such as status bar, navigation bar, orientation, full-page capture, and Appium element ignore regions.

As of this writing, BrowserStack's App Percy documentation is active and lists Appium, Espresso, Maestro, XCUITest, Tricentis Tosca, Storybook React Native, and Playwright entry points in the App Percy selector. The App Percy SDK sample-build page lists Appium Python, Java, JavaScript, C#, Ruby, WebdriverIO for JavaScript, Espresso, and XCUITest sample builds. The Appium JavaScript package on npm is \`@percy/appium-app\` version 2.1.0, and the current \`@percy/cli\` package is in the 1.32.x line. BrowserStack's command reference still documents \`npx percy app:exec\`, \`app:exec:start\`, \`app:exec:stop\`, and \`app:exec:ping\` for native app runs.

This guide is written for QA engineers who already have functional mobile automation, often with an AI coding agent helping maintain tests. The payoff is a practical App Percy workflow: where to put screenshots, how to wire CI, when to choose manual versus automatic capture, how to keep baselines reviewable, and how to debug the failures that make mobile visual testing feel noisy.

## Where App Percy Fits In A Mobile QA Stack

App Percy should sit beside, not inside, your functional assertion strategy. Your Appium, Espresso, or XCUITest suite should still prove that buttons work, data saves, navigation lands on the correct screen, and backend side effects occurred. App Percy answers a different question: did this screen still look acceptable on the device and OS combinations that matter?

That distinction matters because native mobile visual diffs are expensive to review when they are attached to weak tests. If a flow logs in with a flaky account, waits on a spinner with arbitrary sleeps, and snapshots whatever happens to be on screen, App Percy will faithfully record the chaos. The right model is deterministic functional setup first, visual checkpoint second.

| Layer | Primary job | Good App Percy use | Poor App Percy use |
|---|---|---|---|
| Unit tests | Validate isolated logic | None, unless UI state builders feed visual tests | Trying to screenshot tiny logic changes |
| API and data setup | Put the app in a stable state | Seed users, feature flags, and fixture data before capture | Depending on production-like random feeds |
| Mobile E2E | Exercise device workflows | Stop at stable screen states and capture named snapshots | Replacing functional assertions with screenshots |
| App Percy review | Compare visual output to baseline | Review layout, typography, clipping, theming, localization, and device regressions | Approving every noisy animation and timestamp |
| Release gate | Decide if a change can ship | Block high-risk visual regressions after review | Blocking every branch on untriaged visual churn |

If you also test web UIs, keep the product boundary clear. The broader Percy web workflow serializes web pages or components and renders browser permutations. For that stack, see [Percy visual testing complete guide](/blog/percy-visual-testing-complete-guide). App Percy is for native app screenshots captured through mobile automation.

## Supported Paths And What They Really Mean

BrowserStack gives you two broad App Percy integration paths. The first is the App Percy SDK path, where your test code calls a screenshot method at chosen checkpoints. The second is the BrowserStack SDK path, where App Automate can combine functional execution and visual capture through \`browserstack.yml\` with \`percy: true\` and a \`percyCaptureMode\`.

The BrowserStack SDK can capture automatically for supported language and framework combinations. Their SDK framework coverage page distinguishes fully supported auto capture, partially supported manual capture, and unsupported combinations. That matrix is important for agent-assisted work because an AI coding agent may confidently add a config key that compiles but does not capture anything for your framework.

| Integration path | Use it when | Capture style | Main risk |
|---|---|---|---|
| App Percy SDK with Appium | You already control Appium checkpoints | Explicit \`percyScreenshot(driver, name, options)\` calls | Too many snapshots if every step is captured |
| BrowserStack SDK with \`percyCaptureMode: manual\` | You want one BrowserStack config and explicit screenshots | Manual screenshot API | Missing screenshots if tests never call the method |
| BrowserStack SDK with \`percyCaptureMode: auto\` | Your framework combination supports auto capture | Common events such as screenshot, click, and sendKeys | High screenshot volume and noisy intermediate states |
| Espresso or XCUITest SDK | Native platform suites own the critical flows | Platform-native capture calls | Separate Android and iOS ownership models |
| Start and stop commands | IDE or custom runner cannot wrap with one exec command | Local Percy process receives screenshots | Orphaned process if stop is skipped |

Most QA teams should start with manual capture. Automatic capture is tempting because it looks like coverage for free, but mobile visual review is bottlenecked by human judgment. Capture the screens that represent product contracts: onboarding steps, permission prompts, checkout review, settings, critical empty states, account-risk warnings, paywall states, and localization-heavy screens.

## Install The CLI And Appium SDK

For an Appium JavaScript project, BrowserStack documents installing \`@percy/cli\` and \`@percy/appium-app\`. The npm package page for \`@percy/appium-app\` states that it needs \`@percy/cli\` 1.25.0 or newer, and the current CLI package is newer than that. Pin versions in a real project if visual test reproducibility matters for release branches.

\`\`\`bash
npm install --save-dev @percy/cli@1.32.11 @percy/appium-app@2.1.0 wd
\`\`\`

The App Percy command reference shows the native-app runner as \`percy app:exec\`, not the web-oriented \`percy exec\`. That small distinction is one of the most common setup mistakes. If your screenshots never arrive, check the command wrapper before you inspect your test code.

\`\`\`json
{
  "scripts": {
    "test:mobile": "mocha test/mobile/**/*.spec.js --timeout 120000",
    "test:mobile:visual": "percy app:exec -- npm run test:mobile",
    "test:mobile:visual:smoke": "percy app:exec -- npm run test:mobile -- --grep visual-smoke"
  },
  "devDependencies": {
    "@percy/appium-app": "2.1.0",
    "@percy/cli": "1.32.11",
    "mocha": "11.7.2",
    "wd": "1.14.0"
  }
}
\`\`\`

Mocha's documented filter flag is \`--grep <regexp>\` or \`-g <regexp>\`. Use it to keep visual smoke tests small on pull requests and run the fuller visual suite nightly. The important thing is that visual tests should be selected intentionally. Do not let an agent add snapshots to every existing end-to-end test just because the SDK call is easy.

## A Complete Appium Screenshot Test

\`@percy/appium-app\` supports both the legacy \`wd\` client (no release since 1.14.0 in January 2021) and WebdriverIO; for a new suite, WebdriverIO is the better-maintained choice. The following example uses \`wd\` because it keeps the session setup explicit, and it checks environment variables before opening the session, makes a meaningful functional assertion before the visual checkpoint, and ignores a bounded region that is expected to vary. It is intentionally small, because visual tests become maintainable through selection, not volume.

\`\`\`javascript
const wd = require('wd');
const percyScreenshot = require('@percy/appium-app');
const { IgnoreRegion } = require('@percy/appium-app/percy/util/ignoreRegion');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error('Missing required environment variable: ' + name);
  }
  return value;
}

async function main() {
  const driver = wd.promiseRemote('http://hub-cloud.browserstack.com/wd/hub');
  const capabilities = {
    platformName: 'Android',
    deviceName: 'Google Pixel 7',
    platformVersion: '13.0',
    app: requiredEnv('APP_URL'),
    project: 'Checkout App',
    build: 'visual-' + requiredEnv('GITHUB_RUN_ID'),
    name: 'checkout review visual-smoke',
    'bstack:options': {
      userName: requiredEnv('BROWSERSTACK_USERNAME'),
      accessKey: requiredEnv('BROWSERSTACK_ACCESS_KEY')
    },
    'appium:percyOptions': {
      enabled: true,
      ignoreErrors: false
    }
  };

  await driver.init(capabilities);

  try {
    await driver.elementByAccessibilityId('Login').click();
    await driver.elementByAccessibilityId('Email').sendKeys('visual.qa@example.com');
    await driver.elementByAccessibilityId('Password').sendKeys(requiredEnv('VISUAL_TEST_PASSWORD'));
    await driver.elementByAccessibilityId('Submit login').click();

    const checkoutTitle = await driver.elementByAccessibilityId('Checkout review');
    const titleText = await checkoutTitle.text();
    if (titleText !== 'Checkout review') {
      throw new Error('Expected checkout review screen, saw: ' + titleText);
    }

    const statusBar = new IgnoreRegion(0, 72, 0, 390);
    await percyScreenshot(driver, 'Checkout review - Android Pixel 7', {
      orientation: 'portrait',
      customIgnoreRegions: [statusBar]
    });
  } finally {
    await driver.quit();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
\`\`\`

The \`IgnoreRegion\` constructor takes top, bottom, left, and right coordinates. BrowserStack documents that invalid region parameters include negative values, \`top >= bottom\`, \`left >= right\`, and regions outside the screen. Treat those coordinates as production test code. Hard-coded pixels are acceptable for stable status bars or known ad slots, but they should be named and reviewed. Hidden broad ignore regions can erase the exact regression you intended to catch.

## Manual Capture Versus Auto Capture

The BrowserStack SDK path can set \`percyCaptureMode\` to modes such as \`manual\`, \`auto\`, \`testcase\`, \`click\`, or \`screenshot\`, depending on framework support. The practical choice is about review economics.

| Capture mode | Best fit | Review cost | Failure pattern |
|---|---|---|---|
| \`manual\` | PR gates and critical journeys | Low to moderate | Missing a newly important screen |
| \`testcase\` | Small suites with one screen state per test | Moderate | Captures a final state that is not visually meaningful |
| \`click\` | Exploratory visual discovery on a temporary branch | High | Snapshots transient menus, loading states, and keyboard movement |
| \`screenshot\` | Teams already using driver screenshots as checkpoints | Medium | Depends on existing screenshot discipline |
| \`auto\` | Mature suites with stable data and limited flows | Potentially high | Screenshot count grows faster than reviewer attention |

Here is a BrowserStack SDK style configuration that uses manual capture, keeps parallelism modest, and makes the visual project name explicit. BrowserStack's docs show \`percy: true\` and \`percyCaptureMode\` in \`browserstack.yml\`.

\`\`\`yaml
userName: \${BROWSERSTACK_USERNAME}
accessKey: \${BROWSERSTACK_ACCESS_KEY}
app: \${APP_URL}

projectName: Checkout App
buildName: visual-\${GITHUB_RUN_ID}
browserstackLocal: true
parallelsPerPlatform: 1

platforms:
  - platformName: android
    deviceName: Google Pixel 7
    platformVersion: 13.0
  - platformName: ios
    deviceName: iPhone 14
    platformVersion: 16

percy: true
percyCaptureMode: manual
\`\`\`

Do not copy a \`percyCaptureMode: auto\` snippet into every repository. First confirm your language and framework combination in BrowserStack's SDK framework coverage page. A fully supported cell means auto capture can work. A partially supported cell means use manual capture. A not-supported cell means the BrowserStack SDK path is not the right route for that combination.

## Build Names, Branches, And Baselines

App Percy compares a new build against a baseline in the Percy dashboard. That baseline is useful only if build identity is stable enough for humans to understand. A weak naming scheme creates review debt: screenshots from Android and iOS mix together, reruns appear unrelated, and approved baselines drift between branches.

Use a naming scheme that includes the product area, branch or pull request context, device, and a stable snapshot name. Snapshot names are contracts. If a developer renames \`Checkout review - Android Pixel 7\` to \`checkout page\`, App Percy may treat it as a different snapshot rather than a continuation of the old baseline.

| Naming item | Recommended pattern | Reason |
|---|---|---|
| Percy project | One app or release train, such as \`Checkout App Native\` | Keeps baseline ownership clear |
| Build name | \`visual-\${GITHUB_RUN_ID}\` plus branch metadata from CI | Makes reruns traceable |
| Snapshot name | \`Screen purpose - platform device\` | Avoids anonymous images in review |
| Test title | Include product flow and visual tag | Lets Mocha \`--grep\` select visual subsets |
| Baseline branch | Mainline release branch | Prevents feature branches from becoming moving truth |

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI, but keep App Percy project naming in your repository. An agent can help add or move screenshot calls, while your team owns the baseline vocabulary.

## CI Wiring For Pull Requests

BrowserStack's Percy GitHub Actions docs still show the core requirement: set \`PERCY_TOKEN\` as a repository secret and run the Percy command in CI. The example below pins current action majors, uploads local Percy logs, and runs only visual smoke tests on pull requests.

\`\`\`yaml
name: mobile-visual

on:
  pull_request:
  workflow_dispatch:

jobs:
  app-percy:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      APP_URL: \${{ secrets.BROWSERSTACK_APP_URL }}
      BROWSERSTACK_USERNAME: \${{ secrets.BROWSERSTACK_USERNAME }}
      BROWSERSTACK_ACCESS_KEY: \${{ secrets.BROWSERSTACK_ACCESS_KEY }}
      PERCY_TOKEN: \${{ secrets.PERCY_TOKEN }}
      VISUAL_TEST_PASSWORD: \${{ secrets.VISUAL_TEST_PASSWORD }}
      GITHUB_RUN_ID: \${{ github.run_id }}
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - run: npx percy app:exec -- npm run test:mobile -- --grep visual-smoke

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: app-percy-logs-\${{ github.run_id }}
          path: percy.log
          if-no-files-found: ignore
\`\`\`

For a larger mobile suite, split functional and visual responsibilities. Run fast functional Appium checks on each pull request. Run a curated App Percy smoke set on pull requests that touch UI code. Run a broader device matrix nightly or before release candidates. Percy usage is screenshot based; BrowserStack's Percy plan docs say the free plan includes 5,000 monthly screenshots and paid plans include fixed screenshot allocations with overage. That makes snapshot count a budget concern, not just a runtime concern.

## Device Coverage Without Screenshot Inflation

The expensive decision is not whether to test Android and iOS. You almost certainly should. The expensive decision is how many screen states you capture per device. A healthy mobile visual matrix starts from risk, not from the complete device catalog.

| Risk | Device choice | Snapshot choice |
|---|---|---|
| Small-screen clipping | One compact phone per platform | Dense forms, long labels, bottom sheets |
| Modern flagship layout | One common high-resolution phone | Primary happy paths and cards |
| Tablet or foldable support | One tablet or expanded layout target | Responsive navigation, split panes |
| OS-specific rendering | Latest supported OS plus oldest supported OS when feasible | Permission dialogs, native controls |
| Localization | One narrow language and one long-string language | Checkout, settings, account screens |

Avoid multiplying every snapshot by every device. If you capture 40 screens on four devices and two orientations, you have 320 visual comparisons before anyone has looked at a diff. A better first pass is 10 screens on two high-value devices, plus one nightly job that samples the awkward layouts.

## Stabilizing Screens Before Capture

Mobile visual tests fail for reasons that functional tests hide. Animations can still be settling after the element is visible. Dynamic data can arrive between the assertion and screenshot. The software keyboard can remain open. Status bars, clocks, and battery indicators can vary. Network images can finish after the screenshot is sent.

Build a capture helper that waits for the screen contract, not a fixed sleep. The helper below waits for an accessibility id, checks expected text, gives the UI one short settle interval, then captures. The fixed settle is deliberately last, not first.

\`\`\`javascript
const percyScreenshot = require('@percy/appium-app');

async function captureStableScreen(driver, options) {
  const titleElement = await driver.elementByAccessibilityId(options.titleAccessibilityId);
  const actualTitle = await titleElement.text();

  if (actualTitle !== options.expectedTitle) {
    throw new Error('Expected ' + options.expectedTitle + ', saw ' + actualTitle);
  }

  await driver.sleep(options.settleMs);

  await percyScreenshot(driver, options.snapshotName, {
    orientation: options.orientation,
    customIgnoreRegions: options.customIgnoreRegions || []
  });
}

module.exports = { captureStableScreen };
\`\`\`

The functional assertion is not decoration. It prevents a misleading visual snapshot of the wrong screen. AI coding agents often add visual captures after the last action because that is syntactically easy. Ask the agent to assert the screen identity first. If the title is absent, if a loading indicator is still visible, or if a backend mutation has not completed, fail before Percy receives an image.

## Ignore Regions And Diff Sensitivity

App Percy's dashboard Regions feature can define areas directly in review. BrowserStack documents two region rules: Ignore all and Standard (Pixel-based). Standard regions can adjust diff sensitivity with levels such as Strict, Moderately Strict, Recommended, Moderately Relaxed, and Relaxed, and can ignore minor changes below a percentage threshold.

Programmatic ignore regions are better when the volatility belongs to the test contract. Dashboard regions are better when reviewers discover a recurring noisy area after seeing real diffs. Use both sparingly.

| Volatile area | Better approach | Why |
|---|---|---|
| Status bar clock | Programmatic ignore region | Same coordinates on a fixed device profile |
| Random promotional banner | Test data fixture, then ignore only if unavoidable | A banner may hide layout regressions |
| Live account balance | Seeded account or mocked API | The value itself may affect text wrapping |
| Cursor in a text field | Dismiss keyboard and blur field | Ignoring can hide input spacing bugs |
| Native permission prompt | Dedicated baseline | Permission UI is often product-critical |

What people get wrong: they treat ignore regions as a noise filter rather than a risk decision. If an ignored rectangle covers the price, CTA, error message, or navigation bar, the test has lost its business value. Every ignore region should have a reason that a reviewer would accept during a release incident.

## Diagnosing A Real Failure Mode

Imagine a pull request changes the checkout screen. App Percy flags a large diff on \`Checkout review - Android Pixel 7\`. The highlighted change covers the bottom half of the screen, but the developer says the UI looks fine locally.

Start with the artifact trail. Confirm the Appium test reached the expected screen by checking the functional assertion logs. Confirm the snapshot name did not change. Confirm the device and OS match the baseline. Then inspect the actual diff: if the content is shifted upward and the bottom CTA is partly hidden, the most likely cause is the keyboard or a focus state left active before capture.

The diagnosis workflow should be boring:

1. Re-run only the affected visual test with Mocha \`--grep visual-smoke\`.
2. Add a temporary assertion that no keyboard-focused field is active before capture.
3. Check whether the screenshot contains the expected screen title.
4. If the diff remains, compare device metadata between baseline and head build.
5. If the diff is valid, approve or reject in App Percy with a written note.

Here is a small guard you can add before screenshot capture when text entry happens earlier in the flow.

\`\`\`javascript
async function dismissKeyboardIfPresent(driver) {
  try {
    await driver.hideKeyboard();
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    if (!message.includes('keyboard')) {
      throw error;
    }
  }
}

module.exports = { dismissKeyboardIfPresent };
\`\`\`

Do not paper over this class of failure by adding a giant bottom ignore region. The bottom CTA is usually one of the highest-value visual contracts in a mobile app.

## Making AI Agents Useful With App Percy

AI coding agents are good at repetitive test edits, but visual testing has traps that look harmless in code review. Give the agent constraints that match your review model.

Ask for named checkpoints, not blanket capture. Ask it to preserve existing snapshot names unless the UI contract truly changed. Ask it to add functional assertions before visual assertions. Ask it to keep the screenshot count visible in the pull request. Ask it to update CI filters rather than expanding every PR run.

| Agent task | Good instruction | Review check |
|---|---|---|
| Add visual coverage | Add one App Percy screenshot after the checkout review title is asserted | Snapshot name is stable and specific |
| Fix flake | Diagnose readiness condition before adding waits | No arbitrary long sleep unless justified |
| Add ignore region | Ignore only the Android status bar coordinates | Region does not cover product UI |
| Expand devices | Add one nightly iOS device, not PR matrix expansion | Screenshot budget remains controlled |
| Refactor tests | Keep snapshot names identical | Baseline history is preserved |

If you use [Appium mobile testing complete guide](/blog/appium-mobile-testing-complete-guide) practices such as explicit accessibility ids, deterministic fixtures, and real side-effect assertions, App Percy becomes much easier to maintain. Visual testing magnifies weak automation. It does not repair it.

## Review Workflow And Release Policy

App Percy review should be a product decision with QA ownership, not a passive dashboard chore. Define who can approve visual changes, when baselines update, and which builds can block release. BrowserStack's UI supports review workflows, regions, and usage reporting, but team policy decides whether those features create confidence or noise.

| Policy question | Sensible default | When to tighten |
|---|---|---|
| Who approves visual diffs? | QA or feature owner for the changed area | Regulated flows, payments, account security |
| When are baselines updated? | After intentional UI changes are reviewed | Release branches and hotfixes |
| Which tests block PRs? | Small visual smoke suite | Design-system packages and checkout flows |
| Where does broad coverage run? | Nightly or release candidate workflow | Apps with frequent native layout regressions |
| How is usage watched? | Monthly Percy App tab usage review | Screenshot count approaches plan limits |

One useful pattern is a two-tier gate. Pull requests run a small App Percy smoke suite. The result must either pass or have approved changes. Nightly builds run the larger matrix and create issues for unexpected diffs. This keeps developers moving while still catching device-specific drift before release.

## Frequently Asked Questions

### Is App Percy the same as Percy for web?

No. App Percy is for native mobile app visual testing, while Percy for web is for browser pages and web components. The products share the BrowserStack Percy ecosystem and dashboard concepts such as builds, snapshots, baselines, and review, but the capture path is different. App Percy uses mobile automation integrations such as Appium, Espresso, XCUITest, and BrowserStack App Automate flows. Use App Percy when the rendered Android or iOS app is the artifact under test.

### Should I use automatic capture or manual screenshots?

Start with manual screenshots. Manual capture gives QA teams control over which screens become visual contracts and keeps review volume manageable. Automatic capture is useful after your test data, screen readiness checks, and framework support are mature. Before enabling \`percyCaptureMode: auto\`, confirm the language and framework combination in BrowserStack's SDK coverage docs. If it is only partially supported, design around manual capture instead of expecting event-based screenshots to appear.

### Why are my App Percy screenshots not uploaded?

Check the wrapper command first. Native app runs should use \`npx percy app:exec -- <test command>\` or the documented start and stop commands. Then verify \`PERCY_TOKEN\`, BrowserStack credentials, SDK package installation, and that the test actually calls the screenshot method. If you use BrowserStack SDK config, confirm \`percy: true\`, the selected \`percyCaptureMode\`, and framework support. Also check whether \`ignoreErrors\` is hiding Percy-side errors in the test logs.

### How many mobile screenshots should a pull request run?

Use a deliberately small pull request set, often 5 to 15 high-value snapshots across one or two representative devices. Run broader matrices nightly or for release candidates. The goal is not to maximize screenshot count, it is to maximize useful review signal. BrowserStack Percy billing is screenshot-based, and reviewers also have a finite attention budget. Protect critical screens first: login, checkout, permissions, settings, empty states, and dense localized layouts.
`,
};
