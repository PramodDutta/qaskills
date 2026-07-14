import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Screencast API & Video Recording: Complete Guide',
  description:
    'Record video of Playwright tests two ways: classic context-level recordVideo and the new page.screencast API. Save, attach, upload to CI, and combine with traces.',
  date: '2026-06-18',
  category: 'Reference',
  content: `
# Playwright Screencast API and Video Recording: The Complete Guide

Video is the fastest way to understand why a Playwright test failed. A stack trace tells you which assertion blew up; a 12-second clip shows you the modal that never opened, the spinner that spun forever, or the toast that flashed and vanished. Playwright has supported video recording for years through context-level configuration, and as of version 1.59 it also exposes a low-level \`page.screencast\` API that lets you start and stop recording programmatically and annotate frames around specific actions.

This guide covers both mechanisms end to end: where files land on disk, how to name and attach them, how to control size and quality, how to upload artifacts from GitHub Actions, and how to pair video with the Trace Viewer for a complete debugging story. Every snippet is real, runnable TypeScript.

## Two Ways to Record: A Mental Model

Playwright gives you two distinct recording surfaces, and choosing the right one matters.

The **context-level recorder** (\`recordVideo\` / the \`video\` option in your config) is declarative. You flip it on, Playwright records the entire lifetime of every page in a browser context, and a \`.webm\` file is flushed to disk when the context closes. You never call a "start" or "stop" method. This is what the Playwright Test runner uses under the hood when you set \`use: { video: 'retain-on-failure' }\`.

The **\`page.screencast\` API** is imperative. You call \`page.screencast.start()\` and \`page.screencast.stop()\` yourself, you decide exactly which window of activity gets captured, and you can drop annotations onto the timeline to mark when individual actions happened. It is built for tooling, demos, and surgical capture of a single flow rather than blanket "record everything" coverage.

Most teams want the context-level recorder for CI failure forensics and reach for \`page.screencast\` only when they need programmatic control. You can absolutely use both in the same suite.

## Context-Level Recording in playwright.config

The simplest way to get video out of the Playwright Test runner is the \`video\` key inside \`use\`. Here is a minimal but production-shaped config.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    // Record video, but only keep it when a test fails.
    video: 'retain-on-failure',
    // Where artifacts (video, screenshots, traces) are written.
    // Each test gets its own subfolder under here.
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // The base output directory for all test artifacts.
  outputDir: 'test-results',
});
\`\`\`

The \`video\` option accepts both string shorthands and an object form. The string form covers the common cases; the object form lets you set the frame size.

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    video: {
      mode: 'retain-on-failure',
      // Downscale the recording to keep file sizes manageable in CI.
      size: { width: 1280, height: 720 },
    },
  },
});
\`\`\`

### Video config option reference

| Value | Records | Keeps file when | Typical use |
| --- | --- | --- | --- |
| \`'off'\` | Nothing | Never | Default; fastest |
| \`'on'\` | Every test | Always | Local debugging, demos |
| \`'retain-on-failure'\` | Every test | Only on failure | CI default — best signal-to-noise |
| \`'on-first-retry'\` | Tests on their first retry | When a retry runs | Flaky-test triage with low overhead |
| \`{ mode, size }\` | Per \`mode\` | Per \`mode\` | When you need a custom frame size |

A subtle but important detail: with \`'on'\` and \`'on-first-retry'\`, Playwright records the run and may *discard* the file afterward depending on the mode. With \`'retain-on-failure'\` the recording always happens but the \`.webm\` is deleted for passing tests, so you pay the recording cost on every test. If your suite is large and mostly green, \`'on-first-retry'\` recordings cost almost nothing because retries are rare.

## Where Videos Are Saved and How They Are Named

When you use the Test runner, each test gets an artifact directory under \`outputDir\` (default \`test-results\`). The path is derived from the test file, the test title, and the project name, so a failing test produces something like:

\`\`\`text
test-results/
  login-spec-ts-user-can-sign-in-chromium/
    video.webm
    trace.zip
    test-failed-1.png
\`\`\`

The video file is named \`video.webm\` by default. Videos are always recorded in WebM (VP8) format. The directory name is sanitized from your test title, which is why descriptive \`test()\` names pay off — \`video.webm\` inside \`...user-can-sign-in-chromium\` is self-documenting.

If you are using the raw Playwright library (not the Test runner), you set the directory yourself via \`recordVideo.dir\`:

\`\`\`typescript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  recordVideo: {
    dir: 'videos/',
    size: { width: 1280, height: 720 },
  },
});

const page = await context.newPage();
await page.goto('https://example.com');
await page.getByRole('link', { name: 'More information' }).click();

// The video is finalized when the context closes.
await context.close();
await browser.close();
\`\`\`

In the raw library, Playwright generates a random hash-based filename inside \`recordVideo.dir\`. You do not get to pick the exact name up front, but you can read it back and rename it (covered below).

## Working With the Video Object: path, saveAs, delete

Every \`Page\` exposes a \`video()\` accessor that returns a \`Video\` handle (or \`null\` if recording is off). This is your hook for renaming, copying, and cleaning up video files in the raw library.

\`\`\`typescript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  recordVideo: { dir: 'videos/' },
});
const page = await context.newPage();

await page.goto('https://playwright.dev');
await page.getByRole('link', { name: 'Get started' }).click();

const video = page.video();

// IMPORTANT: close the context first so the video is fully flushed.
await context.close();

if (video) {
  // path() resolves only after the context is closed.
  const original = await video.path();
  console.log('Recorded to:', original);

  // Copy/rename the video to a stable, meaningful location.
  await video.saveAs('videos/get-started-flow.webm');

  // Remove the auto-generated original to avoid clutter.
  await video.delete();
}

await browser.close();
\`\`\`

Three rules govern the \`Video\` object:

1. \`video.path()\` and \`video.saveAs()\` resolve their promises only after the owning context (or page) is closed and the file is fully written. Calling \`path()\` mid-test will hang.
2. \`saveAs()\` copies the file to a new location; it does not move it. Use \`delete()\` afterward if you want only the renamed copy.
3. \`delete()\` removes the original recording. Combine \`saveAs()\` + \`delete()\` to effectively rename.

### Attaching video to the test report

Inside the Playwright Test runner you usually do not need to touch \`video()\` at all — the HTML reporter automatically embeds the retained video. But if you want to force-attach a video (for example, a custom-named clip), use \`testInfo.attach\`:

\`\`\`typescript
import { test } from '@playwright/test';

test('checkout flow', async ({ page }, testInfo) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();

  const video = page.video();
  if (video) {
    await testInfo.attach('checkout-recording', {
      path: await video.path(),
      contentType: 'video/webm',
    });
  }
});
\`\`\`

Attached files appear in the HTML report and are bundled with the test result, which makes them easy to ship to CI dashboards.

## The page.screencast API (1.59+)

The \`page.screencast\` API, introduced in Playwright 1.59, is the imperative counterpart to context recording. You control exactly when capture begins and ends, and you can annotate the timeline.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('record only the critical flow', async ({ page }, testInfo) => {
  await page.goto('/dashboard');

  // Begin capturing frames programmatically.
  await page.screencast.start({
    size: { width: 1280, height: 720 },
  });

  // Annotate the timeline so reviewers can jump to key moments.
  await page.screencast.annotate('Opening the settings panel');
  await page.getByRole('button', { name: 'Settings' }).click();

  await page.screencast.annotate('Saving preferences');
  await page.getByLabel('Email notifications').check();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved')).toBeVisible();

  // Stop and retrieve the recording.
  const screencast = await page.screencast.stop();
  await screencast.saveAs(testInfo.outputPath('critical-flow.webm'));
});
\`\`\`

The key differences from context recording are visible immediately: you choose the start point (after navigation, skipping the boring page-load), you tag moments with \`annotate()\`, and you get the result back synchronously from \`stop()\` instead of waiting for context teardown.

### Real-time frame capture

Because the screencast is a live stream, you can subscribe to individual frames as they are produced — useful for building custom video pipelines, thumbnails, or feeding frames to a vision model.

\`\`\`typescript
import { test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('capture frames in real time', async ({ page }) => {
  await page.goto('/animation-demo');

  let frameIndex = 0;
  page.screencast.on('frame', async (frame) => {
    // frame.data is a Buffer of the encoded image for this tick.
    await writeFile(\`frames/frame-\${String(frameIndex++).padStart(4, '0')}.png\`, frame.data);
  });

  await page.screencast.start();
  await page.getByRole('button', { name: 'Play animation' }).click();
  await page.waitForTimeout(3000);
  await page.screencast.stop();
});
\`\`\`

## context recordVideo vs page.screencast

This is the decision table to bookmark.

| Capability | Context \`recordVideo\` | \`page.screencast\` |
| --- | --- | --- |
| Trigger style | Declarative (config) | Imperative (start/stop) |
| Captures | Entire context lifetime | Only between start and stop |
| Annotations | No | Yes (\`annotate()\`) |
| Real-time frame access | No | Yes (\`frame\` event) |
| Auto-attached to HTML report | Yes (Test runner) | Manual via \`testInfo.attach\` |
| File finalized when | Context closes | \`stop()\` resolves |
| Best for | CI failure forensics | Demos, surgical capture, tooling |
| Available since | Long-standing | 1.59 |
| Per-page granularity | Per context | Per page |

A practical pattern: keep \`video: 'retain-on-failure'\` globally for safety-net coverage, and add \`page.screencast\` blocks inside a handful of high-value journeys where annotated, trimmed clips are worth the extra code. For more on what shipped in recent releases, see [what's new in Playwright 2026](/blog/whats-new-in-playwright-2026).

## Size, Quality, and Performance Tradeoffs

Video recording is not free. Every recorded test carries CPU and disk overhead, and large frame sizes multiply both. The \`size\` option is your primary lever.

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    video: {
      mode: 'retain-on-failure',
      // 720p is the sweet spot: readable, but ~4x smaller than 1080p.
      size: { width: 1280, height: 720 },
    },
  },
});
\`\`\`

A few guidelines that hold up in practice:

- **Match aspect ratio to your viewport.** If your viewport is \`1280x720\` but you record at \`640x480\`, the video gets letterboxed and text becomes unreadable. Keep the size proportional.
- **720p is almost always enough.** The point of a failure video is to see *what happened*, not to read 8px tooltips. Dropping from 1080p to 720p roughly quarters file size.
- **WebM/VP8 is the only output.** You cannot ask Playwright for MP4 directly; transcode afterward with \`ffmpeg\` if you need MP4 for a stakeholder who insists on it.
- **Recording adds wall-clock time.** On a large suite, blanket \`video: 'on'\` can add 15-30% to runtime. \`'retain-on-failure'\` still records everything (it just deletes passes), so for the lowest overhead use \`'on-first-retry'\`.

Transcoding to MP4 when you really need it:

\`\`\`bash
# Convert a Playwright .webm to MP4 with reasonable compression.
ffmpeg -i test-results/login-failure/video.webm \\
  -c:v libx264 -crf 23 -preset medium \\
  -movflags +faststart \\
  login-failure.mp4
\`\`\`

## Uploading Video Artifacts From GitHub Actions

Videos are useless if they live only on the ephemeral CI runner. The standard pattern is to upload the entire \`test-results\` directory (or the HTML report) as a build artifact, and only when the job fails.

\`\`\`yaml
name: e2e

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Run Playwright tests
        run: npx playwright test

      # Upload videos, traces, and screenshots only when something failed.
      - name: Upload test artifacts
        if: \${{ failure() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-artifacts
          path: |
            test-results/
            playwright-report/
          retention-days: 7
\`\`\`

The \`if: \${{ failure() }}\` guard keeps your artifact storage lean — green runs upload nothing. Pairing this with \`video: 'retain-on-failure'\` means the only \`.webm\` files in \`test-results\` are the ones you actually want. Reviewers download the artifact, open \`playwright-report/index.html\`, and watch the failure inline. This CI shape works the same whether you test desktop or mobile viewports; if you emulate devices, see [Playwright mobile emulation](/blog/playwright-mobile-emulation-guide) for how the recorded frame matches the emulated screen.

## Combining Video With the Trace Viewer

Video tells you *what* the user saw; the trace tells you *what the framework did* — every action, network request, console log, and DOM snapshot. Used together they are unbeatable. Enable both in config:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
\`\`\`

After a failing run, open the trace, which now embeds the recorded video alongside the action timeline:

\`\`\`bash
# Open the trace for a failed test. The video plays in sync
# with the action-by-action timeline.
npx playwright show-trace test-results/login-failure/trace.zip
\`\`\`

Inside the Trace Viewer you scrub the timeline and the video, the DOM snapshot, and the network panel all move together. Click an action on the left and the video jumps to that frame. This is why most teams set \`trace\` and \`video\` to the same retention mode — they want both artifacts present for the exact same set of failures. For a broader comparison of how Playwright's debugging tooling stacks up against alternatives, see [Playwright vs Cypress for Next.js E2E in 2026](/blog/playwright-vs-cypress-nextjs-e2e-2026).

## Cleaning Up and Managing Disk

On long-running local sessions or self-hosted CI, recorded videos accumulate. A few housekeeping habits keep things tidy:

\`\`\`typescript
import { test } from '@playwright/test';
import { rm } from 'node:fs/promises';

// Delete the raw video for tests you do not care about, while
// keeping it for the ones you flag.
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'passed') {
    const video = page.video();
    if (video) {
      await page.context().close();
      await video.delete();
    }
  }
});
\`\`\`

For wholesale cleanup, the Test runner already wipes \`outputDir\` at the start of each run by default, so stale artifacts from a previous run never pile up. If you point \`recordVideo.dir\` somewhere custom in the raw library, you own the cleanup — schedule a \`rm -rf videos/*\` in your pretest script.

## Putting It All Together

A realistic, complete spec combining annotated screencast capture, failure-only retention, and report attachment:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('user can complete onboarding', async ({ page }, testInfo) => {
  await page.goto('/onboarding');

  await page.screencast.start({ size: { width: 1280, height: 720 } });
  await page.screencast.annotate('Step 1: profile');

  await page.getByLabel('Full name').fill('Ada Lovelace');
  await page.getByRole('button', { name: 'Next' }).click();

  await page.screencast.annotate('Step 2: preferences');
  await page.getByLabel('Weekly digest').check();
  await page.getByRole('button', { name: 'Finish' }).click();

  await expect(page.getByText('Welcome aboard')).toBeVisible();

  const screencast = await page.screencast.stop();
  const out = testInfo.outputPath('onboarding.webm');
  await screencast.saveAs(out);
  await testInfo.attach('onboarding', { path: out, contentType: 'video/webm' });
});
\`\`\`

Browse curated, ready-to-install Playwright recipes and recording patterns in the [QASkills skills directory](/skills).

## Frequently Asked Questions

### How do I record video of a Playwright test?

Set \`video: 'retain-on-failure'\` under \`use\` in \`playwright.config.ts\` to record every test and keep the \`.webm\` only when a test fails. For programmatic control, call \`page.screencast.start()\` and \`page.screencast.stop()\` inside the test to capture a specific window of activity. The context recorder is best for CI; the screencast API is best for surgical, annotated clips.

### Where does Playwright save recorded videos?

With the Test runner, videos land in a per-test subfolder under \`outputDir\` (default \`test-results\`), named \`video.webm\`. With the raw library, they go to the directory you set in \`recordVideo.dir\` with an auto-generated hash filename. You can read the final path with \`await page.video().path()\` after the context closes, then rename it with \`saveAs()\`.

### What video format does Playwright produce?

Playwright records exclusively in WebM format using the VP8 codec. There is no built-in MP4 export. If a stakeholder needs MP4, transcode the WebM afterward with FFmpeg, for example \`ffmpeg -i video.webm -c:v libx264 -crf 23 video.mp4\`. WebM plays natively in Chrome, Firefox, and the Playwright HTML report.

### What is the difference between recordVideo and page.screencast?

\`recordVideo\` is declarative context-level recording that captures the entire context lifetime and is configured once. \`page.screencast\` (added in 1.59) is imperative: you call start and stop yourself, can annotate the timeline with \`annotate()\`, and can subscribe to real-time frames. Use recordVideo for blanket CI coverage and screencast for trimmed, annotated, tool-driven capture.

### How do I reduce Playwright video file size?

Lower the frame size with the \`size\` option, for example \`video: { mode: 'retain-on-failure', size: { width: 1280, height: 720 } }\`. 720p is usually readable and roughly a quarter the size of 1080p. Also prefer \`'on-first-retry'\` or \`'retain-on-failure'\` over \`'on'\` so you store far fewer clips, and keep the aspect ratio matched to your viewport to avoid letterboxing.

### How do I upload Playwright videos as CI artifacts in GitHub Actions?

Use \`actions/upload-artifact@v4\` with \`if: \${{ failure() }}\` and point \`path\` at \`test-results/\` and \`playwright-report/\`. Combined with \`video: 'retain-on-failure'\`, only failing tests produce \`.webm\` files, so the artifact stays small. Reviewers download it and open the HTML report to watch the failure video inline alongside the trace.

### Can I attach a Playwright video to the HTML report manually?

Yes. Read the path with \`await page.video().path()\` (after closing the context) or \`screencast.saveAs(...)\`, then call \`testInfo.attach('name', { path, contentType: 'video/webm' })\`. The attachment appears in the HTML report bundled with the test result. The Test runner auto-attaches context videos, so manual attachment is mainly for custom-named or screencast clips.

### Can I view the video and trace together?

Yes. Enable both \`video\` and \`trace\` (for example both set to \`retain-on-failure\`), then run \`npx playwright show-trace path/to/trace.zip\`. The Trace Viewer embeds the recorded video in sync with the action timeline, DOM snapshots, and network panel. Scrubbing the timeline moves the video, so you can see exactly what the user saw at each framework action.

## Conclusion

Video recording turns a cryptic CI failure into a watchable story. Use context-level \`recordVideo\` with \`retain-on-failure\` as your always-on safety net, reach for the \`page.screencast\` API when you need annotated, trimmed, programmatic capture, and always pair both with the Trace Viewer for the full picture. Keep frame sizes at 720p, upload artifacts only on failure, and clean up passing-test recordings to stay lean.

Ready to go further? Explore battle-tested Playwright recording and debugging skills in the [QASkills directory](/skills) and drop them straight into your AI coding agent.
`,
};
