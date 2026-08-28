import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Percy and BrowserStack: How the Integration Works for Visual Testing',
  description: 'Percy BrowserStack integration explained for QA teams: choose Percy Web or Automate, wire snapshots, reduce visual noise, and review PRs faster.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Percy and BrowserStack: How the Integration Works for Visual Testing

Percy BrowserStack integration means your automated tests run through BrowserStack or your local browser, capture visual snapshots through Percy SDK calls, upload DOM and asset data to Percy, render comparisons in Percy infrastructure, and report visual diffs back to your review workflow. Choose Percy Web for focused latest-browser visual checks. Choose Percy on Automate when the browser and device matrix matters.

The integration is often misunderstood because BrowserStack owns Percy, but there are still distinct project types, tokens, SDK paths, and review concepts. BrowserStack documentation describes two main setup paths: BrowserStack SDK, which unifies functional and visual configuration, and Percy SDK, which gives direct snapshot calls inside your tests. Official starting point: https://www.browserstack.com/docs/percy/overview/percy-integration-options

## The Mental Model: Functional Run, Visual Snapshot, Review Build

A functional test answers "did the workflow behave correctly." A Percy snapshot answers "did the rendered UI change from the approved baseline." BrowserStack can provide the browser, operating system, and device infrastructure. Percy provides the visual baseline, rendering, diffing, approval, and notification workflow.

That separation helps QA teams design good tests. You do not need a Percy snapshot after every click. You need a snapshot at stable UI states that carry visual risk: pricing tables, dashboards, checkout review screens, responsive navigation, error states, permission dialogs, and component library examples. The functional test gets the app there. Percy records what it should look like.

| Layer | Owned By | QA Concern | Failure Looks Like |
|---|---|---|---|
| Test runner | Your repo | Navigation, setup data, assertions | Test timeout or failed assertion |
| Browser execution | Local, CI, or BrowserStack Automate | Browser coverage and environment parity | Browser launch or capability failure |
| Snapshot SDK | Percy or BrowserStack SDK | Capture timing and snapshot name | Missing snapshot or duplicate name |
| Percy rendering | Percy | DOM assets, widths, browser rendering | Diff noise or missing assets |
| Review workflow | Percy plus SCM integration | Approval, triage, merge gate | Build blocked or ignored diffs |

The best visual suites are small and intentional. A 600-snapshot build that no one reviews is worse than a 40-snapshot build that blocks real regressions.

## Percy Web Versus Percy on Automate

The product names matter. Percy Web focuses on web visual testing where Percy manages current browser rendering choices. Percy on Automate ties visual screenshots to BrowserStack Automate sessions so you can cover specific OS, browser, version, and device combinations. BrowserStack's project type documentation notes different commands and token prefixes for project types, so do not mix setup snippets blindly.

| Decision | Percy Web | Percy on Automate |
|---|---|---|
| Primary goal | Fast visual review on modern browsers | Visual review across a defined BrowserStack matrix |
| Browser management | Percy project settings or supported Percy flow | BrowserStack capabilities and browserstack.yml |
| Typical command | percy snapshot or percy exec with SDK | BrowserStack SDK or Automate session plus Percy call |
| Best fit | Component libraries, main responsive pages, PR checks | Regulated browser matrices, mobile web, legacy coverage |
| Common mistake | Expecting every OS/browser combination | Forgetting Automate cost and parallel limits |

For a Playwright team already using Percy, [Percy Playwright Visual Testing Guide](/blog/percy-playwright-visual-testing-guide) is the faster path. For visual testing strategy independent of BrowserStack, use [Percy Visual Testing Complete Guide](/blog/percy-visual-testing-complete-guide). This article stays focused on where BrowserStack changes the workflow.

## A Minimal Percy Web Flow

The direct Percy SDK pattern is simple. Install the CLI and the framework client, set the project token in CI, run the tests through percy exec, and call the snapshot function at stable points. The example below uses Playwright because it makes page state and waiting explicit.

