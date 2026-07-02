import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Applitools Visual Testing Guide -- Eyes, Visual AI, and Setup',
  description:
    'Complete guide to Applitools visual testing. Covers Applitools Eyes AI, the Visual AI engine, Playwright and Cypress SDK setup, Ultrafast Grid, CI/CD, and best practices.',
  date: '2026-07-02',
  category: 'Guide',
  content: `
# Applitools Visual Testing Guide: Eyes, Visual AI, and Full Setup

Applitools is one of the most established visual testing platforms in the industry, and its core differentiator is Visual AI -- a perceptual comparison engine that judges screenshots the way a human would rather than comparing pixels one by one. Traditional screenshot diffing tools flood you with false positives: a one-pixel anti-aliasing difference, a font that renders slightly differently on a CI machine, or a sub-pixel rounding change in a browser update all trigger failures that a human would never notice. Applitools Eyes, powered by Visual AI, filters that noise out and surfaces only the differences that a real user would actually perceive as a bug.

This guide walks through everything you need to adopt Applitools effectively. You will learn how Visual AI works under the hood, how to install and configure the Applitools Eyes SDK with both Playwright and Cypress, how to run cross-browser and cross-device tests in parallel using the Ultrafast Grid, how to wire Applitools into a CI/CD pipeline with GitHub Actions, and how to manage baselines, batches, and match levels without drowning in maintenance. We will also compare Applitools against Percy, BackstopJS, and Playwright's built-in screenshot comparison so you can decide whether the paid platform is worth it for your team. By the end you will have runnable code you can drop into a real project and a clear mental model of when Applitools earns its keep.

## Key Takeaways

- Applitools Eyes uses Visual AI, a perceptual comparison engine, so it flags only differences a human would notice -- dramatically reducing the false positives that plague pixel-diff tools
- The Applitools Eyes SDK integrates with Playwright, Cypress, Selenium, WebdriverIO, Storybook, and 50+ frameworks with a nearly identical API surface
- The Ultrafast Grid renders one snapshot across dozens of browser and device combinations in the cloud in parallel, so cross-browser visual coverage costs a single local test run
- Match levels (Strict, Layout, Content, Exact) let you control how strict the comparison is per checkpoint, which is essential for dynamic content
- CI/CD integration with batch grouping and the Applitools dashboard turns visual review into a fast approve/reject workflow instead of a manual eyeball audit
- AI coding agents equipped with QA skills from [QASkills.sh](/skills) can scaffold and maintain Applitools test suites automatically

---

## What Is Applitools and How Does Visual AI Work?

Applitools is a cloud-based visual testing and monitoring platform. At its heart is **Applitools Eyes**, an SDK you embed in your existing test framework, and the **Visual AI** engine that runs in the Applitools cloud. When your test calls \`eyes.check(...)\`, the SDK captures a snapshot of the current page -- not just a flat image, but the full DOM, CSS, and rendered geometry -- and uploads it to the cloud. The Visual AI engine then compares that snapshot against a stored baseline and returns a pass or a flagged difference.

The critical distinction from traditional tools is the comparison algorithm. Pixel-diff tools such as BackstopJS or resemble.js compare two images pixel by pixel and count how many differ. This is brittle: browsers anti-alias text differently, GPUs render gradients with tiny variations, and a font hinting change can shift thousands of pixels without changing anything a user would perceive. Visual AI instead models human vision. It segments the page into regions, understands structure and content, and asks whether a difference is *meaningful* -- a missing button, overlapping text, a broken layout -- rather than merely *present*.

This is why Applitools markets itself around **false-positive reduction**. In practice, teams that migrate from pixel-diffing to Visual AI report that flaky visual failures drop by an order of magnitude, which is often the single biggest reason visual testing programs succeed or die. A visual suite that cries wolf every build gets muted; a suite that only fails on real bugs gets trusted. If you have battled flaky screenshot tests before, our guide on how to [fix flaky tests](/blog/fix-flaky-tests-guide) covers complementary strategies.

Visual AI also enables features that are impossible with pixel diffing: automatic ignoring of dynamic regions, cross-browser normalization (the same baseline works across Chrome, Firefox, Safari, and Edge), and the Ultrafast Grid, which renders a single captured DOM across many browser and viewport combinations server-side.

## Installing the Applitools Eyes SDK for Playwright

Applitools ships a dedicated Playwright integration, \`@applitools/eyes-playwright\`, that exposes both a fixture-based API and a classic imperative API. Start by installing the packages and setting your API key, which you obtain from the Applitools dashboard under the user menu.

\`\`\`bash
npm install --save-dev @playwright/test @applitools/eyes-playwright

# Set your API key as an environment variable (never hard-code it)
export APPLITOOLS_API_KEY="your-api-key-here"
\`\`\`

The simplest way to start is the fixture API, which auto-manages the Eyes lifecycle. Create a test file that imports \`test\` and \`eyes\` from the Applitools fixture:

\`\`\`typescript
import { test } from '@applitools/eyes-playwright/fixture';
import { expect } from '@playwright/test';

test.describe('QASkills homepage visual coverage', () => {
  test('homepage renders correctly', async ({ page, eyes }) => {
    await page.goto('https://qaskills.sh');

    // A full-page Visual AI checkpoint
    await eyes.check('Homepage', {
      fully: true, // capture the entire scrollable page, not just the viewport
    });

    // You can still run functional assertions alongside visual checks
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
\`\`\`

The fixture opens an Eyes session automatically before each test and closes it after, uploading results to the dashboard. The \`fully: true\` option tells Applitools to stitch the entire scrollable page into a single snapshot rather than capturing only what is in the viewport, which is one of the most common early mistakes.

## The Classic Imperative API and Region Targeting

For more control -- shared configuration, custom batches, targeting specific regions -- use the imperative \`Eyes\` class directly. This is the pattern you will want for larger suites where you configure the runner once and reuse it.

\`\`\`typescript
import { test } from '@playwright/test';
import {
  Eyes,
  VisualGridRunner,
  Configuration,
  BrowserType,
  DeviceName,
  ScreenOrientation,
  Target,
} from '@applitools/eyes-playwright';

let runner: VisualGridRunner;
let eyes: Eyes;

test.beforeEach(async () => {
  runner = new VisualGridRunner({ testConcurrency: 5 });
  eyes = new Eyes(runner);

  const config = new Configuration();
  config.setApiKey(process.env.APPLITOOLS_API_KEY!);
  config.setBatch({ id: process.env.APPLITOOLS_BATCH_ID, name: 'Web Regression' });

  // Cross-browser + cross-device matrix rendered in the Ultrafast Grid
  config.addBrowser(1280, 800, BrowserType.CHROME);
  config.addBrowser(1280, 800, BrowserType.FIREFOX);
  config.addBrowser(1280, 800, BrowserType.SAFARI);
  config.addDeviceEmulation(DeviceName.iPhone_X, ScreenOrientation.PORTRAIT);

  eyes.setConfiguration(config);
});

test('skill detail page', async ({ page }) => {
  await eyes.open(page, 'QASkills', 'Skill detail page', { width: 1280, height: 800 });
  await page.goto('https://qaskills.sh/skills');

  // Full page checkpoint
  await eyes.check('Skills listing', Target.window().fully());

  // Target only a region by selector
  await eyes.check('Filter bar', Target.region('[data-testid="filter-tabs"]'));

  await eyes.close(false); // false = do not throw on diff, collect results below
});

test.afterEach(async () => {
  const results = await runner.getAllTestResults(false);
  console.log('Visual results:', results.toString());
});
\`\`\`

The \`Target\` builder is the workhorse. \`Target.window().fully()\` captures the whole page, \`Target.region(selector)\` scopes the checkpoint to one element, and you can chain modifiers such as \`.ignoreRegions(...)\`, \`.layout()\`, and \`.matchLevel(...)\` to control comparison behavior per checkpoint.

## Match Levels: Controlling Comparison Strictness

Match levels are how you tell Visual AI *how* to compare. Choosing the right level per checkpoint is the difference between a maintainable suite and a noisy one. Applitools offers four primary match levels.

| Match Level | What it compares | Best for |
|---|---|---|
| Strict | Perceptual comparison as a human sees it (default) | Most static UI -- the recommended default |
| Layout | Structure and position only, ignores content and color | Pages with dynamic text, prices, timestamps, user data |
| Content | Text and content, tolerant of styling/color shifts | Copy-heavy pages where wording matters but styling varies |
| Exact | Pixel-by-pixel comparison (legacy) | Rarely recommended -- reintroduces false positives |

The most valuable non-default level is **Layout**. When a page contains dynamic data -- a live product price, a "posted 3 minutes ago" timestamp, or a personalized username -- Strict mode would flag every run. Layout mode ignores the actual text while still verifying that the element exists in the right place with the right structure.

\`\`\`typescript
// Use Layout on a region with dynamic content, Strict everywhere else
await eyes.check(
  'Dashboard with live data',
  Target.window()
    .fully()
    .layoutRegions('[data-testid="live-price"]', '[data-testid="timestamp"]')
);

// Ignore a region entirely (e.g., an ad slot or a rotating banner)
await eyes.check(
  'Article page',
  Target.window().fully().ignoreRegions('.ad-slot', '#cookie-banner')
);
\`\`\`

The rule of thumb: default to Strict, apply Layout to the specific regions that carry dynamic content, and reserve Ignore for regions that are genuinely non-deterministic like third-party ad iframes.

## The Ultrafast Grid: Cross-Browser Coverage at Speed

The Ultrafast Grid is Applitools' most compelling performance feature. In a traditional cross-browser visual suite you would spin up Chrome, Firefox, Safari, and several device emulators locally or in a Selenium Grid, run the full test in each, and capture screenshots. That is slow, expensive, and flaky -- and our guide on [cross-browser testing](/blog/cross-browser-testing-guide) explains just how painful the traditional matrix is.

The Ultrafast Grid inverts this. Your test runs **once** in a single local browser. At each \`eyes.check()\`, the SDK captures the DOM and CSS as a snapshot and uploads it. Applitools then re-renders that snapshot server-side across every browser and device you configured, in parallel, and runs Visual AI on each rendering. You get twenty browser-device combinations for the cost of one local test run.

\`\`\`typescript
const config = new Configuration();

// Desktop browsers at multiple viewports
config.addBrowser(1920, 1080, BrowserType.CHROME);
config.addBrowser(1366, 768, BrowserType.EDGE_CHROMIUM);
config.addBrowser(1280, 800, BrowserType.FIREFOX);
config.addBrowser(1280, 800, BrowserType.SAFARI);

// Mobile device emulation rendered in the grid
config.addDeviceEmulation(DeviceName.Pixel_5, ScreenOrientation.PORTRAIT);
config.addDeviceEmulation(DeviceName.iPhone_12, ScreenOrientation.PORTRAIT);
config.addDeviceEmulation(DeviceName.iPad_Pro, ScreenOrientation.LANDSCAPE);

// Control how many render in parallel
const runner = new VisualGridRunner({ testConcurrency: 10 });
\`\`\`

Because the grid renders from a captured DOM rather than driving a live browser, results are far more deterministic than a live Selenium matrix. The same baseline is reused across browsers because Visual AI normalizes rendering differences, so you are not maintaining a separate baseline per browser.

## Applitools with Cypress

Applitools supports Cypress through the \`@applitools/eyes-cypress\` package, which adds custom commands to the Cypress command chain. Setup requires a one-time configuration step that patches Cypress support and plugin files.

\`\`\`bash
npm install --save-dev cypress @applitools/eyes-cypress
npx eyes-setup
\`\`\`

After \`eyes-setup\` wires in the commands, you get \`cy.eyesOpen\`, \`cy.eyesCheckWindow\`, and \`cy.eyesClose\` on the command chain. A typical spec looks like this:

\`\`\`javascript
describe('QASkills visual regression', () => {
  it('renders the skills directory', () => {
    cy.eyesOpen({
      appName: 'QASkills',
      testName: 'Skills directory',
      browser: [
        { width: 1280, height: 800, name: 'chrome' },
        { width: 1280, height: 800, name: 'firefox' },
        { deviceName: 'iPhone X', screenOrientation: 'portrait' },
      ],
    });

    cy.visit('https://qaskills.sh/skills');

    // Full page checkpoint
    cy.eyesCheckWindow({ tag: 'Skills listing', fully: true });

    // Region checkpoint with layout matching on dynamic content
    cy.eyesCheckWindow({
      tag: 'Filter tabs',
      target: 'region',
      selector: '[data-testid="filter-tabs"]',
      layout: [{ selector: '[data-testid="result-count"]' }],
    });

    cy.eyesClose();
  });
});
\`\`\`

The API mirrors the Playwright SDK closely, which is a deliberate design choice: Applitools keeps its cross-framework API consistent so a team that knows the Playwright integration can read Cypress or Selenium tests without relearning anything.

## Batches, Baselines, and the Review Workflow

A **batch** groups the results of a test run so reviewers see one coherent set of changes in the dashboard rather than scattered individual tests. Setting a stable batch ID per CI run is essential -- otherwise every test opens its own batch and the dashboard becomes unusable.

\`\`\`bash
# In CI, generate one batch ID per pipeline run and share it across all test jobs
export APPLITOOLS_BATCH_ID="\${GITHUB_RUN_ID}-\${GITHUB_RUN_ATTEMPT}"
export APPLITOOLS_BATCH_NAME="PR #\${PR_NUMBER}"
\`\`\`

A **baseline** is the approved reference snapshot for a given app, test name, browser, and viewport. The first time a checkpoint runs it becomes the baseline automatically. On subsequent runs Applitools compares against it. When a legitimate UI change occurs, a reviewer opens the batch in the dashboard, sees the highlighted differences, and clicks **Accept** to promote the new snapshot to the baseline or **Reject** to keep the old one and mark the test failed.

This human-in-the-loop approval is the heart of a healthy visual program. Applitools also supports **baseline branching**, which mirrors Git: a feature branch gets its own baseline forked from main, and when the branch merges, the baseline merges too. This prevents the classic problem where two feature branches fight over the same baseline.

| Concept | Purpose | Where you configure it |
|---|---|---|
| Batch | Groups results of one run for review | \`APPLITOOLS_BATCH_ID\` / \`setBatch()\` |
| Baseline | Approved reference snapshot | Auto-created; promoted via dashboard Accept |
| Match level | Comparison strictness | Per checkpoint via \`Target\` / \`layout\` option |
| Branch baseline | Isolates baselines per Git branch | \`setBaselineBranchName()\` / config |

## CI/CD Integration with GitHub Actions

Applitools fits naturally into CI because a test run is just your normal test command plus an API key and a batch ID. The key operational detail is telling Applitools *not* to fail the pipeline on a diff if you want reviewers to approve changes asynchronously, versus failing hard for a strict gate. Most teams start with a hard gate on the main branch. For a broader look at pipeline design, see our [CI/CD testing pipeline with GitHub Actions](/blog/cicd-testing-pipeline-github-actions) guide.

\`\`\`yaml
name: Visual Regression

on:
  pull_request:
    branches: [main]

jobs:
  applitools:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run Applitools visual tests
        env:
          APPLITOOLS_API_KEY: \${{ secrets.APPLITOOLS_API_KEY }}
          APPLITOOLS_BATCH_ID: \${{ github.run_id }}-\${{ github.run_attempt }}
          APPLITOOLS_BATCH_NAME: "PR #\${{ github.event.pull_request.number }}"
          APPLITOOLS_DONT_CLOSE_BATCHES: "true"
        run: npx playwright test tests/visual/
\`\`\`

The \`APPLITOOLS_DONT_CLOSE_BATCHES\` flag keeps the batch open across parallel jobs so all shards report into the same dashboard batch; a separate step or the Applitools GitHub integration closes it at the end. The Applitools status check then appears on the pull request, linking directly to the batch for one-click review.

## Applitools vs Percy vs BackstopJS vs Playwright Built-In

Applitools is a paid platform, so the central question for most teams is whether Visual AI justifies the cost over free or cheaper alternatives. Here is an honest comparison.

| Feature | Applitools Eyes | Percy | BackstopJS | Playwright \`toHaveScreenshot\` |
|---|---|---|---|---|
| Comparison engine | Visual AI (perceptual) | Pixel + smart diff | Pixel diff (resemble.js) | Pixel diff |
| False-positive rate | Very low | Moderate | High | High |
| Cross-browser via cloud grid | Yes (Ultrafast Grid) | Yes (limited) | Self-managed | Local only |
| Baseline management | Dashboard + branching | Dashboard | Local files | Local files in repo |
| Framework support | 50+ SDKs | Playwright, Cypress, etc. | Puppeteer/Playwright | Playwright only |
| Cost | Paid (usage-based) | Paid | Free (open source) | Free (built in) |
| Setup effort | Low (SDK + key) | Low | Medium | Very low |

The decision usually comes down to scale and noise tolerance. If you are a small team with a handful of visual tests, Playwright's built-in \`toHaveScreenshot()\` is free and good enough. If your suite is large and pixel-diff flakiness is killing developer trust, Applitools' Visual AI is the strongest answer on the market and typically pays for itself in reduced maintenance. Percy sits in between: cloud-based and team-friendly, but with a less sophisticated comparison engine. BackstopJS is the free self-hosted option if you accept the maintenance burden.

## Letting AI Agents Generate and Maintain Applitools Suites

The newest shift in visual testing is delegating suite creation to AI coding agents. Because Applitools' API is declarative and consistent, an agent equipped with the right context can scaffold checkpoints across your whole app, choose sensible match levels, and add ignore regions for dynamic content -- work that used to take a QA engineer days. This pairs naturally with modern agent-driven test generation; see our guide on [AI test generation with Playwright](/blog/ai-test-generation-playwright-2026) for the broader pattern.

A practical workflow: give the agent a QA skill that encodes your Applitools conventions -- default match level, batch naming, which regions are dynamic, and your Ultrafast Grid matrix. The agent then reads a new page component, generates an Eyes checkpoint, and opens a PR. Combined with [auto-healing locators](/blog/playwright-auto-healing-locators), the resulting suite is remarkably low-maintenance because both the selectors and the visual baselines self-adjust to intentional change while still catching regressions. You can browse ready-made QA skills for exactly this at [QASkills.sh](/skills).

## Best Practices for a Maintainable Applitools Suite

A few disciplines separate a visual suite people trust from one they ignore. First, **stabilize the environment**: disable animations and transitions before capturing, wait for fonts and network activity to settle, and seed deterministic test data so the DOM is identical run to run. Second, **default to Strict, scope Layout precisely**: over-applying Layout mode hides real regressions, so use it only on genuinely dynamic regions. Third, **name checkpoints and tests meaningfully** so reviewers in the dashboard know exactly what they are approving.

\`\`\`typescript
// Stabilize before every checkpoint
await page.addStyleTag({
  content: \`*, *::before, *::after {
    animation-duration: 0s !important;
    transition-duration: 0s !important;
    caret-color: transparent !important;
  }\`,
});
await page.evaluate(() => document.fonts.ready);
await page.waitForLoadState('networkidle');

await eyes.check('Stable dashboard', Target.window().fully());
\`\`\`

Fourth, **keep one batch per CI run** so review is coherent. Fifth, **use branch baselines** so feature work does not clobber the main baseline. Finally, treat the dashboard review as a required gate, not an afterthought -- the whole value of Visual AI is that a five-second human approval replaces a manual visual audit.

## Frequently Asked Questions

### What is Applitools Eyes and how is it different from screenshot testing?

Applitools Eyes is a visual testing SDK backed by the Visual AI comparison engine. Unlike traditional screenshot testing that compares images pixel by pixel, Eyes evaluates snapshots perceptually -- the way a human eye would. This means it ignores meaningless differences like anti-aliasing or sub-pixel rendering shifts while still catching real regressions such as missing elements, overlapping text, or broken layouts.

### How does Applitools Visual AI reduce false positives?

Visual AI models human perception rather than raw pixels. It segments a page into structural regions, understands content and layout, and only flags differences that a real user would notice. Pixel-diff tools fail when a browser update changes font hinting or GPU rendering; Visual AI normalizes those rendering variations, which is why teams migrating to Applitools often see false-positive visual failures drop by roughly an order of magnitude.

### Does Applitools work with Playwright and Cypress?

Yes. Applitools ships dedicated SDKs for both -- \`@applitools/eyes-playwright\` and \`@applitools/eyes-cypress\` -- alongside Selenium, WebdriverIO, Storybook, and more than 50 total integrations. The API is deliberately consistent across frameworks, so \`eyes.check()\` in Playwright maps directly to \`cy.eyesCheckWindow()\` in Cypress, making it easy for teams that use multiple frameworks.

### What is the Applitools Ultrafast Grid?

The Ultrafast Grid renders a single captured DOM snapshot across many browser and device combinations in the Applitools cloud, in parallel. Your test runs once locally; the grid re-renders that snapshot on Chrome, Firefox, Safari, Edge, and mobile emulators server-side. This gives you full cross-browser visual coverage for the cost of one local test run, with far more determinism than a live Selenium grid.

### How much does Applitools cost compared to free alternatives?

Applitools is a paid, usage-based platform, while Playwright's built-in \`toHaveScreenshot()\` and BackstopJS are free. The trade-off is Visual AI and the Ultrafast Grid, which sharply reduce maintenance and false positives. Small teams with a few visual tests often stay on the free built-in tools; larger teams where pixel-diff flakiness erodes trust typically find Applitools pays for itself in reduced maintenance time.

### When should I use Layout match level instead of Strict?

Use Layout match level on regions containing dynamic content -- live prices, timestamps, usernames, or rotating data -- where the text changes every run but the structure should stay fixed. Layout ignores the actual content and color while still verifying the element exists in the right position. Keep Strict as the default everywhere else, since over-applying Layout can hide genuine regressions.

### How do I integrate Applitools into a CI/CD pipeline?

Set your \`APPLITOOLS_API_KEY\` as a CI secret and generate one stable \`APPLITOOLS_BATCH_ID\` per pipeline run so all parallel shards report into the same reviewable batch. Then run your normal test command. The Applitools status check appears on the pull request and links to the dashboard, where a reviewer accepts or rejects visual changes with a single click.

## Conclusion

Applitools earns its reputation by solving the single hardest problem in visual testing: trust. Visual AI turns a noisy pixel-diff suite into one that only fails on real bugs, the Ultrafast Grid makes cross-browser coverage cheap and deterministic, and the dashboard review workflow reduces visual QA to fast approve-or-reject decisions. The consistent SDK across Playwright, Cypress, Selenium, and beyond means you can adopt it without rewriting your test strategy, and the match-level and batching controls give you precise command over strictness and review.

If you are building or maintaining a visual regression program -- especially one where flaky screenshot tests have already burned your team's trust -- Applitools is the strongest platform on the market, and pairing it with AI coding agents makes suite creation and upkeep nearly hands-free. Explore ready-to-use QA skills that teach your agents to scaffold and maintain Applitools, Playwright, and Cypress suites at [QASkills.sh/skills](/skills), and give your team a visual testing setup that actually gets trusted.
`,
};
