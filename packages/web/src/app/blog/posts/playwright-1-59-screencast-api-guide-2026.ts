import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Screencast & Video Recording: 1.59 API Guide (2026)',
  description:
    'Master Playwright screencast and video recording: configure recordVideo, video modes, retain-on-failure, the 1.59 Screencast API for AI agents, and CI artifacts.',
  date: '2026-06-28',
  category: 'Guide',
  content: `# Playwright Screencast & Video Recording: The Complete 1.59 API Guide

Recording a **Playwright screencast** turns a flaky, hard-to-reproduce failure into a 12-second video you can actually watch. Whether you call it **Playwright video recording**, screen capture, or the new 1.59 Screencast API, the goal is the same: see exactly what the browser did when a test broke. This guide covers both the long-standing \`recordVideo\` context option and the newer programmatic Screencast API that streams frames live to AI agents and observability tools.

If you have ever stared at a stack trace that says \`TimeoutError: locator.click: Timeout 30000ms exceeded\` and had no idea *why* the element never appeared, **record Playwright test video** artifacts are the fastest path to an answer. By the end of this guide you will know how to enable video globally in \`playwright.config.ts\`, capture per-context recordings with \`recordVideo\`, retain video only on failure, attach clips to the HTML report, and stream a live screencast for autonomous agents.

## Why Record Video of Playwright Tests at All

Test logs tell you *what* assertion failed. Video tells you *what the user would have seen*. The difference matters most in three situations:

- **Headless CI failures.** A test passes on your machine and fails in GitHub Actions. Video shows the rendering difference, a cookie banner covering the button, or a font that never loaded.
- **Timing and animation bugs.** A modal that animates in over 300ms, a toast that disappears too fast, or a spinner that never resolves. Frames reveal the timeline.
- **Flaky tests.** Intermittent failures are notoriously hard to reproduce. A video captured on the failing retry is often the single artifact that explains the flake. Our [Fix flaky tests](/blog/fix-flaky-tests-guide) guide pairs perfectly with video evidence.

Playwright records video at the **browser context** level. Each context (roughly, each isolated browser session or test) produces its own \`.webm\` file. This is different from screenshots (single frames) and traces (a structured timeline you replay in the Trace Viewer). We will compare all three later.

## Enabling Video in playwright.config.ts

The simplest way to turn on video recording is the \`video\` key under \`use\` in your config. Playwright Test wires it into every context it creates for you, so you do not touch \`recordVideo\` directly.

\`\`\`ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: process.env.CI ? 2 : 0,
  use: {
    // Record video for every test, keep all of them
    video: 'on',
    // Optional: also capture traces and screenshots on failure
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
\`\`\`

With \`video: 'on'\`, every test writes a \`.webm\` into the test's output folder (under \`test-results/<test-name>/\`). Playwright also automatically attaches the video to the test result, so it shows up in the HTML report without any extra code.

In practice \`video: 'on'\` is wasteful: you do not want a 5MB video for all 800 passing tests. That is where the video *modes* come in.

## Video Mode Options: on, off, retain-on-failure, on-first-retry

The \`video\` option accepts either a string mode or an object with a mode plus a custom size. Here is the full reference table.

| Mode | Behavior | Best for |
|---|---|---|
| \`'off'\` | No video recorded. Default. | Fast local runs, smoke tests |
| \`'on'\` | Record every test, keep every video. | Debugging a specific suite, demos |
| \`'retain-on-failure'\` | Record every test, but delete the video for tests that pass. | CI debugging without storage bloat |
| \`'on-first-retry'\` | Record video only when a test is retried for the first time. | Flaky-test triage, lowest overhead |
| \`'on-all-retries'\` | Record video on every retry attempt. | Hard-to-reproduce intermittent failures |

The two modes you will reach for 95% of the time are \`retain-on-failure\` and \`on-first-retry\`. They keep your CI artifacts small while guaranteeing you have footage exactly when something breaks.

\`\`\`ts
// playwright.config.ts — recommended CI setup
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    // Only record retries; only keep failures' footage
    video: process.env.CI ? 'on-first-retry' : 'off',
    trace: 'on-first-retry',
  },
});
\`\`\`

A subtle but important detail: with \`retain-on-failure\`, Playwright *records* every test (there is always recording overhead) and then *discards* the file on pass. With \`on-first-retry\`, no recording happens on the first attempt at all, so the overhead is near zero for stable suites. Choose based on whether your flakes reproduce on the first failure or only after a retry.

## Setting Video Size and Resolution

By default Playwright records at the viewport size, scaled to fit a 800x800 bounding box while preserving aspect ratio. For higher-fidelity captures, pass an object instead of a string:

\`\`\`ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    viewport: { width: 1280, height: 720 },
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 }, // match the viewport for crisp video
    },
  },
});
\`\`\`

Guidelines for choosing a size:

- **Match the viewport** for the sharpest result. Mismatched sizes get letterboxed or scaled.
- **Cap the resolution** if storage or upload bandwidth is a concern. A 640x480 video is a fraction of the size of a 1920x1080 one.
- **Larger is not always better.** For most failure triage, 1280x720 is plenty and keeps files under a couple of megabytes per minute.

## Using recordVideo with browser.newContext() Directly

When you are not using Playwright Test, for example in a standalone automation script, a custom fixture, or the [Playwright E2E guide](/blog/playwright-e2e-complete-guide) style of programmatic control, you enable video with the \`recordVideo\` option on \`browser.newContext()\`.

\`\`\`ts
import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordVideo: {
      dir: 'videos/', // required: directory to store the .webm files
      size: { width: 1280, height: 720 }, // optional
    },
  });

  const page = await context.newPage();
  await page.goto('https://qaskills.sh');
  await page.getByRole('link', { name: 'Skills' }).click();

  // IMPORTANT: the video is only finalized after the context closes.
  await context.close();
  await browser.close();
}

run();
\`\`\`

The \`recordVideo\` object has exactly two fields:

| Option | Type | Required | Description |
|---|---|---|---|
| \`dir\` | \`string\` | Yes | Directory where \`.webm\` video files are written |
| \`size\` | \`{ width, height }\` | No | Recorded resolution; defaults to a scaled viewport |

The single most common mistake here is forgetting to call \`context.close()\`. Video is flushed to disk only when the context closes. If your script throws before that line, you get a zero-byte or missing file. Always wrap the body in \`try/finally\` and close the context in the \`finally\` block.

## Retrieving the Video Path and Saving It Elsewhere

When you record manually, you often want to move or rename the file after the run, for example to a path that includes the test name or a timestamp. Each \`page\` exposes a \`video()\` handle.

\`\`\`ts
import { chromium } from 'playwright';
import path from 'node:path';

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordVideo: { dir: 'videos/' },
  });
  const page = await context.newPage();

  try {
    await page.goto('https://qaskills.sh/skills');
    await page.getByPlaceholder('Search skills').fill('playwright');
  } finally {
    // Closing the context finalizes the recording
    await context.close();
  }

  // video() returns a Video object; path() resolves after close()
  const video = page.video();
  if (video) {
    const original = await video.path();
    console.log('Recorded at:', original);

    // Copy to a custom location with saveAs (does not require manual fs)
    const target = path.join('artifacts', 'search-flow.webm');
    await video.saveAs(target);
    console.log('Saved to:', target);
  }

  await browser.close();
}

run();
\`\`\`

Two methods on the \`Video\` object matter:

- \`video.path()\` returns the path to the recorded file. It resolves only after the context is closed.
- \`video.saveAs(targetPath)\` copies the recording to a new location, creating directories as needed. Use this instead of hand-rolling \`fs.copyFile\`, because it waits for the recording to finish flushing.

## Attaching Video to the Playwright HTML Report

If you use \`video: 'on'\` (or any mode) in \`playwright.config.ts\`, Playwright attaches the video automatically. But when you record manually or want to attach a custom clip, use \`testInfo.attach()\` so the file appears inline in the HTML report next to the test.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('checkout flow with manual video attachment', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    recordVideo: { dir: testInfo.outputPath('videos') },
  });
  const page = await context.newPage();

  await page.goto('https://qaskills.sh');
  await expect(page).toHaveTitle(/QASkills/);

  await context.close(); // finalize the recording

  const video = page.video();
  if (video) {
    await testInfo.attach('session-recording', {
      path: await video.path(),
      contentType: 'video/webm',
    });
  }
});
\`\`\`

\`testInfo.attach()\` takes a name and a body, which can be a \`path\`, a \`Buffer\`, or a string. With \`contentType: 'video/webm'\` the report renders an inline player. This is also how you attach screenshots, logs, or any other artifact to a specific test result. The report's per-test panel then shows the clip without any extra hosting.

## Video vs Trace vs Screenshot: When to Use Each

Beginners often conflate Playwright's three diagnostic artifacts. They serve different purposes and have very different overheads.

| Artifact | What it captures | Format | Interactive? | Overhead | Best for |
|---|---|---|---|---|---|
| Screenshot | A single frame at one moment | \`.png\` | No | Negligible | Visual diffs, failure snapshots |
| Video | A continuous recording of the session | \`.webm\` | No (just playback) | Moderate (per-frame encoding) | Watching what happened, timing bugs |
| Trace | A timeline of actions, DOM snapshots, network, console | \`.zip\` (Trace Viewer) | Yes (step through, inspect DOM) | Higher (rich metadata) | Deep debugging, network/console inspection |

A good mental model:

- **Screenshot** answers "what did the page look like when it failed?"
- **Video** answers "what was the user seeing the whole time?"
- **Trace** answers "what action, request, or DOM change actually caused the failure?"

For most teams, the winning combination in CI is \`trace: 'on-first-retry'\` plus \`video: 'on-first-retry'\`. Traces give you the surgical step-through; video gives you the at-a-glance "oh, the banner was covering the button" insight. Screenshots are cheap enough to keep with \`screenshot: 'only-on-failure'\` always on. If you are doing pixel-level comparison work, see our [Visual regression testing](/blog/visual-regression-testing-guide) guide, which builds on the screenshot artifact.

## The 1.59 Screencast API: Live Frame Streaming for AI Agents

Everything above records video to a *file* you watch *after* the run. The newer Screencast API addresses a different need: streaming browser frames *live* while the session is running, so an external consumer can react in real time. This is the foundation for AI agents and observability dashboards that need to "see" the browser as it works.

The conceptual shift is from "save a recording" to "subscribe to a stream of frames." Instead of waiting for \`context.close()\`, a consumer receives each rendered frame as it is produced, typically as a base64-encoded image plus metadata (timestamp, dimensions). An AI agent driving the browser can feed those frames into a vision model to decide its next action; an observability tool can pipe them to a live dashboard so a human watches an agent work in real time.

\`\`\`ts
// Conceptual screencast streaming for an agent/observability consumer.
// Frame events are delivered as they are rendered, not after close().
import { chromium } from 'playwright';

async function streamSession(onFrame: (frame: Buffer, ts: number) => void) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Attach a frame consumer. Each frame arrives live during the session.
  // (Wire this to your agent's vision model or a live dashboard.)
  const stopStreaming = await startScreencast(page, (frameBuffer, timestamp) => {
    onFrame(frameBuffer, timestamp);
  });

  await page.goto('https://qaskills.sh/skills');
  // ... agent performs actions while frames stream out in real time ...

  await stopStreaming();
  await context.close();
  await browser.close();
}

// startScreencast is a thin wrapper over the screencast frame subscription;
// it resolves with a function you call to stop the stream.
declare function startScreencast(
  page: import('playwright').Page,
  onFrame: (frame: Buffer, ts: number) => void
): Promise<() => Promise<void>>;
\`\`\`

The key differences between the file-based \`recordVideo\` flow and the streaming Screencast model:

- **Timing.** \`recordVideo\` gives you the file only after the context closes. Screencast delivers frames continuously, mid-session.
- **Consumer.** \`recordVideo\` is for humans watching later. Screencast is for programs reacting now: agents, dashboards, recorders that re-encode on the fly.
- **Backpressure.** Streaming consumers must handle frames arriving faster than they can process them, dropping or throttling as needed. A file recorder never has this problem.

For QA teams building autonomous testing agents, the screencast stream is what lets a supervising model observe an agent and intervene. If you are exploring that space, the [browse QA skills](/skills) directory has agent-ready skills for Playwright observability and live session capture.

## Uploading Video Artifacts in CI (GitHub Actions)

Recording video locally is only half the battle. In CI you must *upload* the artifacts so you can download and watch them after a run. With GitHub Actions, the \`actions/upload-artifact\` step does this. Upload only on failure to keep storage costs down.

\`\`\`yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      # Upload the full report (videos + traces + screenshots) on failure
      - name: Upload Playwright report
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

      # Optionally upload raw videos separately for quick access
      - name: Upload videos
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-videos
          path: test-results/**/*.webm
          retention-days: 7
\`\`\`

A few CI-specific tips:

- Use \`if: \${{ !cancelled() }}\` on the report upload so artifacts upload even when tests fail (a plain \`run\` step failure would otherwise skip later steps).
- Set a sensible \`retention-days\`. Videos add up; 7 to 14 days is usually enough to investigate a failed run.
- The HTML report bundles the video, trace, and screenshots together, so uploading \`playwright-report/\` is often all you need. The separate \`*.webm\` upload is a convenience for grabbing raw clips fast.
- Pair video with retries (\`retries: 2\` in config) and \`on-first-retry\` mode so you only pay the recording cost on the runs that actually need investigation.

## A Complete End-to-End Example

Here is a realistic config plus test that ties together video, trace, screenshots, and a manual attachment, the setup we would recommend for a real CI pipeline.

\`\`\`ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'https://qaskills.sh',
    video: 'on-first-retry',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
\`\`\`

\`\`\`ts
// tests/search.spec.ts
import { test, expect } from '@playwright/test';

test('user can search for a skill', async ({ page }) => {
  await page.goto('/skills');

  const search = page.getByPlaceholder('Search skills');
  await search.fill('playwright');
  await page.keyboard.press('Enter');

  // If this assertion fails on a retry, a video + trace are recorded
  await expect(page.getByRole('heading', { name: /playwright/i }).first()).toBeVisible();
});
\`\`\`

With this setup, stable runs record nothing (zero overhead). The moment a test fails and retries, Playwright captures a video and a trace, attaches both to the HTML report, and your CI uploads them as artifacts. You download the report, click the failing test, and watch the exact session that broke.

## Conclusion

Video is the most underused debugging tool in most Playwright suites. The \`recordVideo\` context option and the \`video\` config key give you a recording of every failing session for the cost of a few lines of config, and modes like \`retain-on-failure\` and \`on-first-retry\` keep storage in check. The newer 1.59 Screencast API extends this from "save a file to watch later" to "stream frames live," unlocking real-time observability for AI agents driving the browser.

Start with \`video: 'on-first-retry'\` and \`trace: 'on-first-retry'\` in your config, upload the HTML report in CI, and you will never again debug a CI-only failure blind. When you are ready to add agent-driven capture, live streaming, and observability to your testing stack, [browse QA skills](/skills) on QASkills.sh for ready-to-install Playwright skills built for AI coding agents.

## Frequently Asked Questions

### How do I record a video of a Playwright test?

Set the \`video\` option under \`use\` in your \`playwright.config.ts\`, for example \`video: 'on'\` to record every test or \`video: 'retain-on-failure'\` to keep only failures. Playwright records each browser context and writes a \`.webm\` file into the test output folder, then attaches it to the HTML report automatically. For standalone scripts, pass \`recordVideo\` with a \`dir\` to \`browser.newContext()\` instead.

### What is retain-on-failure video mode?

Retain-on-failure tells Playwright to record video for every test but delete the recording for any test that passes, keeping only the footage from failing tests. It gives you complete failure coverage without filling your CI storage with videos of passing runs. The tradeoff is that recording still happens for every test, so there is a small overhead even on tests that ultimately pass and get their video discarded.

### Where are Playwright videos saved?

When using Playwright Test, videos are written to the test output directory, typically under \`test-results/<test-name>/\` alongside traces and screenshots. When you record manually with \`recordVideo\`, the files land in the \`dir\` you specify on \`newContext()\`. You can retrieve the exact path with \`page.video().path()\` after closing the context, or copy the file elsewhere with \`page.video().saveAs()\`.

### What is the difference between video and trace in Playwright?

Video is a continuous \`.webm\` recording you simply watch back, ideal for seeing timing issues and what the user would have viewed. A trace is a structured \`.zip\` timeline you open in the Trace Viewer to step through actions, inspect DOM snapshots, network requests, and console logs interactively. Video shows you what happened; trace shows you why. Most teams enable both on first retry for complete failure coverage.

### Does recording video slow down my tests?

Video recording adds moderate overhead because the browser encodes frames continuously during the session. For stable suites, use \`on-first-retry\` so no recording happens on the first attempt and overhead stays near zero. The \`retain-on-failure\` mode records every test but discards passing footage, so it carries the recording cost throughout. Match the recorded size to your viewport and keep resolution modest to minimize the impact.

### What is the Playwright Screencast API used for?

The Screencast API streams browser frames live while a session runs, rather than saving a file to watch afterward. Each frame is delivered as it renders, which lets AI agents feed frames into a vision model to decide their next action, or lets observability dashboards show a human watching an agent work in real time. It is the foundation for autonomous testing agents and live session monitoring, unlike file-based recording meant for later review.

### How do I attach a video to the Playwright HTML report?

If you enable the \`video\` option in your config, Playwright attaches the recording to the report automatically. For manual recordings, call \`testInfo.attach()\` with the video path and \`contentType: 'video/webm'\` after closing the context. The report then renders an inline player in that test's panel. The same \`attach\` method works for screenshots, logs, and any other artifact you want tied to a specific test result.

### Can I record video in headless mode and in CI?

Yes. Video recording works identically in headless and headed modes, and headless is the normal mode in CI. The browser still renders frames internally even without a visible window, so the recording captures exactly what would have appeared on screen. In CI you must upload the artifacts with a step like \`actions/upload-artifact\` so you can download and watch them after the run completes, ideally gated on failure to save storage.
`,
};