\`\`\`javascript
const { chromium } = require('playwright');
const percySnapshot = require('@percy/playwright');

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    await page.goto('https://example.com/', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').waitFor();
    await percySnapshot(page, 'example-home-desktop');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
\`\`\`

Run it like this after setting a real project token in your shell or CI secret store:

\`\`\`bash
npm install --save-dev @percy/cli @percy/playwright playwright
npx percy exec -- node visual-smoke.js
\`\`\`

The snapshot name is part of the baseline identity. Make it stable and descriptive. Do not include a random id, a timestamp, or a branch name unless you intentionally want new baselines all the time.

## BrowserStack SDK Flow

The BrowserStack SDK path lets teams keep BrowserStack Automate and Percy configuration in one place. BrowserStack docs show browserstack.yml values such as percy enabled, projectName, browserstackAutomation enabled, and a capture mode. The exact available keys depend on SDK and language, so confirm against the documentation page for your framework.

A representative configuration looks like this:

\`\`\`yaml
userName: "YOUR_USERNAME"
accessKey: "YOUR_ACCESS_KEY"
projectName: "qa-skills-visual"
buildName: "pull-request-visual-check"
browserstackAutomation: true
percy: true
percyCaptureMode: manual
platforms:
  - os: "Windows"
    osVersion: "11"
    browserName: "Chrome"
    browserVersion: "latest"
  - os: "OS X"
    osVersion: "Ventura"
    browserName: "Safari"
    browserVersion: "latest"
parallelsPerPlatform: 1
browserstackLocal: true
\`\`\`

Manual capture mode is easier for QA teams to reason about because the test decides exactly when the page is stable enough to snapshot. Automatic capture can be useful, but it often records transitional UI states until the team tunes waits, ignores, and capture rules.

In Selenium JavaScript using BrowserStack's SDK, the snapshot call shape is documented as percy.snapshot(driver, name). A compact test might look like this:

\`\`\`javascript
const { Builder, By, until } = require('selenium-webdriver');
const { percy } = require('browserstack-node-sdk');

async function run() {
  const driver = await new Builder()
    .usingServer('http://hub.browserstack.com/wd/hub')
    .withCapabilities({
      browserName: 'Chrome',
      browserVersion: 'latest',
      'bstack:options': {
        os: 'Windows',
        osVersion: '11',
        projectName: 'qa-skills-visual',
        buildName: 'manual-percy-snapshot'
      }
    })
    .build();

  try {
    await driver.get('https://example.com/');
    await driver.wait(until.elementLocated(By.css('h1')), 10000);
    await percy.snapshot(driver, 'example-home-chrome-windows');
  } finally {
    await driver.quit();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
\`\`\`

Do not paste that into a suite without setting credentials and package versions. The code is complete, but BrowserStack access is an external dependency. Keep secrets in CI secret storage, not in the repository.

## Snapshot Boundaries That Reduce Review Fatigue

Visual tests fail socially before they fail technically. If the team sees too much noise, it stops reviewing. Percy has features for review and filtering, but capture discipline still matters.

Use snapshots at UI contracts. A UI contract is a screen state where layout, hierarchy, text wrapping, imagery, or component composition matters to users. It is not every route. It is not every hover state unless hover behavior has broken before. It is not a spinner that appears for 200 milliseconds.

| Screen State | Snapshot? | Reason |
|---|---:|---|
| Empty dashboard after first signup | Yes | Empty states often lose actions and helper text |
| Loading spinner mid-fetch | Usually no | Timing noise creates unstable diffs |
| Pricing page with monthly plan selected | Yes | Commercial UI needs layout integrity |
| Admin table with 200 rows | Maybe | Snapshot a representative viewport, not all rows |
| Toast notification after save | Maybe | Useful only if toast placement has regressed before |
| Date picker open state | Yes | Popovers frequently break clipping and z-index |

Before capturing, freeze the state you control. Seed deterministic data. Disable animations for visual mode. Use stable clocks when the app supports them. Hide third-party widgets that are not part of your contract. Do not mask half the page and call the test useful.

\`\`\`css
*,
*::before,
*::after {
  animation-duration: 0s !important;
  transition-duration: 0s !important;
  caret-color: transparent !important;
}

[data-visual-ignore="true"] {
  visibility: hidden !important;
}
\`\`\`

Percy supports per-snapshot options in several SDKs. Use CSS overrides to remove nondeterminism, not to make broken layout pass.

## Local Testing With BrowserStack Local

Many teams need to test staging apps behind VPNs, firewalls, or local dev servers. BrowserStack Local creates a secure connection so BrowserStack browsers can reach those environments. For visual testing, this matters because Percy must capture the DOM and assets that correspond to the same app state the browser sees.

The most common issue is not the tunnel itself. It is asset reachability. A page can render in the remote browser while Percy rendering later misses fonts, images, or CSS because URLs require a cookie, signed link, or local-only host that was not captured. When that happens, the diff shows broken images or fallback fonts rather than the real UI change.

Use a controlled page first:

\`\`\`html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Visual Smoke</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; }
      .panel { border: 1px solid #333; padding: 24px; width: 360px; }
    </style>
  </head>
  <body>
    <main class="panel">
      <h1>Visual Smoke</h1>
      <p>This page checks tunnel, CSS, font fallback, and capture timing.</p>
    </main>
  </body>
</html>
\`\`\`

If that page captures cleanly through the tunnel, move to an authenticated staging page. If it fails, do not debug your product page yet. Debug the path.

## CI Wiring and Merge Gates

Percy builds should map cleanly to commits and pull requests. The goal is not only to upload screenshots. The goal is to make visual review a required part of change review without turning every PR into a waiting room.

A GitHub Actions job for direct Percy with Playwright can stay small:

\`\`\`yaml
name: visual

on:
  pull_request:

jobs:
  percy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx percy exec -- npm run test:visual
        env:
          PERCY_TOKEN: \${{ secrets.PERCY_TOKEN }}
\`\`\`

For BrowserStack SDK jobs, you also need BrowserStack credentials. Keep the job separate from the main functional suite until the team understands duration and review load. A visual job that blocks every PR but takes longer than the app tests will be bypassed politically.

## Failure Story: The Font Diff That Was Not a Font Diff

The symptom was a Percy build showing every dashboard number shifted by a few pixels on Windows Chrome. The first theory was that a font package changed. The second theory was that BrowserStack's Windows image had updated. Both were reasonable, and both sent the team in the wrong direction.

The actual cause was an authentication redirect during asset capture. The app shell loaded in the test browser because the session was authenticated, but a CSS file referenced by an absolute asset host returned a login page during Percy resource capture. Percy rendered the page with fallback CSS. The visual diff looked like font drift, spacing drift, and card height changes across the whole screen.

The fix was to allow Percy capture to access the asset host in the visual test environment, then add a pre-snapshot check that the main stylesheet response contained text/css. The durable lesson: large visual diffs are often infrastructure diffs. Before reviewing pixels, verify the DOM, CSS, images, and fonts were captured.

## What Practitioners Get Wrong

The common mistake is using Percy as a screenshot archive. Percy is a baseline review system. A screenshot archive asks "what happened." A baseline review asks "did this approved interface change." That difference changes naming, data setup, and triage.

Another mistake is making visual tests too late in the journey. If the test signs up, creates a workspace, imports data, changes settings, and then snapshots the billing page, any upstream flake blocks visual feedback. Prefer direct state setup through API or fixtures, then navigate to the UI state. Functional journeys should prove journeys. Visual checks should inspect contracts.

Finally, do not approve diffs casually. Approval rewrites the team's memory. If a button shifts because a CSS reset changed, find the reset. If text wraps because copy changed, decide whether the new wrap is acceptable on each viewport. "Approve all" is not triage. It is deleting signal.

## A Review Workflow QA Teams Can Live With

Use a three-label triage model: intended, defect, noise. Intended changes get approved after the product owner or reviewer agrees. Defects become bugs or PR comments. Noise gets fixed in test setup, CSS stabilization, data seeding, or ignored regions only when the region is truly nondeterministic.

| Diff Type | Example | Action |
|---|---|---|
| Intended | New plan card on pricing page | Approve baseline after product review |
| Defect | Primary CTA clipped on mobile | Block merge and attach Percy snapshot |
| Noise | Timestamp changes every run | Freeze clock or hide timestamp in visual mode |
| Environment | Missing font on one browser | Fix asset capture or browser setup |
| Coverage gap | Broken menu not snapshotted | Add focused snapshot at menu open state |

The strongest teams pair Percy review with a short written note in the pull request: what changed visually, which snapshots changed, and which were approved. That note trains reviewers to see visual testing as engineering evidence rather than a separate QA chore.

## Debugging Percy Builds Without Guessing

A failed Percy build has four broad causes: the test did not reach the intended state, the snapshot was captured too early, Percy could not capture assets, or the visual change is real. Debug in that order. If you start by reviewing pixels, you waste time on screenshots that may not represent the app.

First, add one functional assertion immediately before the snapshot. Assert the page title, key heading, selected tab, loaded data count, or disabled loading state. Second, record the viewport and snapshot name in test output. Third, inspect whether CSS and images are present in the Percy build. Fourth, compare the diff against a local screenshot from the same test state. This sequence separates test failure from render failure.

| Check | Fast Method | Interpretation |
|---|---|---|
| Page state | Assert visible heading and loaded marker before snapshot | Fails here means not a Percy problem |
| Capture timing | Wait for app-specific idle signal | Early snapshot means test synchronization problem |
| Asset capture | Look for missing fonts, CSS, images | Whole-page drift often means resource access problem |
| Viewport | Print width and height near snapshot call | Wrong baseline can come from wrong size |
| Real diff | Compare against expected product change | Approve only after review |

You can add a small helper around snapshots:

\`\`\`javascript
async function visualCheckpoint(page, name) {
  await page.locator('[data-ready-for-visual="true"]').waitFor({ timeout: 10000 });
  const size = page.viewportSize();
  console.log(JSON.stringify({ visualCheckpoint: name, viewport: size }));
  const percySnapshot = require('@percy/playwright');
  await percySnapshot(page, name);
}

module.exports = { visualCheckpoint };
\`\`\`

The data-ready-for-visual attribute should be set by the app only after data, fonts, and core layout are ready. Do not make it a magic sleep. Make it a product-owned readiness marker.

## Designing a Browser Matrix for Visual Risk

BrowserStack makes it tempting to run every visual snapshot on every platform. Resist that until you know where visual risk lives. A marketing site may need Chrome, Safari, and mobile Safari. A B2B admin console may need Chrome on Windows and Safari for executive Mac users. A consumer checkout might need mobile browser coverage before desktop breadth.

Build the matrix from incidents, analytics, and CSS risk. If your app uses sticky table headers, date inputs, file inputs, canvas, PDF previews, or responsive sidebars, choose browsers known to differ in those areas. If your user base is mostly one browser, keep PR gating narrow and run broader checks nightly.

\`\`\`json
{
  "visualMatrix": [
    { "name": "desktop-chrome", "width": 1366, "height": 768, "gate": "pull_request" },
    { "name": "desktop-safari", "width": 1440, "height": 900, "gate": "pull_request" },
    { "name": "mobile-web", "width": 390, "height": 844, "gate": "nightly" },
    { "name": "wide-dashboard", "width": 1920, "height": 1080, "gate": "nightly" }
  ]
}
\`\`\`

This matrix is intentionally small. Add cases when a real defect or business requirement justifies them. Delete cases when no one reviews them. Visual testing should create decisions, not artifacts.

## Baseline Discipline for Release Branches

Percy baseline strategy gets tricky when teams maintain release branches. A feature branch compared to main is straightforward. A hotfix branch cut from last month's release should compare against that release line, not today's main branch after a redesign. If your baseline policy is wrong, Percy will show a flood of unrelated diffs and reviewers will lose trust.

Before enabling merge gates, decide how baselines map to long-lived branches, release branches, and backports. Document who can approve diffs on each line. QA should test the SCM integration with a harmless visual fixture before relying on it during a real release. The fixture can be a page with one colored box and one label. Change it, approve it, backport it, and confirm the comparison target is what your release process expects.

## Component Snapshots and Page Snapshots Need Different Rules

Percy works well for both component libraries and full application pages, but the capture rules should not be identical. Component snapshots should isolate a single component state with controlled props, deterministic fonts, fixed container width, and no network dependency. Page snapshots should prove that real composition works: navigation, data density, responsive layout, sticky regions, modals, and empty states. Mixing those goals creates weak tests.

For components, prefer a story or fixture per meaningful state. Capture the disabled button, selected menu item, validation error, long label, and narrow container. Do not navigate through the product just to reach a component state. For pages, prefer seeded backend data and direct navigation. Do not mock away the layout pressure that production data creates. A dashboard visual test with three neat rows will miss the bug that appears with long customer names and dense metrics.

Review ownership differs too. Design-system maintainers can approve component baseline changes. Product reviewers should approve page-level changes. If a shared button changes padding, the component snapshot tells you the design system changed. The page snapshots tell you where that change causes wrapping, clipping, or visual imbalance. You need both views when the design system is actively evolving.

## Handling Dynamic Content Without Hiding the Product

Every visual suite has dynamic content: dates, avatars, generated names, charts, ads, maps, feature flags, and third-party widgets. The bad response is masking everything until the page becomes a skeleton. The good response is deciding which dynamics are part of the user contract. A revenue chart should probably be deterministic in visual tests, not hidden. A third-party chat bubble may be hidden if it is not owned by your team. A user avatar can be replaced with a stable fixture.

Keep a visible record of ignored regions and CSS overrides in the test code. Review them like production code. An ignored region that grows from a timestamp to an entire table is a coverage loss. An override that changes layout is worse than no visual test because it validates a page users never see. The rule is simple: stabilize data and timing first, hide only what your team truly does not own.

The healthiest visual suites have deletion rules. If a snapshot has not caught a defect, does not protect a reviewed surface, and slows every pull request, challenge it. Coverage is not measured by screenshot count. It is measured by whether reviewers trust the failures enough to stop a bad UI change.

That trust grows when the same snapshot name always means the same user-facing contract. Rename snapshots rarely, and when you do, treat the rename as a baseline migration that reviewers can audit.

## Frequently Asked Questions

### Is Percy the same thing as BrowserStack Automate?

No. BrowserStack Automate runs browsers and devices for functional automation. Percy handles visual snapshots, baseline comparison, diff review, and approvals. They integrate because a BrowserStack browser can drive the page state while Percy captures and compares the UI. Some teams use Percy without Automate. Other teams combine both when browser, OS, or mobile coverage is part of the visual requirement.

### Should I use Percy Web or Percy on Automate?

Use Percy Web when you want fast visual coverage on key modern browser renderings and do not need a specific OS or device matrix. Use Percy on Automate when the visual risk depends on exact BrowserStack capabilities, such as Safari on macOS, mobile browsers, or a defined enterprise browser set. The tradeoff is cost, setup complexity, and review volume.

### Why do Percy diffs show missing images or wrong fonts?

Large missing-asset diffs usually mean Percy could not capture or later fetch the same CSS, font, or image resources that the test browser used. Check authentication, asset host allowlists, tunnel access, signed URLs, and content types. Do this before reviewing pixel differences. A whole-page font shift is often an environment or capture problem, not a product CSS change.

### How many Percy snapshots should a PR run?

Run enough snapshots to cover high-value visual contracts, not every page transition. For many product teams, a focused PR job with tens of snapshots gets reviewed more consistently than hundreds. Put broad page inventories in scheduled jobs if needed. PR snapshots should be stable, named clearly, seeded with deterministic data, and tied to screens reviewers understand.
`,
};
