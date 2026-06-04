import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'WebdriverIO Visual Service: blockOut & Regions Guide',
  description:
    'Master @wdio/visual-service masking: blockOut regions, blockOutStatusBar, hideElements, and checkScreen options in TypeScript to kill flaky visual regression diffs.',
  date: '2026-06-03',
  category: 'Reference',
  content: `
# WebdriverIO Visual Service: blockOut & Regions Guide

Visual regression testing promises to catch the bugs assertions miss — a button that drifted ten pixels, a font that failed to load, a layout that collapsed on a narrow viewport. The catch is that screenshots also capture things that change on every run and have nothing to do with regressions: the current time, a live ad, a randomly seeded avatar, a "last updated" timestamp, an animated carousel mid-frame. Left unmanaged, these dynamic regions make every comparison fail, and a visual suite that always fails is a visual suite everyone ignores. The WebdriverIO visual service, \`@wdio/visual-service\`, solves this with a rich set of masking and exclusion options: \`blockOut\` regions, \`blockOutStatusBar\`, \`hideElements\`, and \`removeElements\`.

This guide is a focused 2026 reference to those masking features in TypeScript. We cover installing and configuring the service, the difference between blocking out coordinate regions and hiding elements by selector, the mobile-specific \`blockOutStatusBar\` and \`blockOutToolBar\` flags, how to apply masks per call to \`checkScreen\`, \`checkElement\`, and \`checkFullPageScreen\`, and how to set sensible global defaults. Every snippet is runnable TypeScript. Whether you searched for "wdio visual service blockOut," "webdriverio hideElements visual," or "blockOutStatusBar checkScreen," this is the reference you want.

If you build visual suites broadly, the [skills directory](/skills) has installable QA skills for AI coding agents, and the [blog](/blog) has a dedicated visual-regression guide and cross-browser strategies. The mental model to hold throughout: a visual test should compare only the parts of the screen you actually control. Everything else — clocks, ads, animations, status bars — must be neutralized before the pixel comparison runs, and masking is how you neutralize it.

## Installing and Configuring the Service

The visual service is a WebdriverIO service you register in your config. It adds the \`checkScreen\`, \`checkElement\`, and \`checkFullPageScreen\` commands to the \`browser\` object and manages baseline, actual, and diff image folders.

\`\`\`bash
npm install --save-dev @wdio/visual-service
\`\`\`

Register it in \`wdio.conf.ts\` and point it at your image folders. The configuration here also sets a few global defaults we will revisit.

\`\`\`typescript
// wdio.conf.ts
import type { Options } from '@wdio/types';

export const config: Options.Testrunner = {
  // ...runner, capabilities, framework, etc.
  services: [
    [
      'visual',
      {
        baselineFolder: './tests/visual/baseline',
        screenshotPath: './tests/visual/.tmp',
        formatImageName: '{tag}-{logName}-{width}x{height}',
        savePerInstance: true,
        // Global masking defaults applied to every check (override per call)
        blockOutStatusBar: true,
        blockOutToolBar: true,
        // Treat anti-aliasing pixel noise as equal
        ignoreAntialiasing: true,
      },
    ],
  ],
};
\`\`\`

With the service registered, the new commands are available in tests. A bare comparison looks like this and returns a mismatch percentage you assert against zero.

\`\`\`typescript
it('home page matches baseline', async () => {
  await browser.url('/');
  // 0 means a perfect match against the stored baseline
  await expect(await browser.checkScreen('home-page')).toEqual(0);
});
\`\`\`

The first run has no baseline, so the service saves the current screenshot as the baseline and the assertion is effectively skipped; subsequent runs compare against it. You commit the baseline images to version control so the whole team and CI compare against the same reference.

## blockOut: Masking Coordinate Regions

\`blockOut\` masks rectangular regions by pixel coordinates. You pass an array of \`[x, y, width, height]\` rectangles, and the service paints solid blocks over those areas in *both* the baseline and the actual screenshot before comparing, so whatever lives there is ignored. Use this when you know the screen position of a dynamic area but cannot easily target it by selector — a canvas-rendered chart, a third-party iframe, a video player.

\`\`\`typescript
it('dashboard ignores the live chart region', async () => {
  await browser.url('/dashboard');
  const mismatch = await browser.checkScreen('dashboard', {
    // [x, y, width, height] — block the chart in the top-right
    blockOut: [
      [820, 120, 360, 240], // live chart
      [0, 0, 1280, 64],     // top nav with a clock
    ],
  });
  await expect(mismatch).toEqual(0);
});
\`\`\`

Because \`blockOut\` is coordinate-based, it is robust to selector changes but fragile to layout shifts: if the element moves, your rectangle no longer covers it. Reserve \`blockOut\` for regions whose position is stable but whose contents are not. For anything you can select in the DOM, prefer \`hideElements\` or \`removeElements\`, which track the element regardless of where it renders.

## hideElements and removeElements: Masking by Selector

The selector-based options are usually the better choice because they follow the element. \`hideElements\` sets \`visibility: hidden\` on the matched elements — the element still occupies its space in the layout, but its pixels are blanked, so surrounding layout is preserved. \`removeElements\` sets \`display: none\` — the element is removed from the flow entirely, and the page reflows around the gap. Both accept a single element or an array of elements resolved with WebdriverIO's \`$\`/\`$$\`.

\`\`\`typescript
it('profile page hides the random avatar and live badge', async () => {
  await browser.url('/profile');
  const mismatch = await browser.checkScreen('profile', {
    // visibility:hidden — keeps layout, blanks pixels
    hideElements: [
      await $('[data-testid="avatar"]'),
      await $('.online-badge'),
    ],
    // display:none — removes from flow (use when blanking would leave a gap)
    removeElements: [await $('.cookie-banner')],
  });
  await expect(mismatch).toEqual(0);
});
\`\`\`

The choice between the two comes down to whether the dynamic element's *footprint* is part of what you want to verify. A timestamp inside a fixed-height header should be hidden (the header height is real and should be checked). A cookie banner overlaying the page should be removed (you want to compare the page as if the banner were never there). Getting this wrong produces either spurious diffs from reflow or masks that hide real layout regressions.

The table contrasts the three masking mechanisms.

| Option | Mechanism | Layout impact | Best for |
|---|---|---|---|
| \`blockOut\` | Paints solid blocks by coords | None (post-render overlay) | Canvas/iframe/video at a stable position |
| \`hideElements\` | \`visibility: hidden\` | Element keeps its space | Dynamic text inside a fixed slot |
| \`removeElements\` | \`display: none\` | Page reflows around gap | Overlays/banners to ignore entirely |

## blockOutStatusBar and blockOutToolBar (Mobile)

On real devices and emulators, the OS status bar (clock, battery, signal) and the browser tool/address bar are captured in screenshots and change constantly — the clock alone guarantees a mismatch on every run. The visual service provides dedicated boolean flags to mask them automatically without you computing coordinates per device. \`blockOutStatusBar\` masks the top OS status bar, and \`blockOutToolBar\` masks the browser navigation bar.

\`\`\`typescript
it('mobile home masks status and tool bars', async () => {
  // Running on a mobile capability (Appium / device emulator)
  await browser.url('/');
  const mismatch = await browser.checkScreen('mobile-home', {
    blockOutStatusBar: true, // hides the OS clock/battery strip
    blockOutToolBar: true,   // hides the browser address/nav bar
  });
  await expect(mismatch).toEqual(0);
});
\`\`\`

These are the single most valuable options for mobile visual testing, which is why the config above set them globally. The service knows each device's status-bar and tool-bar dimensions, so the flags work across devices without hard-coded rectangles — exactly the portability \`blockOut\` cannot give you. On desktop these flags are simply ignored.

## checkScreen, checkElement, and checkFullPageScreen Options

All three comparison commands accept the same masking options as a second argument, so you can scope masks to a single call. \`checkScreen\` captures the current viewport, \`checkFullPageScreen\` scrolls and stitches the entire page, and \`checkElement\` captures just one element's box. Full-page captures are where dynamic content bites hardest, because a long scrolling page is far likelier to contain an ad, a chat widget, or a "recently viewed" carousel.

\`\`\`typescript
it('full marketing page, masking dynamic widgets', async () => {
  await browser.url('/pricing');
  const mismatch = await browser.checkFullPageScreen('pricing-full', {
    hideElements: [await $('#intercom-frame')],
    removeElements: [await $('.promo-strip'), await $('.live-visitors')],
    blockOut: [[0, 0, 1280, 56]], // sticky header with a session timer
    hideScrollBars: true,         // avoid scrollbar pixel noise
    fullPageScrollDuration: 200,  // let lazy images settle between scrolls
  });
  await expect(mismatch).toEqual(0);
});
\`\`\`

Scoping a single element is the most stable comparison of all because it captures the least surface area. When you only care about one component — a card, a modal, a button — \`checkElement\` is far less prone to incidental diffs than a full-page shot.

\`\`\`typescript
it('the pricing card renders correctly', async () => {
  await browser.url('/pricing');
  const card = await $('[data-testid="pro-plan-card"]');
  const mismatch = await browser.checkElement(card, 'pro-plan-card', {
    hideElements: [await $('[data-testid="seats-left"]')], // live inventory
  });
  await expect(mismatch).toEqual(0);
});
\`\`\`

The table lists the masking-related options these commands accept.

| Option | Type | Effect |
|---|---|---|
| \`blockOut\` | number[][] | Block coordinate rectangles |
| \`hideElements\` | Element \\| Element[] | \`visibility: hidden\` on selectors |
| \`removeElements\` | Element \\| Element[] | \`display: none\` on selectors |
| \`blockOutStatusBar\` | boolean | Mask mobile OS status bar |
| \`blockOutToolBar\` | boolean | Mask mobile browser bar |
| \`hideScrollBars\` | boolean | Hide scrollbars before capture |
| \`ignoreAntialiasing\` | boolean | Treat AA noise as equal |

## Setting Global Defaults vs Per-Call Overrides

You can set most masking options globally in the service config (as we did with \`blockOutStatusBar\` and \`ignoreAntialiasing\`) or per call. Globals are right for masks that apply everywhere — the mobile status bar, anti-aliasing tolerance, a site-wide cookie banner. Per-call options are right for page-specific dynamic content, like the chart on the dashboard or the inventory counter on a product page. Per-call options merge with and override the globals for that comparison.

\`\`\`typescript
// Global in wdio.conf.ts: blockOutStatusBar: true, ignoreAntialiasing: true
// Per call: add page-specific masks on top of the globals
await browser.checkScreen('cart', {
  hideElements: [await $('.recommendations')], // page-specific
  // blockOutStatusBar still true here, inherited from globals
});
\`\`\`

A clean strategy is: put truly universal masks in the config, keep a shared helper that returns the common selectors to hide (banners, chat widgets), and add only the page-unique masks inline. This keeps individual tests readable while ensuring the noisy global elements are never forgotten.

\`\`\`typescript
// helpers/visual.ts — shared masks reused across specs
export async function commonMasks() {
  return {
    hideElements: [await $('#intercom-frame')],
    removeElements: [await $('.cookie-banner')],
  };
}

// in a spec
import { commonMasks } from '../helpers/visual';
const masks = await commonMasks();
await browser.checkScreen('faq', {
  ...masks,
  hideElements: [...masks.hideElements, await $('.last-updated')],
});
\`\`\`

## Debugging Diffs and Tuning Tolerance

When a comparison fails, the service writes a diff image highlighting the changed pixels into your screenshot path. Open it first — often the "regression" is a dynamic region you forgot to mask, not a real bug. If the diff shows scattered single-pixel noise along edges, that is anti-aliasing; enable \`ignoreAntialiasing\` (and consider \`ignoreColors\` or a small \`saveAboveTolerance\`/threshold if your platform renders text slightly differently). If the diff shows a solid block where dynamic content lives, add the appropriate mask. Resist the urge to crank a global tolerance high to silence failures — that blinds the suite to the small drifts it exists to catch. Mask precisely instead.

| Symptom in diff | Likely cause | Fix |
|---|---|---|
| Solid block changed every run | Unmasked dynamic content | Add \`hideElements\`/\`blockOut\` |
| Edge speckle / 1px noise | Anti-aliasing | \`ignoreAntialiasing: true\` |
| Whole top strip differs (mobile) | OS status bar | \`blockOutStatusBar: true\` |
| Page shifted down | Element should be removed, not hidden | Use \`removeElements\` |
| Scrollbar stripe on the right | Scrollbar captured | \`hideScrollBars: true\` |

For a broader treatment of building and maintaining visual suites, see the visual-regression guide on the [blog](/blog) and the agent-installable visual-testing skills in the [directory](/skills).

## Stabilizing the Page Before You Capture

Masking removes content you cannot control, but a surprising number of false diffs come from capturing the page too early — before fonts load, images decode, or animations finish. The most robust visual tests pair masking with explicit stabilization: wait for the elements you care about, disable CSS animations and transitions, and let lazy content settle. Disabling animations globally is the single highest-leverage stabilization step because a carousel or spinner caught mid-frame guarantees a mismatch that no mask short of covering the whole component would fix.

\`\`\`typescript
it('captures only after the page is stable', async () => {
  await browser.url('/gallery');

  // 1) Kill animations/transitions so nothing is mid-frame
  await browser.execute(() => {
    const style = document.createElement('style');
    style.innerHTML = \`*, *::before, *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
      animation-delay: 0s !important;
    }\`;
    document.head.appendChild(style);
  });

  // 2) Wait for a key element and for images to finish decoding
  await $('[data-testid="gallery-grid"]').waitForDisplayed();
  await browser.waitUntil(async () =>
    browser.execute(() =>
      Array.from(document.images).every((img) => img.complete)
    ), { timeout: 5000, timeoutMsg: 'images did not finish loading' }
  );

  const mismatch = await browser.checkScreen('gallery', {
    hideElements: [await $('.ad-slot')],
  });
  await expect(mismatch).toEqual(0);
});
\`\`\`

The order matters: stabilize first, then mask, then capture. A helper that injects the animation-killing stylesheet and waits for images can be called at the top of every visual spec, turning a whole class of flaky diffs into reliable ones. Combined with the masking options above, stabilization is what separates a visual suite people trust from one they mute.

## Managing Baselines in CI

A visual suite is only as good as its baseline hygiene. Baselines are reference images committed to the repo; when an intended UI change lands, you must update them deliberately, not let the suite silently overwrite them. The service supports an "auto-save baseline" mode for the first run, but in CI you want comparisons to *fail* on drift, then a human-reviewed step to refresh baselines when the change is intended.

The recommended flow: run visual tests in CI in compare-only mode so any diff fails the build; when a designer or developer confirms a change is intended, regenerate baselines locally (or via a dedicated CI job triggered on demand), review the new images in the pull request, and commit them. Never wire CI to auto-update baselines on every run — that defeats the entire purpose, because the baseline would always match the latest (possibly broken) output.

| Mode | Behavior | When to use |
|---|---|---|
| Compare-only | Fails on any diff | Normal CI runs |
| Auto-save baseline | Saves current as baseline | First-ever run / intended UI change |
| Diff artifact upload | Stores diff PNGs as CI artifacts | Always, for reviewing failures |

Uploading the diff images as CI artifacts on failure is essential: reviewers need to *see* what changed to decide whether it is a regression or an intended update. With masking neutralizing dynamic content, stabilization eliminating timing flake, and disciplined baseline management, your visual suite becomes a dependable gate rather than noise. See the cross-browser and visual-regression material on the [blog](/blog) for more.

## Frequently Asked Questions

### What is the difference between blockOut and hideElements?

\`blockOut\` paints solid rectangles over fixed pixel coordinates after the page renders, so it ignores whatever is at that position without touching the DOM — ideal for canvas charts or iframes you cannot select. \`hideElements\` targets DOM elements by selector and sets \`visibility: hidden\`, blanking their pixels while preserving their layout footprint. Prefer \`hideElements\` whenever you can select the element, because it follows the element even if its position changes; reserve \`blockOut\` for non-selectable regions at stable positions.

### When should I use removeElements instead of hideElements?

Use \`removeElements\` (which applies \`display: none\`) when you want the page to render as if the element were never there, so surrounding content reflows to fill the gap — perfect for cookie banners, promo strips, or chat overlays. Use \`hideElements\` (which applies \`visibility: hidden\`) when the element's space is a real part of the layout you want to verify, such as dynamic text inside a fixed-height header. Choosing wrong causes either spurious reflow diffs or masked real regressions.

### What does blockOutStatusBar do and when do I need it?

\`blockOutStatusBar\` masks the mobile operating system's status bar — the strip showing the clock, battery, and signal — which changes on every run and would otherwise guarantee a mismatch. You need it for any visual test on real devices or emulators. The service knows each device's status-bar dimensions, so the boolean flag works portably across devices without hard-coded coordinates. Pair it with \`blockOutToolBar\` to also mask the browser's address/navigation bar.

### Can I set masking options globally instead of on every check?

Yes. Most masking options, including \`blockOutStatusBar\`, \`blockOutToolBar\`, and \`ignoreAntialiasing\`, can be set in the service block of \`wdio.conf.ts\` so they apply to every comparison. Per-call options passed to \`checkScreen\`/\`checkElement\`/\`checkFullPageScreen\` merge with and override the globals. The recommended pattern is to put truly universal masks in the config and add only page-specific masks inline, keeping individual tests readable while never forgetting the noisy global elements.

### Do masks apply to both the baseline and the actual screenshot?

Yes, and that is essential to how it works. When you specify a mask, the service applies it to both the stored baseline and the freshly captured actual image before running the pixel comparison. Because the masked region is identical (a solid block, or hidden/removed) in both images, it contributes zero difference. If masking applied to only one image, the mask itself would register as a giant diff, defeating the purpose.

### Why does my full-page screenshot keep failing when the viewport one passes?

A full-page capture scrolls and stitches the entire page, so it includes far more surface area and therefore far more opportunities to capture dynamic content — lazy-loaded images, ad slots, chat widgets, "recently viewed" carousels, and footers with live counters. Add masks for those widgets, set \`hideScrollBars: true\`, and consider increasing \`fullPageScrollDuration\` so lazy images finish loading between scroll steps. Scoping to \`checkElement\` for critical components is also a more stable alternative.

### How do I handle anti-aliasing noise without hiding real bugs?

Enable \`ignoreAntialiasing: true\`, which tells the comparison engine to treat sub-pixel edge smoothing as equal rather than as a difference. This removes the scattered single-pixel speckle that platform font rendering produces while still catching genuine layout and color regressions. Avoid the temptation to raise a global mismatch tolerance to a high value to silence failures — that would blind the suite to the small drifts it exists to detect. Mask precisely and use anti-aliasing tolerance instead.

## Conclusion

The WebdriverIO visual service turns flaky screenshot comparisons into reliable ones by giving you precise control over what gets compared. Use \`hideElements\` and \`removeElements\` to mask dynamic content you can select — choosing visibility-hidden when the footprint matters and display-none when it does not — fall back to coordinate-based \`blockOut\` for canvas and iframe regions, and switch on \`blockOutStatusBar\` and \`blockOutToolBar\` for every mobile run. Set universal masks globally, scope the rest per call, and read the diff image before assuming a real regression.

Want to ship a robust visual suite faster? Browse installable QA skills for your AI coding agent in the [QASkills directory](/skills) and read the visual-regression and cross-browser guides on the [blog](/blog). Drop a visual-testing skill into Claude Code or Cursor and let your agent wire up \`@wdio/visual-service\`, masking helpers, and baseline management across your pages.
`,
};
