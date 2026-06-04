import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Percy + Playwright Visual Testing Complete Guide 2026',
  description:
    'Set up Percy visual testing with Playwright in 2026: @percy/playwright, percySnapshot, responsive widths, CI integration, and BrowserStack cloud rendering.',
  date: '2026-06-02',
  category: 'Guide',
  content: `
# Percy + Playwright Visual Testing Complete Guide 2026

Playwright is brilliant at functional testing: it clicks, types, waits, and asserts against the DOM with rock-solid reliability. But functional tests are blind to a whole class of bugs that only a human eye would catch. A button that renders the right text but with the wrong background color passes every \`expect(locator).toHaveText()\` assertion. A layout that breaks at 768px wide still has all the correct elements in the DOM. A web font that fails to load and silently falls back to Times New Roman changes nothing your selectors can see. These are visual bugs, and catching them is what Percy does.

Percy, now part of BrowserStack, is a visual testing platform that captures snapshots of your rendered pages, re-renders them in its own controlled cloud environment across the widths and browsers you configure, and diffs every snapshot against an approved baseline. Pairing Percy with Playwright gives you the best of both worlds: Playwright drives the application to the exact state you want to test, and Percy captures and compares the pixels. The integration is a single function call — \`percySnapshot()\` — dropped into your existing Playwright tests.

This guide is a complete, practical walkthrough for 2026: installing \`@percy/playwright\` and the Percy CLI, taking your first snapshot, configuring responsive widths and browsers, handling dynamic and flaky content, wiring it into CI, and understanding how Percy's BrowserStack-backed rendering grid produces consistent results regardless of where your tests run. Every section includes runnable TypeScript. By the end you will be able to add visual coverage to an existing Playwright suite and review diffs with confidence. For broader context, see our [visual regression testing guide](/blog) and the [QA skills directory](/skills).

## Why Add Visual Testing to Playwright

Functional and visual testing answer different questions. A functional test answers "does the app do the right thing?" A visual test answers "does the app look the right way?" You need both, because plenty of bugs pass one check and fail the other.

Consider these real bugs that functional tests cannot catch:

- A CSS refactor accidentally removes \`overflow: hidden\` and content spills out of a card. The DOM is unchanged; only the pixels are wrong.
- A design token update changes the primary color from blue to a slightly-off blue. Every text and role assertion still passes.
- A third-party script injects an extra margin that pushes the footer below the fold on mobile. No element is missing.
- A font swap shifts line heights, causing a heading to wrap to two lines and overlap the element below it.

Playwright has a built-in \`toHaveScreenshot()\` assertion, and for small projects it is a fine starting point. The reason teams reach for Percy instead is rendering consistency and review workflow. Local screenshots are notoriously environment-dependent — fonts, GPU, OS antialiasing, and headless-vs-headed all produce pixel differences that create false positives. Percy re-renders every snapshot in a single controlled cloud environment, so a snapshot taken on a Mac laptop and one taken on a Linux CI runner produce identical pixels. Percy also gives you a review UI with baseline management, approvals, and per-branch baselines that a folder of PNGs cannot.

## Installation and Setup

Percy with Playwright needs two packages: the Percy CLI (which runs your tests and uploads snapshots) and the \`@percy/playwright\` SDK (which provides the \`percySnapshot\` function).

\`\`\`bash
npm install --save-dev @percy/cli @percy/playwright
\`\`\`

Authenticate by setting your project token, which you get from the Percy dashboard. Never hardcode it; use an environment variable:

\`\`\`bash
export PERCY_TOKEN="web_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
\`\`\`

Create a Percy config file at the repo root. This controls the widths, browsers, and rendering behavior for every snapshot:

\`\`\`yaml
# .percy.yml
version: 2
snapshot:
  widths:
    - 375   # mobile
    - 768   # tablet
    - 1280  # desktop
  min-height: 1024
  percy-css: |
    /* Hide elements that are inherently non-deterministic */
    .timestamp, .ad-slot, [data-percy-hide] { visibility: hidden !important; }
discovery:
  network-idle-timeout: 250
\`\`\`

That is the entire setup. Your existing Playwright config (\`playwright.config.ts\`) does not change at all — Percy wraps the test run from the outside.

## Your First Snapshot

The integration is one import and one function call. Here is a complete Playwright test that takes a Percy snapshot of a homepage:

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { percySnapshot } from '@percy/playwright';

test('homepage renders correctly', async ({ page }) => {
  await page.goto('https://example.com');

  // Drive the page to the exact state you want to capture.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Capture the visual snapshot. The name must be unique and stable.
  await percySnapshot(page, 'Homepage - logged out');
});
\`\`\`

The crucial thing to understand: Percy does not diff anything during this test run. \`percySnapshot()\` captures the DOM, CSS, and assets of the current page state and ships them to Percy's servers. The actual rendering and diffing happens in the cloud afterward. That is why you do not run this with \`playwright test\` directly — you wrap it with the Percy CLI:

\`\`\`bash
npx percy exec -- playwright test
\`\`\`

\`percy exec\` starts a local Percy server, runs your Playwright command, intercepts every \`percySnapshot\` call, uploads the captured state, and on completion tells Percy's grid to render and diff all snapshots. The result is a build in the Percy dashboard with every snapshot and any detected diffs.

The snapshot **name** matters more than it looks. It is the identity Percy uses to match a snapshot to its baseline across builds. Names must be unique within a build and stable across builds — never include a timestamp, random ID, or run number in the name, or Percy will treat every run as a brand-new snapshot with no baseline.

## Responsive Width Testing

The biggest payoff of Percy over manual screenshots is effortless responsive coverage. You declare the widths once in \`.percy.yml\`, and every \`percySnapshot\` call automatically renders at all of them. A single snapshot call at three widths produces three images to review, each diffed against its own width-specific baseline.

You can also override widths per snapshot when a particular page only matters at certain breakpoints:

\`\`\`typescript
test('pricing page is responsive', async ({ page }) => {
  await page.goto('https://example.com/pricing');
  await expect(page.getByRole('heading', { name: /pricing/i })).toBeVisible();

  // Override the global widths for this snapshot only.
  await percySnapshot(page, 'Pricing page', {
    widths: [375, 414, 768, 1024, 1440],
  });
});
\`\`\`

Here is how to think about which widths to test:

| Width | Represents | When to include |
|---|---|---|
| 375 | iPhone-class mobile portrait | Always — mobile is where layout breaks most |
| 414 | Large phones | If you have distinct large-phone layouts |
| 768 | Tablet portrait / common breakpoint boundary | Always — catches breakpoint edge bugs |
| 1024 | Tablet landscape / small laptop | If your nav or grid changes here |
| 1280 | Standard desktop | Always — your primary desktop experience |
| 1440 | Large desktop | If you have max-width containers worth verifying |

A practical default is \`[375, 768, 1280]\` — three widths that catch the overwhelming majority of responsive bugs without tripling your snapshot count unnecessarily. Add more only where you have real layout differences, because each width is a separate billed snapshot.

## Handling Dynamic Content

The number-one cause of flaky visual tests is non-deterministic content: timestamps, animations, ads, carousels that auto-advance, randomized data, and lazy-loaded images that have not finished loading. If the content changes between the baseline run and the comparison run, every build shows a diff and reviewers learn to ignore them — which defeats the purpose. You have three tools to fix this.

**1. Percy-specific CSS.** The \`percy-css\` block in \`.percy.yml\` (or a per-snapshot \`percyCSS\` option) applies only during Percy's render, never affecting real users. Use it to hide or neutralize volatile elements:

\`\`\`typescript
await percySnapshot(page, 'Dashboard', {
  percyCSS: \`
    .live-clock { visibility: hidden; }
    .notification-badge { display: none; }
    * { animation: none !important; transition: none !important; }
  \`,
});
\`\`\`

Disabling all animations and transitions with \`* { animation: none; transition: none; }\` is one of the highest-value lines you can add — it eliminates a huge category of timing-related diffs.

**2. Stabilize the data with Playwright.** Rather than hiding dynamic content, freeze it. Mock network responses so the rendered data is identical every run, and freeze the clock so timestamps do not move:

\`\`\`typescript
test('feed with stable data', async ({ page }) => {
  // Freeze time so any "2 minutes ago" labels are deterministic.
  await page.clock.setFixedTime(new Date('2026-06-02T12:00:00Z'));

  // Return a fixed payload so the feed content never varies.
  await page.route('**/api/feed', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [{ id: 1, title: 'Stable item' }] }),
    }),
  );

  await page.goto('https://example.com/feed');
  await expect(page.getByText('Stable item')).toBeVisible();
  await percySnapshot(page, 'Feed - stable data');
});
\`\`\`

**3. Wait for the real end state.** Never snapshot a page mid-load. Always assert that the meaningful content is present and stable before capturing, using Playwright's web-first assertions. Waiting for a spinner to disappear or an image to be visible prevents capturing a half-rendered frame:

\`\`\`typescript
await expect(page.getByTestId('loading-spinner')).toBeHidden();
await expect(page.getByRole('img', { name: 'Hero' })).toBeVisible();
await percySnapshot(page, 'Landing - fully loaded');
\`\`\`

Prefer stabilizing data (option 2) over hiding it (option 1) wherever practical, because hidden elements can themselves shift layout, and you lose visual coverage of the hidden region.

## CI Integration with GitHub Actions

Percy is built for CI. The flow is identical to local: wrap your Playwright command with \`percy exec\`, and provide \`PERCY_TOKEN\` as a secret. Percy auto-detects most CI providers and reads the branch, commit, and pull-request metadata from environment variables so it can manage per-branch baselines correctly.

\`\`\`yaml
name: Visual Tests

on: [push, pull_request]

jobs:
  percy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run Percy visual tests
        run: npx percy exec -- playwright test
        env:
          PERCY_TOKEN: \${{ secrets.PERCY_TOKEN }}
\`\`\`

A few CI-specific notes:

- On pull requests, Percy automatically compares against the baseline from the target branch (usually \`main\`) and posts a status check with a link to the diff review. Approving snapshots in the Percy UI turns the check green.
- Percy de-duplicates rendering across snapshots in the same build, so a 100-snapshot build is fast — the heavy lifting is in Percy's grid, not your runner.
- You only need to install the Chromium browser for Playwright to *capture* the page; Percy re-renders in its own browsers in the cloud, so you do not need every browser installed in CI just for visual coverage.

For parallelized Playwright runs across multiple CI shards, set a consistent \`PERCY_PARALLEL_NONCE\` and \`PERCY_PARALLEL_TOTAL\` so Percy groups all shards into one logical build and finalizes it only after the last shard reports in. The Percy CLI sets these automatically on supported CI providers, but you can set them manually if your sharding is custom.

## How Percy's BrowserStack Rendering Works

Understanding Percy's architecture explains why it is more reliable than local screenshots and how the BrowserStack integration adds real cross-browser coverage.

When \`percySnapshot()\` runs, Percy does **not** screenshot your live browser. Instead, it serializes the page: the full DOM, all CSS, and every asset (images, fonts, stylesheets) needed to reconstruct that exact state. This serialized bundle is uploaded to Percy. Then Percy's rendering grid loads that bundle in a clean, controlled browser environment and captures the actual pixels at each configured width. Because the render environment is identical every time — same OS, same fonts, same browser build — the output is deterministic. This is the key difference from \`toHaveScreenshot()\`, which captures pixels from whatever browser and OS your test happens to run on.

Since Percy joined BrowserStack, the rendering grid is backed by BrowserStack's infrastructure, which unlocks true cross-browser visual testing. You can configure Percy to render each snapshot in multiple browsers, so the same captured DOM is diffed in Chrome, Firefox, Safari, and Edge:

\`\`\`yaml
# .percy.yml
version: 2
snapshot:
  widths: [375, 1280]
  browsers:
    - chrome
    - firefox
    - safari
    - edge
\`\`\`

Here is the comparison that matters when deciding between local screenshots and Percy:

| Concern | Playwright toHaveScreenshot | Percy + Playwright |
|---|---|---|
| Rendering environment | Your machine / CI runner (varies) | Controlled cloud grid (consistent) |
| Cross-browser pixels | Only browsers you install and run | Chrome, Firefox, Safari, Edge in the cloud |
| Baseline storage | PNGs committed to git | Managed in Percy dashboard, per branch |
| Review workflow | Read git diffs of binary files | Visual side-by-side UI with approve/reject |
| Responsive widths | Manual viewport changes per test | Declared once, applied to every snapshot |
| False positives from env | Common (fonts, GPU, antialiasing) | Rare (identical render every time) |
| Cost | Free (CI compute only) | Per-snapshot subscription |

The trade-off is clear: \`toHaveScreenshot()\` is free and self-contained but fragile across environments and awkward to review at scale; Percy costs money but eliminates environment flakiness, adds real cross-browser rendering, and provides a proper review workflow. For a small project with one developer, the built-in assertion is fine. For a team shipping a UI that real users see across browsers and devices, Percy's consistency pays for itself in reduced false positives alone.

## Responsive and Component-Level Snapshots

Beyond full-page snapshots, you can scope Percy to specific regions or test individual components in isolation. Scoping reduces noise by ignoring unrelated parts of the page and keeps diffs focused.

To snapshot a single component rather than the full page, use the \`scope\` option with a CSS selector. Percy will render the full page but only diff the matching element:

\`\`\`typescript
test('product card component', async ({ page }) => {
  await page.goto('https://example.com/products');
  await expect(page.getByTestId('product-card').first()).toBeVisible();

  await percySnapshot(page, 'Product card', {
    scope: '[data-testid="product-card"]',
    widths: [375, 768],
  });
});
\`\`\`

For design systems, a powerful pattern is driving Storybook stories with Playwright and snapshotting each one. You navigate to each story's iframe URL and capture it, giving you Percy coverage of every component variant without writing bespoke pages:

\`\`\`typescript
const stories = [
  { id: 'button--primary', name: 'Button / Primary' },
  { id: 'button--danger', name: 'Button / Danger' },
  { id: 'input--with-error', name: 'Input / With error' },
];

for (const story of stories) {
  test(\`story: \${story.name}\`, async ({ page }) => {
    await page.goto(\`http://localhost:6006/iframe.html?id=\${story.id}\`);
    await expect(page.locator('#storybook-root')).toBeVisible();
    await percySnapshot(page, story.name);
  });
}
\`\`\`

This combines Playwright's navigation with Percy's rendering to give per-component visual regression coverage that scales with your component library.

## Frequently Asked Questions

### Do I run Percy with playwright test or percy exec?

You must use \`npx percy exec -- playwright test\`. Running \`playwright test\` directly will execute the \`percySnapshot\` calls as no-ops because there is no Percy server to receive the captured snapshots. \`percy exec\` starts that server, runs your command, intercepts the snapshots, uploads them, and triggers cloud rendering and diffing once the run completes.

### Why does percySnapshot not fail my test when there is a visual diff?

By design. \`percySnapshot()\` only captures and uploads the page state; it does not diff during the test run. Diffing happens in Percy's cloud after the build finishes, and results appear in the Percy dashboard and as a CI status check. This keeps your Playwright run fast and lets visual review happen asynchronously rather than blocking the test process.

### How is Percy different from Playwright's toHaveScreenshot?

\`toHaveScreenshot()\` captures pixels from your local or CI browser and stores baselines as PNGs in git, which makes it environment-dependent and prone to false positives from font and GPU differences. Percy serializes the DOM and re-renders it in a controlled cloud grid, producing identical pixels every run, adds real cross-browser rendering via BrowserStack, and provides a managed review UI with per-branch baselines.

### How do I stop dynamic content from causing flaky diffs?

Use three techniques together: disable animations and hide volatile elements with \`percyCSS\`, freeze time with \`page.clock.setFixedTime()\` and mock APIs with \`page.route()\` so data is deterministic, and always wait for the page's real end state with Playwright assertions before snapshotting. Stabilizing data is preferable to hiding it because hidden elements can still shift layout.

### How many responsive widths should I test?

A practical default is three widths — \`[375, 768, 1280]\` — covering mobile, tablet/breakpoint boundary, and desktop. This catches the vast majority of responsive bugs. Add more widths (414, 1024, 1440) only where you have genuinely different layouts, since each width is a separately billed snapshot and unnecessary widths inflate cost without adding coverage.

### Can Percy test multiple browsers?

Yes. Because Percy re-renders the captured DOM in its own BrowserStack-backed grid, you can list \`chrome\`, \`firefox\`, \`safari\`, and \`edge\` under \`browsers\` in \`.percy.yml\`, and every snapshot is diffed in each. You do not need those browsers installed locally — Playwright only needs to capture the page once, and Percy handles the cross-browser rendering in the cloud.

### Does Percy work with parallelized Playwright shards?

Yes. Percy groups snapshots from multiple parallel shards into one build using a shared parallel nonce and a total-shard count, finalizing the build only after the last shard reports. On supported CI providers the Percy CLI sets these values automatically; for custom sharding you set \`PERCY_PARALLEL_NONCE\` and \`PERCY_PARALLEL_TOTAL\` yourself so the build is not finalized prematurely.

### What should I name my snapshots?

Use a unique, human-readable, and stable name like "Homepage - logged out" or "Pricing page". The name is how Percy matches a snapshot to its baseline across builds, so it must never contain a timestamp, random value, or run number — that would make every run look like a new snapshot with no baseline and you would never see meaningful diffs.

## Conclusion

Percy and Playwright are a natural pairing: Playwright drives your application to precisely the state you want to verify, and Percy captures and diffs the pixels in a controlled environment that eliminates the false positives that plague local screenshots. The integration is genuinely a one-liner — \`percySnapshot(page, 'name')\` — and the real work is in the supporting practices: declaring sensible responsive widths, stabilizing dynamic content with mocking and clock control, and wiring \`percy exec\` into CI with the project token as a secret.

Start small. Add \`percySnapshot\` calls to a handful of your most important pages, configure \`[375, 768, 1280]\` widths, disable animations in \`percyCSS\`, and run a few builds to establish baselines. Expand coverage to components and Storybook stories once the workflow feels natural, and lean on Percy's BrowserStack rendering when you need true cross-browser pixel verification. The result is a UI you can refactor fearlessly, knowing that any unintended visual change will surface in review before it reaches users.

Want ready-made visual testing skills your AI coding agent can apply? Explore the [QA skills directory](/skills), compare visual testing tools on our [comparison pages](/compare), and find more in-depth guides on the [QASkills blog](/blog).
`,
};
