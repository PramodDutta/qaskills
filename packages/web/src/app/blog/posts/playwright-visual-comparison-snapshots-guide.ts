import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Visual Comparison & Screenshot Testing Guide (2026)',
  description: 'Master visual regression with Playwright in 2026: toHaveScreenshot, diff thresholds, masks, animations, font loading, and cross-platform baselines.',
  date: '2026-05-07',
  category: 'Guide',
  content: `
# Playwright Visual Comparison and Screenshot Testing Guide (2026)

Visual regression testing catches the bugs that functional tests miss: a CSS rule that drops a button below the fold, a font that fails to load, a dark mode swatch that produces unreadable contrast. Playwright's \`toHaveScreenshot\` matcher is the lowest-friction way to add visual coverage to an existing test suite. It captures a baseline image on the first run, diffs subsequent runs, and fails on pixel mismatches that exceed a configurable threshold.

This guide covers the full visual regression workflow: baselines, masks, animations, font loading, and cross-platform CI. Every example uses TypeScript and Playwright 1.49+.

For functional fundamentals, read the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide). For cross-browser coverage in CI, [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026). Install the [playwright-e2e skill](/skills/playwright-e2e) to get these patterns into AI-generated tests.

## Your first visual snapshot

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('home page matches visual baseline', async ({ page }) => {
  await page.goto('https://qaskills.sh');
  await expect(page).toHaveScreenshot('home.png');
});
\`\`\`

Run with \`--update-snapshots\` once to create the baseline:

\`\`\`bash
npx playwright test --update-snapshots
\`\`\`

Subsequent runs compare against \`home-chromium-darwin.png\` (or your platform's variant) and fail if pixels differ beyond the threshold.

## Naming and platform suffixes

By default Playwright suffixes snapshot names with project, browser, and OS, so \`home.png\` becomes one of:

| File | Platform |
|---|---|
| \`home-chromium-darwin.png\` | macOS, Chromium |
| \`home-chromium-linux.png\` | Linux, Chromium |
| \`home-chromium-win32.png\` | Windows, Chromium |
| \`home-firefox-darwin.png\` | macOS, Firefox |

This is critical because font rendering, antialiasing, and emoji glyphs differ across platforms. A baseline captured on macOS will never match on Linux. Generate baselines per OS by running CI on the matching runner and committing the artifacts.

## Snapshot directory layout

Snapshots live next to tests by default. Configure layout:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  snapshotDir: './__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
});
\`\`\`

The template variables: \`testFileDir\`, \`testFileName\`, \`testName\`, \`arg\` (the name argument), \`projectName\`, \`platform\`, \`ext\`.

## Thresholds and diff options

| Option | Type | Purpose |
|---|---|---|
| \`maxDiffPixelRatio\` | number 0-1 | Fail when more than X percent of pixels differ |
| \`maxDiffPixels\` | number | Fail when more than X pixels differ (absolute) |
| \`threshold\` | number 0-1 | Per-pixel color threshold (default 0.2) |
| \`animations\` | \`'allow' \\| 'disabled'\` | Pause animations |
| \`caret\` | \`'hide' \\| 'initial'\` | Hide text cursor |
| \`mask\` | Locator[] | Black out elements |
| \`scale\` | \`'css' \\| 'device'\` | DPI scaling |
| \`fullPage\` | boolean | Capture beyond viewport |
| \`omitBackground\` | boolean | Transparent background |

\`\`\`typescript
await expect(page).toHaveScreenshot('home.png', {
  fullPage: true,
  maxDiffPixelRatio: 0.005,
  animations: 'disabled',
  mask: [page.getByText(/\\d+ minutes ago/)],
});
\`\`\`

## Masking unstable regions

Timestamps, avatars from random URLs, and ads change between runs. Mask them.

\`\`\`typescript
await expect(page).toHaveScreenshot({
  mask: [
    page.getByTestId('timestamp'),
    page.getByRole('img', { name: 'User avatar' }),
    page.getByRole('region', { name: 'Ads' }),
  ],
  maskColor: '#000',
});
\`\`\`

Masked elements appear as filled rectangles. They are excluded from the diff entirely.

## Component snapshots

For a specific element, use \`expect(locator).toHaveScreenshot\`.

\`\`\`typescript
test('header matches baseline', async ({ page }) => {
  await page.goto('/');
  const header = page.getByRole('banner');
  await expect(header).toHaveScreenshot('header.png');
});
\`\`\`

Element snapshots crop to the locator's bounding box. They run faster and have stabler baselines than full-page captures.

## Disabling animations

CSS animations and transitions are the largest source of flake in visual tests. Disable globally:

\`\`\`typescript
// playwright.config.ts
use: {
  reducedMotion: 'reduce',
},
\`\`\`

Per-test override:

\`\`\`typescript
await expect(page).toHaveScreenshot('home.png', {
  animations: 'disabled',
});
\`\`\`

The matcher freezes animations at their final state before capturing.

## Waiting for fonts

Custom fonts load asynchronously. Capturing before font load produces flickering baselines.

\`\`\`typescript
test('hero matches with custom fonts loaded', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('region', { name: 'Hero' })).toHaveScreenshot('hero.png');
});
\`\`\`

\`document.fonts.ready\` returns a promise that resolves when every \`@font-face\` has loaded.

## Cross-platform snapshots

Pixel-perfect cross-platform is impossible due to font rendering. Two strategies:

**1. Run snapshots only on one OS (typically Linux in CI).**

\`\`\`typescript
projects: [
  {
    name: 'chromium-visual',
    use: { ...devices['Desktop Chrome'] },
    testMatch: /.*\\.visual\\.spec\\.ts/,
    metadata: { ci: 'linux-only' },
  },
],
\`\`\`

**2. Keep separate baselines per platform.** This is the default behavior; commit all platform variants to git.

For Docker-based stability, run snapshots in the official Playwright image:

\`\`\`dockerfile
FROM mcr.microsoft.com/playwright:v1.49.0-jammy
WORKDIR /app
\`\`\`

## Visual diff debugging

When a snapshot fails, Playwright writes three files into test-results:

| File | Purpose |
|---|---|
| \`home-actual.png\` | Captured during the run |
| \`home-expected.png\` | The baseline |
| \`home-diff.png\` | Highlighted differences |

The HTML reporter shows all three side by side. Use the diff to decide: is this a regression (fix the code), or an intended change (update the baseline)?

## Updating baselines

After verifying a diff is intentional:

\`\`\`bash
# Update one test
npx playwright test home.spec.ts --update-snapshots

# Update everything
npx playwright test --update-snapshots
\`\`\`

Then commit the changed PNGs in the same PR as the code that produced them. Reviewers can verify the visual change in the diff.

## Snapshot CI workflow

A typical PR-driven workflow:

1. Developer makes a visual change.
2. PR opens; CI runs visual tests and fails with diffs.
3. Reviewer opens the HTML report from artifacts and inspects diffs.
4. Developer either fixes the code or updates baselines.
5. PR re-runs; passes.

To make step 3 easier, upload the report:

\`\`\`yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: visual-report
    path: playwright-report
\`\`\`

## Visual snapshots in component tests

Pair with [Playwright Component Testing](/blog/playwright-component-testing-react-complete-guide) for granular visual regression on individual components.

\`\`\`typescript
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from '../../src/components/Button';

test('primary button visual', async ({ mount }) => {
  const component = await mount(<Button variant="primary">Save</Button>);
  await expect(component).toHaveScreenshot('button-primary.png');
});

test('disabled button visual', async ({ mount }) => {
  const component = await mount(<Button disabled>Save</Button>);
  await expect(component).toHaveScreenshot('button-disabled.png');
});
\`\`\`

Component snapshots are smaller, faster, and easier to maintain than page snapshots.

## Common pitfalls

**Pitfall 1: Baselines generated on macOS, CI runs Linux.** Snapshots will always fail. Run \`--update-snapshots\` in CI (use \`workflow_dispatch\` for safety) to generate Linux baselines.

**Pitfall 2: Animations not disabled.** A subtle hover transition produces sub-pixel diffs. Use \`reducedMotion: 'reduce'\` globally.

**Pitfall 3: Fonts not loaded.** First paint without the custom font produces a different snapshot than steady state. Await \`document.fonts.ready\`.

**Pitfall 4: Random user data.** Avatars from \`/api/random\` make the snapshot non-deterministic. Mock with \`page.route\` or mask.

**Pitfall 5: Updating baselines without review.** \`--update-snapshots\` accepts every diff. Review the PNGs in the PR before merging.

## Anti-patterns

- Snapshotting the entire site on every test. Capture component and section snapshots; reserve full-page captures for hero pages.
- Ignoring small diffs by raising thresholds. Investigate the cause; the test is telling you something.
- Committing snapshots to a separate "snapshots" branch. Keep baselines next to the code they describe.
- Using visual tests instead of accessibility tests. Visual tests cannot see screen reader output or focus order.

## Image format and size

PNG is the default and lossless. For very large pages, consider WebP via \`type\`:

\`\`\`typescript
await expect(page).toHaveScreenshot('home.webp', { type: 'jpeg', quality: 80 });
\`\`\`

JPEG and WebP are lossy. Use only when storage is constrained.

## Combining masks and locators

For dynamic regions in static layouts:

\`\`\`typescript
const dynamic = page.locator('[data-dynamic="true"]');
await expect(page).toHaveScreenshot('layout.png', {
  mask: [dynamic],
});
\`\`\`

Mark dynamic regions with a data attribute in your source code. The test automatically masks every annotated region without needing per-test mask lists.

## Conclusion and next steps

Visual regression catches the regressions functional tests cannot. Mask dynamic regions, disable animations, await font load, and pin baselines per platform. The cost is modest; the upside is whole categories of bugs caught before users see them.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate visual tests that follow these patterns. For comparison tooling beyond Playwright, see [Visual Regression Testing Guide](/blog/visual-regression-testing-guide). For chromatic-based workflows, [Chromatic Storybook Visual Testing Guide](/blog/chromatic-storybook-visual-testing-guide).
`,
};
