import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Recording Video of Playwright Tests: A Complete 2026 Tutorial',
  description:
    'Learn how to record video of Playwright tests with page.screencast and the video config option, add annotations, control file size, and upload artifacts in CI.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Recording Video of Playwright Tests: A Complete 2026 Tutorial

Video is the fastest way to understand why a test failed. Instead of reading a stack trace and guessing, you watch the run and see the modal that never opened or the button that moved. Playwright ships two complementary ways to record video: the classic \`use: { video: 'on' }\` config that captures every test automatically, and the newer \`page.screencast()\` API that lets you start, stop, and annotate a clip from inside a test. This tutorial covers both end to end, from a first recording to annotations, file-size control, and uploading the clips as CI artifacts.

By the end you will know when to reach for video, when a trace is the better tool, and how to keep your recordings small enough that CI does not choke on them. For the broader release context, see [What's New in Playwright 2026](/blog/whats-new-playwright-2026), and browse the [skills directory](/skills) for reusable QA automation building blocks.

Video recording is one of those features that feels optional until the first time a test fails only in CI and passes locally. When that happens, a fifteen-second clip of the actual run turns a frustrating guessing game into a two-minute fix, because you can see the real viewport, the real timing, and the real state of the page in the environment where it broke. That is the core reason to set this up before you need it rather than after.

## How video recording works in Playwright

Playwright records video at the browser context level. Each context (an isolated browser session) can capture a video of its pages, and Playwright writes a WebM file to your output directory when the context closes. The Playwright Test runner wraps this for you: when you set the \`video\` option, the runner creates the context with recording enabled and attaches the resulting file to the test result.

There are two independent mechanisms, and it helps to keep them straight from the start.

| Mechanism | How you enable it | Best for |
| --- | --- | --- |
| \`use: { video }\` config | Global or per-project config | Blanket capture, failure clips |
| \`recordVideo\` context option | Manual \`browser.newContext()\` | Custom scripts outside the test runner |
| \`page.screencast()\` API | Called inside a test | Narrated walkthroughs, precise clips |

The config option is what most suites use. The \`recordVideo\` context option is the lower-level primitive it is built on, useful when you create contexts by hand. The \`page.screencast()\` API is the 2026 addition for surgical, annotated recording.

One conceptual point saves a lot of confusion later: video is a property of the context, not of an individual action or assertion. A single context can host several pages (tabs and popups), and the recording captures whichever page is active. If your test opens a new tab and the important interaction happens there, the video follows it because it belongs to the same context. When you deliberately create a second context for an isolated session, that context records its own separate file. Knowing this up front explains why some clips seem to span multiple tabs while others do not.

## Quick start: record every failing test

The most common setup records a video for every test but keeps only the ones that failed, so you get failure evidence without drowning in gigabytes of passing-test footage. Set this once in \`playwright.config.ts\`.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Record all tests, retain the video only on failure.
    video: 'retain-on-failure',
  },
});
\`\`\`

Run your suite normally and Playwright drops a \`video.webm\` into each failed test's output folder and links it in the HTML report. Open the report, click a failed test, and the clip plays inline. This single line is the highest-value video setting for most teams: full coverage of failures, near-zero storage cost for passing runs.

## The video config option in depth

The \`video\` option accepts several modes. Choosing the right one is a trade-off between how much evidence you want and how much storage and run time you are willing to spend.

| Value | Behavior | Storage cost |
| --- | --- | --- |
| \`'off'\` | No video recorded | None |
| \`'on'\` | Record every test, keep all videos | High |
| \`'retain-on-failure'\` | Record every test, delete on pass | Low |
| \`'on-first-retry'\` | Record only when a test is retried | Very low |

\`on-first-retry\` is the leanest option for large CI suites: the first run stays fast with no recording, and video only kicks in on the retry of a flaky test, which is exactly when you want it. You can also pass an object to control the recording resolution, which is the primary lever on file size.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    video: {
      mode: 'retain-on-failure',
      // Smaller frame size means dramatically smaller files.
      size: { width: 1280, height: 720 },
    },
  },
});
\`\`\`

The recorded video size is independent of the viewport used for the test logic, so you can run tests at a large viewport for layout fidelity while recording at 720p to keep artifacts light. Halving each dimension roughly quarters the file size, so this is the first knob to turn when clips get too large.

## The recordVideo context option

When you drive Playwright without the test runner (a Node script, a custom harness, or a fixture that builds its own context) you enable video through \`recordVideo\` on \`browser.newContext()\`. This is the primitive the config option wraps.

\`\`\`ts
import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordVideo: { dir: 'videos/', size: { width: 1280, height: 720 } },
  });

  const page = await context.newPage();
  await page.goto('https://example.com');
  await page.getByRole('link', { name: 'More information' }).click();

  // Video is finalized when the context closes.
  await context.close();
  await browser.close();
}

run();
\`\`\`

The key detail is that the video file is only written and named when the context closes, so you must close the context to get a usable file. If you need the path programmatically, call \`await page.video().path()\` after the context closes. Use this approach only outside the test runner; inside a test, prefer the \`video\` config or \`page.screencast()\`.

## page.screencast(): precise, annotated clips

The 2026 \`page.screencast()\` API records inside a single test with explicit start and stop, plus \`annotate()\` to overlay a caption at a specific moment. This is what you want for narrated onboarding demos, documentation clips, or a failure recording where you need a label pinned to the exact step that broke.

\`\`\`ts
import { test } from '@playwright/test';

test('narrated signup walkthrough', async ({ page }) => {
  const cast = await page.screencast({ path: 'signup.webm' });

  await page.goto('/signup');
  await cast.annotate('Step 1: enter account details');
  await page.getByLabel('Email').fill('new.user@example.com');
  await page.getByLabel('Password').fill('correct-horse-battery');

  await cast.annotate('Step 2: submit and verify');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('heading', { name: 'Welcome' }).waitFor();

  await cast.stop();
});
\`\`\`

Because screencast is scoped to the test, it composes cleanly with a suite-wide \`video\` setting: keep \`retain-on-failure\` on globally for blanket failure evidence, and add screencast only to the handful of tests where annotations earn their keep. Remember to call \`cast.stop()\` so the file is finalized before the test ends.

## Adding annotations that explain the run

Annotations turn a silent clip into a self-documenting one. Call \`annotate()\` right before the action it describes so the caption is on screen while the step executes. A good pattern is to annotate each logical phase of a user journey rather than each low-level action, which keeps the overlay readable.

\`\`\`ts
import { test } from '@playwright/test';

test('checkout with phase annotations', async ({ page }) => {
  const cast = await page.screencast({ path: 'checkout.webm' });

  await page.goto('/cart');
  await cast.annotate('Cart review');
  await page.getByRole('button', { name: 'Proceed to checkout' }).click();

  await cast.annotate('Shipping details');
  await page.getByLabel('Full name').fill('Ada Lovelace');
  await page.getByLabel('Address').fill('12 Analytical Way');

  await cast.annotate('Payment and confirmation');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await page.getByText('Thank you for your order').waitFor();

  await cast.stop();
});
\`\`\`

Keep annotation text short (a few words) so it does not obscure the UI, and prefer present-tense phase labels. When these clips end up in the HTML report, a reviewer can scrub through and understand the whole journey without reading a line of test code.

## Video vs trace vs screenshot

Video is not always the right diagnostic. Playwright gives you three artifact types, and each answers a different question. Choosing well keeps your CI fast and your debugging focused.

| Artifact | What it captures | When to use | Cost |
| --- | --- | --- | --- |
| Screenshot | A single frame | Final failure state, visual assertions | Tiny |
| Video | Continuous WebM of the run | Understanding a sequence, flaky UI | Medium to high |
| Trace | Actions, DOM snapshots, network, console | Deep root-cause debugging | Medium |

The rule of thumb: reach for a trace first when you need to know exactly why a step failed, because the Trace Viewer lets you step through DOM snapshots and inspect network and console at each action. Reach for video when the failure is about motion or timing that a static trace snapshot does not convey (an animation, a race, a transient toast). Use screenshots for the cheapest possible evidence of the final state. Many teams run \`trace: 'on-first-retry'\` alongside \`video: 'retain-on-failure'\` so both are available for genuine failures. For trace-based debugging patterns and the accessibility angle, see our [ARIA snapshot testing guide](/blog/playwright-aria-snapshot-testing-guide).

## A complete playwright.config.ts

Here is a production-shaped config that combines video, trace, and screenshots with sensible retention. It records lean, retains artifacts only when they are useful, and pins a stable recording resolution.

\`\`\`ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'https://app.example.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 },
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
\`\`\`

This configuration keeps passing runs fast and small: no video or trace is retained on success, screenshots capture only failures, and everything is recorded at a modest resolution. On the first retry of a flaky test, the trace turns on so you get deep debugging data exactly when you need it, without paying for it on every run.

Notice how the three artifact settings complement rather than duplicate each other. The screenshot gives you an instant thumbnail of the failure state in the report, the video shows the sequence that led there, and the trace lets you step through the DOM and network at each action. Because the retention rules differ (screenshot only on failure, trace on first retry, video retained on failure), you are never storing all three for a passing test. This layered default is a good starting point for most teams; tune the individual modes only when your CI storage budget or debugging habits point to a specific change.

## Uploading video artifacts in CI

Recorded video is only useful if you can retrieve it after a CI run. In GitHub Actions, upload the whole \`test-results\` directory (or the HTML report) as a build artifact so the clips travel with the run. The key is to upload even when tests fail, using \`if: always()\`.

\`\`\`ts
// .github/workflows/e2e.yml (excerpt)
// - name: Run Playwright tests
//   run: npx playwright test
// - name: Upload Playwright artifacts
//   if: always()
//   uses: actions/upload-artifact@v4
//   with:
//     name: playwright-artifacts
//     path: |
//       playwright-report/
//       test-results/
//     retention-days: 7
\`\`\`

The \`if: always()\` condition is essential: without it, the upload step is skipped when the test job fails, which is precisely when you want the video. Set a short \`retention-days\` so failure clips do not accumulate storage cost, and point reviewers at the \`playwright-report\` artifact, which links the video inline next to each failed test.

## Controlling file size

Video files can grow fast, and large artifacts slow down uploads and eat storage quotas. There are three effective levers, in order of impact.

| Lever | How | Effect on size |
| --- | --- | --- |
| Recording resolution | \`video.size\` smaller | Largest reduction |
| Retention mode | \`retain-on-failure\` or \`on-first-retry\` | Fewer files kept |
| Test duration | Shorter, focused tests | Shorter clips |

Lowering the recording resolution is the biggest single win because file size scales with pixel count and duration. Beyond that, tightening retention so only failing runs keep video means most runs store nothing at all. Finally, keeping individual tests short and focused not only shrinks clips but improves debuggability, since a two-minute video is far harder to review than a fifteen-second one.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    video: {
      mode: 'on-first-retry',
      // 960x540 is often enough to see what happened at a fraction of 1080p size.
      size: { width: 960, height: 540 },
    },
  },
});
\`\`\`

Start with these defaults and only raise the resolution if a real investigation needs finer visual detail. If you are testing an AI agent driving the browser, the same artifact discipline applies; see the [MCP server testing guide](/blog/mcp-server-testing-guide-2026) for that workflow.

A second, often-overlooked lever is the output directory itself. Playwright writes videos, traces, and screenshots under \`test-results\` by default, and if a previous run left files there, they can inflate what you upload. Clearing the output directory at the start of a CI job (or letting Playwright clear it, which it does by default for a fresh run) keeps each artifact bundle scoped to that run. Combined with a short retention window on the upload step, this prevents the slow creep where a repository's CI storage fills with weeks of stale failure clips that nobody will ever watch.

Finally, be deliberate about which projects record. In a multi-browser config, recording video for Chromium, Firefox, and WebKit on every failure triples your storage for what is often the same underlying bug. A common compromise is to enable video only on the primary project (usually Chromium) and rely on traces for the secondary browsers. You still get a watchable clip for the most common environment, and you avoid paying three times over for cross-browser failures that share a root cause.

## Frequently Asked Questions

### Why is my video file empty or missing?

Playwright finalizes the video only when the browser context closes. If you use \`recordVideo\` with a manual context, you must call \`context.close()\` to get a file, and \`page.video().path()\` resolves only after that close. Inside the test runner the context is closed for you, so an empty file usually means the test crashed before the context could close cleanly, or the output directory was cleared between run and read.

### Should I use video or trace for debugging?

Start with a trace. The Trace Viewer lets you step through each action with a DOM snapshot, network log, and console output, which pinpoints why a step failed far better than watching a clip. Reach for video when the problem is about motion or timing, an animation, a race condition, or a transient element, that a static trace snapshot does not capture. Running both on retries gives you the best of each.

### How do I record only the tests that fail?

Set \`video: 'retain-on-failure'\` in your config. Playwright records every test but deletes the video for any test that passes, so you keep failure evidence without storing gigabytes of passing-run footage. For even leaner CI, use \`'on-first-retry'\`, which records nothing on the initial run and only captures video when a flaky test is retried.

### Can I annotate the video with captions?

Yes, with the \`page.screencast()\` API. Call \`cast.annotate('your caption')\` right before the action it describes and the text overlays on the recording at that moment. The classic \`video\` config option does not support annotations, so use screencast when you need narrated walkthroughs or a label pinned to the exact failing step. Keep captions short so they do not obscure the interface.

### What video format does Playwright produce?

Playwright records in WebM format, which plays natively in the HTML report and in modern browsers. If you need MP4 for a tool that does not accept WebM, convert the file afterward with FFmpeg. There is no built-in MP4 option, so treat WebM as the source of truth and transcode only when an external consumer requires a different container.

### Does recording video slow down my tests?

Recording adds some overhead, mainly during the run and when writing the file at context close, but it is modest for most suites. The bigger cost is storage and upload time in CI. To minimize impact, record at a lower resolution, use \`on-first-retry\` so most runs record nothing, and keep tests short. These settings let you keep video available for failures without slowing down the common passing path.

### How do I get the video file path in code?

After the context closes, call \`await page.video().path()\`, which resolves to the absolute path of the recorded WebM. This is most useful in custom scripts using \`recordVideo\`, where you want to move or attach the file yourself. Inside the Playwright Test runner you rarely need the path directly, since the runner attaches the video to the report automatically for you.

### Can I record a specific portion of a test instead of the whole thing?

Yes, that is exactly what \`page.screencast()\` is for. Call it to start recording at the point of interest and \`cast.stop()\` to end, so the clip covers only the segment you care about rather than the entire test. This produces shorter, more focused files than the always-on config option and is ideal for documenting a single critical flow within a longer test.
`,
};
