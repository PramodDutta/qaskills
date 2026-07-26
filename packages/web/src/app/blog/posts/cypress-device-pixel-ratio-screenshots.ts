import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress device pixel ratio screenshots',
  description:
    'Cypress device pixel ratio screenshots: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Cypress',
  primaryKeyword: 'Cypress device pixel ratio screenshots',
  keywords: [
    'Cypress device pixel ratio screenshots',
    'Cypress screenshot pixel ratio',
    'device scale visual test',
    'Cypress viewport screenshot stability',
    'retina screenshot baseline Cypress',
    'browser zoom visual regression',
  ],
  relatedSlugs: [
    'cypress-best-practices-2026-guide',
    'cypress-intercept-network-stubbing-reference',
    'cypress-image-snapshot-visual-guide',
    'cypress-percy-visual-testing-guide',
  ],
  sources: [
    'https://docs.cypress.io/app/core-concepts/test-isolation',
    'https://docs.cypress.io/app/core-concepts/retry-ability',
    'https://docs.cypress.io/api/commands/screenshot',
  ],
  repoEvidence: ['seed-skills/cypress-e2e/SKILL.md', 'seed-skills/screenshot-testing-ci/SKILL.md'],
  content: `Cypress device pixel ratio screenshots need the same view size, web tool, scale, zoom, fonts, and shot mode on both sides of a check. Save those facts with each image before the pixel test begins; if one fact does not match, stop and fix the test setup instead of stretching the image.

## What does Cypress device pixel ratio screenshots verify?

The test asks if two images came from the same kind of run. It checks page size, screen scale, web tool, font set, shot mode, and file size first, so a wide pixel rule cannot hide a bad host or the wrong base file.

- CSS pixels describe layout space, while screenshot files contain a raster grid. Device scale and capture implementation can change that grid without changing the configured Cypress viewport.

- Cypress viewport width and height establish the application's layout size. They do not, by themselves, prove the host browser uses the same device scale as the baseline runner.

- The runtime value window.devicePixelRatio provides direct evidence about CSS-to-device pixel scaling. Record it inside the page immediately before capture rather than inferring it from the machine name.

- Browser family and version matter because capture and font rendering can change between engines or releases. Store both fields with the artifact and partition baselines when support requires several engines.

- Screenshot capture mode matters independently from viewport. A viewport capture, full-page capture, runner capture, and element capture can have different dimensions and clipping behavior.

- The [Cypress screenshot command reference](https://docs.cypress.io/api/commands/screenshot) defines capture options such as capture mode, overwrite, blackout, and scale. Those options belong in the artifact contract.

- Browser zoom can affect devicePixelRatio, visible area, or raster output depending on runtime. Record devicePixelRatio, inner dimensions, and visual viewport data instead of trusting one zoom label.

- Font files, scrollbars, animations, and application state still affect pixels after scale matches. The scale gate is necessary, but it does not replace ordinary visual stabilization.

- The repository path seed-skills/cypress-e2e/SKILL.md configures fixed viewportWidth and viewportHeight values and enables failure screenshots. It also recommends cy.screenshot for debugging, which anchors the Cypress workflow used here.

- The repository path seed-skills/screenshot-testing-ci/SKILL.md describes screenshot baselines, environment setup, CI artifacts, and failure diagnosis. Its advice is broad, so this article adds a concrete compatibility manifest.

- The [Cypress best practices guide](/blog/cypress-best-practices-2026-guide) covers general suite design. This article owns device scale and screenshot provenance before visual comparison.

- A green result needs two stages: metadata compatibility and pixel comparison. If stage one fails, report the environmental difference and skip the misleading image diff.

Cypress device pixel ratio screenshots are sound when each image states how it was made. A new name, a new size, or a loose pixel rule cannot turn a shot from the wrong scale, web tool, or page size into a fair match.

## How do you build a Cypress screenshot pixel ratio?

Use one small page with fixed text, local fonts, still parts, and no live feed. Pick one view size and shot mode, then save a short JSON fact file by the PNG and read the true DPR from the page just before the shot.

- Use a page with fixed content, local fonts, stable colors, no live dates, and no third-party widgets. Include thin borders and text because scale mismatches become obvious on those edges.

- Set viewportWidth and viewportHeight in Cypress configuration for the main project. Call cy.viewport in the test when a named scenario deliberately changes layout size.

- Wait for fonts through document.fonts.ready and disable fixture animations through an application test mode. Do not use an arbitrary sleep as proof that the page is stable.

- The [Cypress retry-ability guide](https://docs.cypress.io/app/core-concepts/retry-ability) explains how queries and assertions retry. Use visible-state assertions before capture, then run the non-query screenshot only after those conditions pass.

- Record Cypress.browser family, name, displayName, majorVersion, and full version where available. A baseline should not silently cross browser families.

- Read window.innerWidth, window.innerHeight, window.devicePixelRatio, visualViewport scale, and document font status in one queued step. These observations should describe the page used by the next capture.

- Choose capture: viewport for a viewport baseline or capture the selected element directly. Do not compare a full-page candidate with an element baseline even when cropped dimensions happen to match.

- The first example adapts viewport and screenshot use from seed-skills/cypress-e2e/SKILL.md. Its Chromium launch flag is runtime-specific, so the test still measures the resulting devicePixelRatio instead of trusting configuration intent.

\`\`\`typescript
import { defineConfig } from 'cypress';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export default defineConfig({
  viewportWidth: 1280,
  viewportHeight: 720,
  e2e: {
    setupNodeEvents(on) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--force-device-scale-factor=1');
        }
        return launchOptions;
      });

      on('task', {
        writeVisualMetadata(input: { path: string; data: unknown }) {
          mkdirSync(dirname(input.path), { recursive: true });
          writeFileSync(input.path, JSON.stringify(input.data, null, 2));
          return null;
        },
      });
    },
  },
});
\`\`\`

- Treat the launch flag as a requested Chromium setting, not portable proof. Firefox and other runtimes need their own reviewed environment strategy or separate baselines.

- Fail early if measured devicePixelRatio differs from the project's expected value. Continuing would create a candidate image that cannot answer whether the UI changed.

- Write the manifest with the same artifact stem as the PNG. A detached global environment file cannot prove which image used which settings after parallel retries.

- Use the [Cypress image snapshot guide](/blog/cypress-image-snapshot-visual-guide) for the later pixel comparator. Keep metadata rejection ahead of that plugin or custom diff.

## What breaks device scale visual test?

The check is wrong if it starts with pixels, treats page size as file size, mixes web tools, skips zoom facts, or scales a new image in secret. A new font, scroll bar, shot mode, or old base file can make the same broad field of false change.

- A retina baseline on a standard-density runner often differs across every edge and glyph. Raising the pixel threshold accepts environmental noise and can hide a real component defect.

- Resizing the candidate to baseline dimensions destroys evidence. Interpolation changes pixels, and a passing diff no longer represents either original browser render.

- A matching PNG width does not prove matching conditions. Cropping, capture mode, browser chrome, or internal scaling can produce equal dimensions through different paths.

- A matching devicePixelRatio does not prove matching layout. The viewport, page zoom, fonts, scrollbars, and capture target still need explicit comparison.

- Running Chrome against an Electron baseline can change text and controls even at the same viewport and scale. Partition or pin baselines rather than treating every Chromium build as identical.

- Browser zoom can alter devicePixelRatio in some desktop environments. In others, visual viewport values or raster dimensions provide the clearer signal, so retain all observed fields.

- Full-page captures can include content outside the initial viewport and may alter layout while stitching or scrolling. Compare only with a baseline created under the same capture option.

- Element captures depend on the element's bounding box and overflow. Store selector identity and measured CSS rectangle beside capture mode.

- A hidden scrollbar changes available CSS width and can shift wrapping. Record inner width and document client width to expose that condition.

- Font fallback can change glyph width while every scale field matches. Require the expected font family to load and store its fixture version or build digest.

- Baselines copied from developer laptops can combine display scale, browser profile, and font differences that CI cannot reproduce. Create approved baselines in the same controlled image used for comparison.

- The [Cypress Percy guide](/blog/cypress-percy-visual-testing-guide) covers managed visual infrastructure. The same provenance rule applies even when another service stores the images.

## Cypress viewport screenshot stability fixtures and controls

Start with one clean base image and one new shot from the same host, then change one fact per row. Change page size, scale, zoom, web tool, shot mode, font, or scroll bar, and state if the fact check or the pixel check should fail first.

- The baseline uses 1280 by 720 CSS pixels, measured devicePixelRatio 1, one pinned Chromium build, viewport capture, local fonts, hidden test animation, and a stable component state.

- The repeat control captures the same page twice in fresh tests under the same image. Both manifests should match before the images enter the ordinary visual tolerance.

- The viewport mutation changes width to 1279 and preserves every other field. Compatibility should fail on viewport before a line-wrap diff is calculated.

- The scale mutation runs the same CSS viewport under measured devicePixelRatio 2. Compatibility should fail on scale and report the candidate image dimensions.

- The browser mutation runs a different family or reviewed version partition. The generic baseline should be rejected unless the manifest selects that browser's own baseline.

- The zoom mutation changes the available zoom control in a dedicated job. Require at least one measured zoom, DPR, viewport, or raster field to expose the incompatible state.

- The capture mutation changes viewport to fullPage or element. Reject it even if a crop later yields similar dimensions because provenance and layout scope changed.

- The font mutation blocks one local font response or changes its build digest. The page-state assertion should fail before capture, or metadata should mark a fallback explicitly.

- The scrollbar mutation adds enough fixed content to create overflow. Record client width and scrollbar presence so line shifts have a clear setup cause.

- The animation mutation removes the test freeze. Repeated images may differ, but scale metadata should still match, which correctly assigns the failure to page stability.

- The mixed-baseline mutation gives the comparator a PNG from one run and JSON from another. A shared artifact ID and digest should reject that pair before visual analysis.

- Cleanup removes screenshots, manifests, videos, and downloaded fonts from the isolated attempt directory. Verify the next run starts without a stale candidate.

## How should retina screenshot baseline Cypress be asserted?

Match the page size, read DPR, web tool group, shot mode, zoom facts, and base ID with exact checks. Next, compare the raw PNG size and pixels with no new scale step, and use the small approved noise rule only for shots from that same kind of run.

- Name baseline partitions by browser, platform image, DPR, viewport, and capture target. A human-readable name helps, but the JSON fields remain the decision source.

- Compare measured DPR as a number captured from the page. Do not derive it only from requested launch flags or the runner's display marketing name.

- Compare CSS viewport fields separately from PNG dimensions. Their relationship can depend on browser and Cypress capture behavior, so characterize it for the pinned project.

- Read PNG width and height from the artifact itself. This catches truncated, scaled, or wrongly selected files before expensive diff work begins.

- Require capture mode and screenshot scale option to match. The Cypress option named scale concerns capture behavior and should not be confused with devicePixelRatio.

- Require baseline and candidate artifact IDs to match their manifests. This prevents a retry from pairing the newest JSON with an older PNG.

- The second example adapts CI baseline checks from seed-skills/screenshot-testing-ci/SKILL.md. It reads PNG dimensions directly and rejects incompatible metadata before returning a comparable pair.

\`\`\`typescript
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

type VisualManifest = {
  browser: string;
  browserMajor: number;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  capture: 'viewport' | 'fullPage' | 'element';
  image: { width: number; height: number };
  artifactId: string;
};

function pngDimensions(path: string) {
  const bytes = readFileSync(path);
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function requireCompatible(
  baseline: VisualManifest,
  candidate: VisualManifest,
  candidatePng: string,
) {
  assert.equal(candidate.browser, baseline.browser);
  assert.equal(candidate.browserMajor, baseline.browserMajor);
  assert.deepEqual(candidate.viewport, baseline.viewport);
  assert.equal(candidate.devicePixelRatio, baseline.devicePixelRatio);
  assert.equal(candidate.capture, baseline.capture);
  assert.deepEqual(pngDimensions(candidatePng), candidate.image);
  assert.deepEqual(candidate.image, baseline.image);
}
\`\`\`

- The PNG signature check is deliberately small and dependency-free. A production artifact reader should also reject corrupt or incomplete files with a useful diagnostic.

- Decide whether browser patch versions share a baseline through review and evidence. The sample partitions by major version, but a project can choose stricter pinning when rendering changes demand it.

- Do not normalize image dimensions inside requireCompatible. A mismatch should stop comparison and preserve both original artifacts for diagnosis.

- After compatibility passes, run the selected image diff and report changed regions. Environment metadata remains attached so reviewers know that pixel evidence came from comparable renders.

- The strongest assertion says why comparison was allowed before it says how many pixels changed. That order prevents tolerance from hiding an invalid experiment.

## browser zoom visual regression in CI

CI should start one pinned web tool in one fixed host image, read the page facts, and save one fact file for each shot. The Cypress device pixel ratio screenshots job must reject wrong facts, lost files, no test rows, mixed retry files, and base changes with no review; see the [test FAQ](/faq).

- Pin operating system image, browser binary, Cypress version, Node version, font packages, locale, timezone, color settings, and viewport configuration. Record immutable image and dependency identifiers.

- Request a DPR for supported Chromium jobs and verify the measured result. If the browser ignores the flag, fail setup instead of producing a mislabeled baseline.

- Run each baseline partition in its own worker or output directory. Parallel jobs should never write the same PNG or manifest path.

- Use the [Cypress test isolation guide](https://docs.cypress.io/app/core-concepts/test-isolation) to keep browser state and test setup independent. Visual state still needs explicit application reset beyond framework defaults.

- Assert fixture readiness through retryable queries, font promises, and network aliases. Capture only after those conditions pass, because cy.screenshot itself should not become a timing loop.

- Store browser observations and image dimensions on success and failure. If capture fails, retain setup metadata with a missing-image status rather than publishing an empty file.

- Require expected screenshot and manifest counts. A filtered test suite with zero captures is missing visual evidence, not a clean release.

- On retries, include attempt in the temporary artifact path. Promote only the accepted attempt as one matched PNG and JSON pair.

- Treat baseline changes as reviewed artifacts with their source commit and environment digest. Never update a baseline automatically because a candidate failed.

- Report compatibility differences before image differences. A DPR mismatch belongs to runner configuration, while a compatible pixel change belongs to application or reviewed rendering drift.

- Run a same-environment repeat periodically to estimate ordinary noise. Do not use cross-density results to calculate that tolerance.

- Cypress device pixel ratio screenshots should block release when provenance is incomplete or incompatible. A pixel threshold applies only after all required metadata fields agree.

## Cypress device pixel ratio screenshots comparison matrix

Keep the CSS view size fixed unless the row says to change it, and change no other fact by chance. Check the saved facts first and let only a fair pair reach the pixel step, then use the [end-to-end testing category](/categories/e2e-testing) for the next test layer.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Same viewport and scale | Same pinned browser, DPR, fonts, and capture | Metadata matches, then ordinary visual diff runs | Provenance differs or repeat exceeds tolerance | seed-skills/cypress-e2e/SKILL.md |
| Same viewport, different scale | DPR 1 baseline and measured DPR 2 candidate | Compatibility fails before pixel comparison | Candidate is resized or thresholded | [Cypress screenshot command](https://docs.cypress.io/api/commands/screenshot) |
| Retina baseline on standard CI | DPR 2 baseline enters DPR 1 job | Baseline partition is rejected | Wrong-density baseline is accepted | seed-skills/screenshot-testing-ci/SKILL.md |
| Browser zoom changes | Same config with changed measured zoom state | DPR, viewport, zoom, or dimensions expose drift | Pixel noise appears without setup diagnosis | [Cypress retry-ability](https://docs.cypress.io/app/core-concepts/retry-ability) |
| Element versus full page | Change only capture target | Capture-mode compatibility fails | Cropped dimensions are treated as equivalent | seed-skills/cypress-e2e/SKILL.md |

- Row one is the only default route to image comparison. It still needs stable application state and a reviewed tolerance after metadata passes.

- Row two must preserve both original images. Resampling would erase the evidence that the candidate came from a different raster scale.

- Row three checks baseline selection as well as runtime setup. A well-labeled runner can still load the wrong stored artifact.

- Row four does not rely on one browser's zoom signal. It compares the complete measured set and image dimensions for the pinned runtime.

- Row five proves capture scope is contractual. A similar crop cannot substitute for the intended page or element boundary.

- Add browser-family, font-digest, scrollbar, and mixed-attempt rows when those causes appear in failure history. Keep each mutation isolated for direct diagnosis.

## How do you implement Cypress device pixel ratio screenshots?

Pin the host and web tool, read the true scale, and write one PNG plus one fact file with the same ID. Run a clean pair first, then change page size, DPR, zoom, web tool, or shot mode one at a time; the [QA blog](/blog) can guide wider checks.

1. Read seed-skills/cypress-e2e/SKILL.md and seed-skills/screenshot-testing-ci/SKILL.md. Record supported viewport, browser, screenshot, artifact, CI, and cleanup behavior while defining the compatibility manifest for this project.
2. Build one deterministic component route with local fonts, frozen animation, fixed data, known scroll behavior, and visible scale-sensitive details. Choose the baseline viewport and capture mode before generating images.
3. Launch the pinned browser, request any supported device-scale setting, measure DPR and viewport inside the page, assert fixture readiness, capture one PNG, and write a same-stem JSON manifest.
4. Repeat under the same environment, then change viewport, DPR, zoom condition, browser partition, font state, scrollbar, and capture mode in separate cases. Preserve every original candidate without resizing.
5. Compare manifests, artifact IDs, and PNG dimensions with the five-row matrix. Stop incompatible pairs before pixel diff, and report the first environmental field that differs.
6. Run isolated projects in CI, require expected artifact counts, verify cleanup, and place every baseline update under human review. Retain environment digests with approved PNG and manifest pairs.

- Begin with one browser and DPR partition. Add supported variants only when the product needs them and the baseline store can keep their identities separate.

- Measure after navigation and immediately before capture. A page action or browser change between measurement and screenshot weakens artifact provenance.

- Keep metadata comparison deterministic and exact for categorical fields. Visual tolerance should never apply to viewport, DPR, browser, capture mode, or image size.

- Use the [Cypress intercept guide](/blog/cypress-intercept-network-stubbing-reference) to stabilize test data and fonts when appropriate. Do not stub the screenshot mechanism under test.

- Use the [Cypress visual guide](/blog/cypress-image-snapshot-visual-guide) after compatibility succeeds. Its image workflow should consume, not bypass, the manifest decision.

- Browse verified [Cypress skills](/skills) for the two repository workflows. The project still owns browser partitions, expected scale, and baseline review policy.

- Keep one rejected incompatible pair as a test fixture. It proves future refactoring cannot accidentally move pixel comparison ahead of metadata validation.

Artifact compatibility validation should compare captured viewport metadata, runtime devicePixelRatio, browser revision, operating-system image, font inventory, capture configuration, and decoded raster dimensions before visual analysis begins. Preserving immutable artifact identifiers and environment digests prevents cross-attempt pairing, silent resampling, baseline provenance errors, or incompatible renderer output from contaminating pixel-level regression evidence.

Deterministic screenshot evaluation also requires animation control, network stabilization, isolated output directories, verified font readiness, explicit scrollbar state, and reviewed baseline partitioning. These controls distinguish rendering instability from environment incompatibility, while original unscaled images preserve the diagnostic information needed for reproducible investigation, comparison, and approval.

## Frequently Asked Questions

### How should QA control viewport, browser scale, and device pixel ratio so Cypress screenshots remain comparable?

Pin the web tool and host, set the CSS view size, ask for a known scale, and read DPR from the page before the shot. Save view, DPR, tool, zoom, shot mode, and PNG size with each image; stop on any fact gap, and do not resize the new file.

### What should an Cypress screenshot pixel ratio fixture record?

Save web tool and build, host image, Cypress build, CSS view size, DPR, zoom facts, client size, shot mode, font state, PNG size, file ID, base ID, and try count. Add page and cleanup state so old files or files from two workers cannot look like one fair pair.

### Which failure proves device scale visual test is broken?

A DPR, view, shot mode, web tool, or PNG size gap that still reaches the pixel step proves the gate is wrong. A fair repeat with too much pixel change points to page drift instead; keep those two fault types apart so the host team and app team get the right work.

### How do teams isolate Cypress viewport screenshot stability?

Use one fixed page, local fonts, no test motion, a set view, fresh web state, and a new file path for each try. Make one fair repeat first, then change one fact per row and clear all try files at the end so the next job cannot pick an old image.

### Which assertion is strongest for retina screenshot baseline Cypress?

Match the saved DPR, view, web tool group, shot mode, zoom facts, and image size before checking raw pixels. Make sure the PNG and JSON share one file ID; this stops the wrong scale, mixed tries, hidden resize work, and a loose pixel rule from reaching the final score.

### How should CI report browser zoom visual regression failures?

Report both web tool builds, DPR, CSS view, zoom facts, client size, shot mode, PNG size, host key, and file IDs. Name the first fact that does not match and skip pixel score; if all facts match, show changed zones as a page fault, not a guess about zoom.

## Conclusion

Cypress device pixel ratio screenshots help only after page size, true scale, web tool, zoom facts, fonts, shot mode, and PNG size all match. The fact check keeps host noise out of the pixel diff, while shared file IDs and a review keep the base image tied to its source.

Read the [Cypress best practices guide](/blog/cypress-best-practices-2026-guide), then open verified [QA skills](/skills) and run this fact grid before the next base image change. Keep each approved PNG with its JSON facts, so a new host or Cypress build has one known base for a fair test.`,
};
