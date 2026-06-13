import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Percy Visual Testing + Playwright Official 2026 Guide',
  description:
    'Wire up @percy/playwright for visual regression testing. Cover percySnapshot, viewports, PERCY_TOKEN, browsers, ignore regions, CI integration, and baselines.',
  date: '2026-06-08',
  category: 'Guide',
  content: `
# Percy Visual Testing + Playwright Official 2026 Guide

Percy is BrowserStack's hosted visual regression service, and \`@percy/playwright\` is the official integration that lets you snapshot your Playwright tests, upload the renderings to Percy, and review pixel diffs in a polished web UI. Visual testing complements your functional Playwright tests by catching the bugs that functional assertions miss: a CSS regression that breaks card layouts, an unintended font swap on the marketing site, a button that overlaps another element after a refactor. This guide covers the full \`@percy/playwright\` setup from installation through CI, including viewports, browser matrix, ignore regions, baselines, the Percy CLI, and the production patterns most teams converge on.

If you are searching for \`percy visual testing playwright documentation\`, this guide walks you through every API surface and configuration option needed to get a clean, reviewable visual diff pipeline running.

## Key Takeaways

- \`@percy/playwright\` exposes a single function: \`percySnapshot(page, name, options?)\`. Call it inside any Playwright test to capture a snapshot
- Percy renders snapshots in its cloud across browsers (Chromium, Firefox, Edge, Safari) and viewports (mobile, tablet, desktop) per project config
- Authentication is via \`PERCY_TOKEN\` env var set in CI. Tokens are write-only and scoped to one project
- Run tests under the Percy CLI wrapper: \`npx percy exec -- npx playwright test\`. The CLI manages session lifecycle, upload batching, and parallel sharding
- Baselines are managed in the Percy UI: the first run becomes the baseline, subsequent runs diff against it; approve diffs to make them the new baseline

## Why Visual Testing

Functional tests prove the right text appears in the DOM. Visual tests prove the user sees what you intended. A failing visual diff catches:

- CSS regressions from refactored styles
- Font fallback bugs when a custom font fails to load
- Layout breakage from responsive media queries
- Color contrast changes
- Icon swaps
- Hidden overflow or scrollbars
- Z-index regressions

These are exactly the bugs functional tests miss because the DOM is still correct -- only the rendering changed.

## Installing @percy/playwright

\`\`\`bash
npm install --save-dev @percy/cli @percy/playwright @playwright/test
\`\`\`

The three packages serve different roles:

- \`@playwright/test\` -- Playwright runner
- \`@percy/playwright\` -- the percySnapshot integration
- \`@percy/cli\` -- the wrapper that manages Percy sessions and uploads

Verify:

\`\`\`bash
npx percy --version
# @percy/cli 1.x
\`\`\`

## Getting a Token

Create a project at percy.io, copy the write-only \`PERCY_TOKEN\` from project settings, and set it in your CI environment. Tokens look like \`web_abc123def456...\`. Never commit them.

Locally:

\`\`\`bash
export PERCY_TOKEN=web_abc123...
\`\`\`

In GitHub Actions:

\`\`\`yaml
env:
  PERCY_TOKEN: \${{ secrets.PERCY_TOKEN }}
\`\`\`

## Hello World

\`\`\`typescript
// tests/home.spec.ts
import { test, expect } from '@playwright/test';
import { percySnapshot } from '@percy/playwright';

test('homepage looks correct', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  await percySnapshot(page, 'Homepage');
});
\`\`\`

Run:

\`\`\`bash
npx percy exec -- npx playwright test
\`\`\`

Percy uploads the snapshot, runs it against the configured browser/viewport matrix, and writes a build URL to the console. Open the URL to review.

## percySnapshot API

\`\`\`typescript
percySnapshot(page: Page, name: string, options?: PercySnapshotOptions): Promise<void>
\`\`\`

| Option | Type | Description |
|---|---|---|
| \`widths\` | \`number[]\` | Viewport widths to render at (overrides project default) |
| \`minHeight\` | \`number\` | Minimum render height |
| \`percyCSS\` | \`string\` | CSS injected before snapshot (mask data, hide carousels) |
| \`enableJavaScript\` | \`boolean\` | Run JS in the rendered snapshot (default false for speed) |
| \`scope\` | \`string\` | CSS selector to crop to a region |
| \`fullPage\` | \`boolean\` | Capture full scrolling height (default true) |

Common usage:

\`\`\`typescript
await percySnapshot(page, 'Product card', {
  widths: [375, 768, 1280],
  percyCSS: '.timestamp { visibility: hidden; }',
  scope: '.product-card',
});
\`\`\`

## .percy.yml Config

Project-wide defaults live in \`.percy.yml\` (or \`.percy.json\`):

\`\`\`yaml
version: 2
snapshot:
  widths: [375, 768, 1280]
  minHeight: 1024
  percyCSS: |
    .ads, .live-clock { visibility: hidden; }
discovery:
  allowed-hostnames: [example.com]
  disallowed-hostnames: [tracking.example.com]
  network-idle-timeout: 750
\`\`\`

\`discovery.allowed-hostnames\` whitelists which assets Percy should fetch when rendering. Leave empty to fetch everything; restrict for faster builds and reproducible diffs.

## Viewports

The most useful Percy feature: render the same snapshot at multiple widths and diff them independently. Configure in \`.percy.yml\` or per-snapshot:

\`\`\`typescript
await percySnapshot(page, 'Checkout', { widths: [375, 768, 1280, 1920] });
\`\`\`

Each width produces a separate render in the Percy UI. Diffs are computed per width. A regression that only appears at mobile shows up only at the 375px width and stays green at 1280px.

## Browser Matrix

In project settings (percy.io UI) you choose which browsers to render in:

| Browser | Notes |
|---|---|
| Chromium | Default, fastest |
| Firefox | Good cross-engine coverage |
| Edge | WebKit-on-Chromium |
| Safari | Real WebKit, important for Apple-heavy audiences |

More browsers = more snapshots = more cost. Most teams enable Chromium + Firefox in CI and add Safari for releases.

## Ignore Regions

Some elements should not participate in diffs -- a timestamp, an ad slot, a randomly chosen featured product. Hide them with \`percyCSS\`:

\`\`\`typescript
await percySnapshot(page, 'Dashboard', {
  percyCSS: \\\`
    .live-timestamp { visibility: hidden; }
    [data-test='ad-slot'] { background: #fff !important; }
    .featured-product img { opacity: 0; }
  \\\`,
});
\`\`\`

Use \`visibility: hidden\` (preserves layout) rather than \`display: none\` (collapses layout, often causes other diffs).

## Comparison: Percy vs Other Visual Tools

| Tool | Strengths | Weaknesses |
|---|---|---|
| Percy | Cloud rendering, polished UI, BrowserStack-backed | Paid SaaS, limited free tier |
| Chromatic | Native Storybook integration, TurboSnap | Storybook-centric |
| Applitools | AI-powered visual AI, large enterprise install base | Pricey, complex |
| Playwright \`toHaveScreenshot\` | Built into Playwright, free | No cloud, no review UI, local-only |
| Backstop.js | Free, self-hosted, good for static sites | Self-managed infra |

Percy fits teams that want managed infrastructure plus a clean review UI without the Storybook-first commitment.

## CI Setup -- GitHub Actions

\`\`\`yaml
name: Visual Tests
on: [pull_request]
jobs:
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npx playwright install --with-deps chromium
      - name: Run Percy
        run: npx percy exec -- npx playwright test
        env:
          PERCY_TOKEN: \${{ secrets.PERCY_TOKEN }}
          PERCY_BRANCH: \${{ github.head_ref || github.ref_name }}
\`\`\`

The \`PERCY_BRANCH\` env var makes Percy associate the build with the right branch -- important for cross-PR baselines.

## Pull Request Status Check

Percy posts a check to GitHub PRs when configured. The check reports:

- Build status (pending, finished)
- Number of diffs
- Direct link to the visual review UI

In GitHub branch protection, add "Percy" as a required check to block merges until visual diffs are approved.

## Baselines and Approval Flow

The first time you snapshot a page, that rendering becomes the baseline for the branch. Subsequent runs compare against the baseline. Three outcomes:

1. **No diff**: snapshot matches baseline. No action.
2. **Diff in PR**: reviewer approves or rejects in Percy UI. Approval makes the new render the baseline after merge.
3. **Unrelated diff**: snapshot changed because of an upstream merge. Auto-resolves when you rebase.

Baselines live per branch. When a branch merges to main, its baselines become the new main baseline.

## Authenticated Pages

To snapshot authenticated pages, log in inside Playwright as normal:

\`\`\`typescript
test.beforeEach(async ({ page }) => {
  await page.goto('https://app.example.com/login');
  await page.fill('input[name=email]', process.env.TEST_EMAIL!);
  await page.fill('input[name=password]', process.env.TEST_PASSWORD!);
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
});

test('dashboard layout', async ({ page }) => {
  await percySnapshot(page, 'Dashboard');
});
\`\`\`

Percy renders the page snapshot from the HTML+CSS as seen at the moment of \`percySnapshot()\`. It does not re-execute your auth flow on its servers.

## Snapshotting Mid-State (Modals, Hovers)

To capture interactive states, drive the state in Playwright first:

\`\`\`typescript
test('settings modal', async ({ page }) => {
  await page.goto('/profile');
  await page.click('button:has-text("Edit settings")');
  await page.waitForSelector('.modal');
  await percySnapshot(page, 'Settings modal');
});
\`\`\`

\`\`\`typescript
test('button hover state', async ({ page }) => {
  await page.goto('/');
  await page.hover('button.cta');
  await percySnapshot(page, 'CTA hover');
});
\`\`\`

## Multiple Snapshots Per Test

A single test can capture many snapshots:

\`\`\`typescript
test('three-step wizard', async ({ page }) => {
  await page.goto('/wizard');
  await percySnapshot(page, 'Wizard step 1');

  await page.click('button:has-text("Next")');
  await percySnapshot(page, 'Wizard step 2');

  await page.click('button:has-text("Next")');
  await percySnapshot(page, 'Wizard step 3');
});
\`\`\`

Each snapshot is a separate item in the Percy UI with its own diff history.

## Parallel Sharding

When your test suite shards across machines, Percy needs to know when all shards have uploaded. Use \`PERCY_PARALLEL_TOTAL\` and \`PERCY_PARALLEL_NONCE\`:

\`\`\`yaml
jobs:
  visual:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npx playwright install --with-deps chromium
      - run: npx percy exec -- npx playwright test --shard=\${{ matrix.shard }}/4
        env:
          PERCY_TOKEN: \${{ secrets.PERCY_TOKEN }}
          PERCY_PARALLEL_TOTAL: 4
          PERCY_PARALLEL_NONCE: \${{ github.run_id }}
\`\`\`

Percy waits for all 4 shards to upload before finalizing the build.

## Percy CLI Reference

| Command | Purpose |
|---|---|
| \`percy exec -- <cmd>\` | Wrap a command in a Percy session |
| \`percy snapshot <dir>\` | Snapshot a static directory of HTML files |
| \`percy upload <dir>\` | Upload pre-captured images |
| \`percy build:create\` | Manually start a build (advanced) |
| \`percy build:finalize\` | Manually finalize a build |
| \`percy stop\` | Stop a running Percy session |

\`percy exec\` is the most common; the others are for advanced workflows.

## Reducing Flakiness

| Cause | Fix |
|---|---|
| Animations | Inject \`* { animation: none !important; transition: none !important; }\` via percyCSS |
| Late-loading fonts | Wait with \`await page.evaluate(() => document.fonts.ready)\` |
| Dynamic timestamps | Hide with \`visibility: hidden\` |
| Carousels | Pause autoplay before snapshot |
| Random data | Seed your test data |
| Network latency | Use \`networkIdleTimeout\` in .percy.yml |

A defensive percyCSS template:

\`\`\`yaml
snapshot:
  percyCSS: |
    * { animation: none !important; transition: none !important; }
    .timestamp, .live-counter, .ads { visibility: hidden; }
\`\`\`

## Comparison Table -- Percy Plans

| Plan | Snapshots/month | Concurrency | Approx price |
|---|---|---|---|
| Free | 5,000 | 1 | $0 |
| Standard | 25,000+ | 1 | starts ~$199/mo |
| Pro | 200,000+ | unlimited | enterprise |

Pricing changes; check percy.io for current. The free tier is enough for small projects; teams shipping daily quickly outgrow it.

## When Not to Use Percy

- Pure backend services with no UI
- Sites with extreme legitimate visual churn (news homepages, social feeds)
- Compliance-restricted environments that cannot upload screenshots externally
- Solo projects where cost outweighs value

For self-hosted alternatives see Backstop.js or Playwright's built-in \`toHaveScreenshot\` with explicit baseline files.

## Frequently Asked Questions

### Does Percy run my JavaScript?

By default Percy snapshots are static -- the HTML+CSS+images at the moment of capture. Set \`enableJavaScript: true\` in your snapshot options to have Percy re-execute the JS during rendering. JS-enabled snapshots are slower and more expensive but accurate for client-rendered apps.

### What is the difference between widths and percyConfigurations?

\`widths\` is per-snapshot or project-default viewport widths. \`percyConfigurations\` (in Percy UI) defines the browser+viewport matrix per project, overriding per-snapshot widths. Most teams use widths in code and let project config handle browsers.

### How do I handle a redesign that breaks every snapshot?

Approve all diffs in bulk via the Percy UI after the redesign ships. The new renders become the baselines. Alternatively, run the new branch separately and merge baselines manually.

### Can I run Percy snapshots without uploading?

Yes -- set \`PERCY_TOKEN=\` (empty) and Percy CLI runs in dry mode, logging what it would have uploaded. Useful for development.

### Does Percy work with mobile native apps?

Yes -- \`@percy/appium\` integrates with Appium for iOS and Android visual testing. Pattern is similar to the Playwright integration.

### How do I share baselines across branches?

Percy auto-promotes the latest main-branch baseline. For other shared baselines, configure \`PERCY_TARGET_BRANCH\` to point to the reference branch.

### What if my CI doesn't support env secrets?

Don't use Percy from that CI. PERCY_TOKEN is write-only but still grants snapshot upload privileges; treat it like an API key.

## Conclusion

\`@percy/playwright\` adds visual regression testing to your existing Playwright suite with one extra function call and a CLI wrapper. The first integration takes an hour: install, set the token, add \`percySnapshot\` to a critical-path test, run under \`percy exec\`. From there it scales naturally -- add snapshots to flows that have visual risk, configure percyCSS to mask volatile content, and gate PRs on Percy approval.

For more visual testing guides, see our [Chromatic Storybook + TurboSnap guide](/blog/chromatic-visual-testing-storybook-turbosnap-2026) for the Storybook-centric alternative, browse the [visual testing skills](/skills) for AI agent skills that scaffold percy configs, and our [visual testing comparison](/compare) to evaluate Percy, Chromatic, and Playwright's built-in screenshot diffing side by side.
`,
};
