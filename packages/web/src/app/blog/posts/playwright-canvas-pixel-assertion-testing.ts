import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Canvas Pixel Assertion Testing in Playwright',
  description:
    'Test canvas pixels in Playwright with deterministic rendering, getImageData sampling, PNG decoding, tolerances, and focused rendering diagnostics.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Canvas Pixel Assertion Testing in Playwright

At coordinate (160, 90), the chart should be blue. The DOM cannot answer whether it is. A \`canvas\` element exposes dimensions and accessibility attributes, but its bars, paths, heat cells, and brush strokes live in a bitmap maintained by the rendering context. Pixel assertion testing reads that bitmap and checks the visual fact the product promised.

Playwright gives you two practical routes. Execute \`getImageData()\` in the page to inspect canvas backing-store pixels, or capture a screenshot and decode the PNG in Node.js. The first is exact and fast for same-origin 2D canvases. The second tests the composited browser output and works when CSS placement or overlays matter. Choosing the wrong route is a common source of false confidence.

## Canvas coordinates are not page coordinates

A canvas has at least three coordinate systems. CSS pixels describe its displayed rectangle. Backing-store pixels are defined by its \`width\` and \`height\` attributes. Page screenshot pixels depend on the browser device scale factor and screenshot scale. On a high-density display, a canvas styled at 400 by 200 CSS pixels may have a backing store of 800 by 400.

Pixel tests must name the system they use. A point passed to \`CanvasRenderingContext2D.getImageData(x, y, 1, 1)\` addresses the backing store. A screenshot decoder addresses output image pixels. A mouse click through Playwright uses CSS coordinates relative to the viewport or element.

| Coordinate source | Unit | Typical use in a test | Conversion risk |
|---|---|---|---|
| \`canvas.width\` and \`canvas.height\` | Backing pixels | Direct \`getImageData()\` sampling | Canvas may be scaled by CSS |
| \`getBoundingClientRect()\` | CSS pixels | Mapping a visual feature or pointer location | Fractional layout and transforms |
| Locator screenshot buffer | Output pixels | Decode the isolated canvas image | Device scale and screenshot \`scale\` option |
| Full-page screenshot | Output pixels plus page offset | Verify composition around canvas | Scrolling, clipping, sticky elements |
| Domain coordinates | Data units, such as time and price | Select semantic sample locations | Requires the chart's real projection |

Do not hardcode a point until you know why that point represents the feature. For a chart, calculate the pixel from the known axis domain or expose a test-only projection function. For a drawing editor, replay a deterministic stroke and sample along its center and edge. Random coordinates produce tests that are hard to explain and easy to break accidentally.

## Make the render reach a testable frame

Canvas painting can happen after data fetch, font load, animation frames, WebGL compilation, or resize observation. Waiting for the element to be visible only proves that the element participates in layout. It says nothing about whether the final pixels were drawn.

The application should expose a meaningful readiness signal. A chart container can set \`data-render-state="complete"\` after data is bound, fonts are ready, animation is disabled, and the last draw completes. This is not an artificial sleep. It is an observable lifecycle contract that benefits diagnostics and accessibility tooling as well.

Use fixed input data, viewport, browser project, color scheme, locale, timezone, and device scale factor. Disable chart animation through a supported application option rather than waiting an arbitrary duration. If a library animates only on initial load, inject its configuration before navigation or provide a query parameter for the test environment.

\`\`\`ts
// tests/revenue-canvas.spec.ts
import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 900, height: 600 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
});

test('profitable bar has the approved fill and background', async ({ page }) => {
  await page.route('**/api/revenue?quarter=Q2', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        min: 0,
        max: 100,
        bars: [{ label: 'Services', value: 80, color: '#1769e0' }],
      }),
    });
  });

  await page.goto('/charts/revenue?quarter=Q2&animation=off');
  const chart = page.getByTestId('revenue-canvas');
  await expect(chart).toHaveAttribute('data-render-state', 'complete');

  const samples = await chart.evaluate((node: HTMLCanvasElement) => {
    const context = node.getContext('2d');
    if (!context) throw new Error('Expected a 2D canvas context');

    const read = (x: number, y: number) =>
      Array.from(context.getImageData(x, y, 1, 1).data);

    return {
      barCenter: read(320, 180),
      plotBackground: read(700, 120),
      size: [node.width, node.height],
    };
  });

  expect(samples.size).toEqual([800, 400]);
  expect(samples.barCenter).toEqual([23, 105, 224, 255]);
  expect(samples.plotBackground).toEqual([255, 255, 255, 255]);
});
\`\`\`

The route fixture makes the geometry repeatable. The two samples have distinct purposes: the bar center proves the positive-data fill, while the background point detects an overpainted plot. Both expectations include alpha. If the application blends translucent shapes, calculate the expected composited value or inspect a point where the alpha contract is intentional.

## Reading RGBA with getImageData

\`getImageData()\` returns a \`Uint8ClampedArray\` in RGBA order. Each channel ranges from 0 to 255. A one-pixel region therefore yields four values. Larger regions are row-major, with four entries per pixel.

Direct sampling checks what the canvas backing store contains before CSS transforms and surrounding DOM composition. That makes it excellent for verifying a heat-map cell, generated thumbnail, color picker, drawing tool, or chart raster. It also narrows a failure to a coordinate and channel values instead of presenting a large visual diff.

There is an important security restriction. Drawing an image or video from another origin without suitable CORS approval taints the canvas. Calling \`getImageData()\` then throws a \`SecurityError\`. Playwright does not bypass this browser rule. Serve the asset with correct CORS headers, proxy it through the application under test, or use screenshot-based verification when reading pixels is intentionally forbidden.

Direct canvas reads also do not represent DOM elements layered above the canvas. A tooltip implemented as HTML can cover a point on screen while \`getImageData()\` still returns the untouched chart pixel. If the requirement is what the user sees after composition, decode a screenshot.

## Decode an element screenshot when composition matters

Playwright's locator screenshot returns a \`Buffer\` when no path is required. The \`pngjs\` package can synchronously decode that buffer into width, height, and RGBA bytes. This route verifies the raster produced by the browser for the located element, including CSS opacity and child overlays within its visual bounds.

\`\`\`ts
// tests/canvas-tooltip-pixels.spec.ts
import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

function rgbaAt(png: PNG, x: number, y: number): [number, number, number, number] {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
    throw new Error(
      \`Sample (\${x}, \${y}) outside \${png.width}x\${png.height}\`,
    );
  }
  const offset = (png.width * y + x) * 4;
  return [
    png.data[offset],
    png.data[offset + 1],
    png.data[offset + 2],
    png.data[offset + 3],
  ];
}

test('hover marker and tooltip connector meet at the selected point', async ({ page }) => {
  await page.goto('/canvas/scatter?fixture=three-points&animation=off');
  const panel = page.getByTestId('scatter-panel');
  await expect(panel).toHaveAttribute('data-render-state', 'complete');

  await panel.hover({ position: { x: 240, y: 130 } });
  await expect(page.getByRole('tooltip')).toContainText('Latency: 125 ms');

  const png = PNG.sync.read(await panel.screenshot({ scale: 'css' }));
  expect(rgbaAt(png, 240, 130)).toEqual([219, 45, 65, 255]);
  expect(rgbaAt(png, 240, 95)).toEqual([70, 70, 70, 255]);
});
\`\`\`

The screenshot requests CSS scale, so a CSS position maps to one image pixel even with a high-density device. Confirm support in the Playwright version used by the project. The located panel deliberately includes both canvas and HTML tooltip, making this a composited-output test rather than a direct backing-store check.

Choose PNG, not JPEG, for exact pixel assertions. JPEG compression changes values around edges and flat colors. Locator screenshots are also easier to map than full-page images because their origin is the element's visual bounding box.

## Exact colors, tolerances, and neighborhoods

Exact RGBA equality is appropriate for flat interior fills rendered without blending. It is brittle at antialiased edges, text glyphs, shadows, gradients, filters, and subpixel boundaries. A line drawn at a half pixel can distribute coverage across neighboring pixels differently after a browser or graphics-stack update.

For those cases, assert a bounded color distance or inspect a small neighborhood. Keep the tolerance tied to a rendering reason. “Allow 40 because CI fails” is not a reason. “The diagonal boundary is antialiased, and any pixel within one CSS pixel must include at least 70 percent red coverage” is reviewable.

| Visual feature | Better assertion | Poor assertion |
|---|---|---|
| Solid bar interior | Exact RGBA at center | Whole-canvas exact equality for one color |
| One-pixel diagonal line | Matching color within a 3 by 3 neighborhood | Exact value at an edge coordinate |
| Linear gradient | Channel ranges at fixed stops | One broad average for the canvas |
| Transparent selection overlay | Expected blended RGBA over known base | Ignoring the alpha channel |
| Text label | Visual snapshot or DOM text assertion | Sampling a glyph's antialiased edge |
| Heat-map grid | Representative cell centers plus geometry | Random pixels with no domain mapping |

A neighborhood assertion should still fail when the feature moves materially. Search only the expected radius, and report the closest observed color and coordinate. Large search windows turn positional regressions into passes.

Use several semantically selected points rather than thousands of exact comparisons coded by hand. If the full raster is the contract, Playwright's visual snapshots are more maintainable. The [Playwright visual comparison snapshots guide](/blog/playwright-visual-comparison-snapshots-guide) explains baseline management and diff thresholds.

## Sampling from domain data, not magic numbers

Hardcoded coordinates age badly when chart padding changes. The strongest canvas tests translate a domain fact into a coordinate using the same public scale contract the product exposes. A financial chart might provide data-to-pixel utilities to interaction code. A map may expose a projection method. A drawing application already transforms model coordinates for pointer handling.

Do not import private chart-library internals merely to duplicate the implementation in the test. Prefer an application-level seam: stable test fixture, known dimensions, and a small read-only projection exposed in test builds. Alternatively, calculate from documented axes when the mapping is simple and independently testable.

Sample points away from boundaries. For a bar spanning x=200 through x=300, x=250 is meaningful; x=200 might be stroke, fill, or adjacent background depending on rasterization. For a heat cell, sample its center and one known gap. For a freehand stroke, sample the centerline and pixels just outside the declared brush radius.

The browser-side evaluation pattern is explained more broadly in the [Playwright page.evaluate complete guide](/blog/playwright-page-evaluate-complete-guide). Pass only serializable inputs and return plain data, because DOM nodes and rendering contexts do not cross the Playwright boundary directly.

## WebGL canvases need a different strategy

A canvas using WebGL does not provide a 2D context. Calling \`getContext('2d')\` returns null if another context mode owns it. You could read pixels through WebGL APIs inside the page, but context configuration, framebuffer selection, coordinate origin, premultiplied alpha, and preservation settings complicate the result.

For end-to-end tests of a WebGL product, locator screenshots are usually the safer public observation. Stabilize camera, scene data, shader inputs, texture loading, and animation time. Run on a controlled browser and runner image because GPU backend differences can affect rasterization. Use focused snapshots or color-region assertions rather than promising exact equality across heterogeneous hardware.

If the rendering engine has unit tests, test shaders, geometry transforms, and framebuffers closer to that layer. Playwright should verify a small number of browser-integrated outcomes: the scene initializes, a selected object has the expected screen position, a known warning overlay appears, and interaction changes the rendered state.

## Failure output that helps a graphics engineer

A useful pixel failure says more than “arrays differ.” Report the semantic sample name, coordinate system, x and y, expected RGBA, actual RGBA, canvas dimensions, CSS rectangle, device scale factor, browser project, and fixture identifier. Attach the element screenshot even when the assertion used \`getImageData()\`.

For neighborhood checks, generate a small magnified crop with a crosshair at the intended point. That artifact turns a channel mismatch into a visible rendering story. Preserve the full Playwright trace when readiness, hover, or asset loading could be responsible.

When updating an expected color, require a product source such as a design token change. Pixel baselines and tuples should not drift merely to make CI green. A rendering change can be intentional, but the review should connect the new expected pixels to that intent.

## Test drawing operations with geometric probes

Drawing applications need more than a single color check. For a pressure-independent brush, replay a stroke between known model points, then inspect the centerline, both sides of the declared width, and a point beyond the cap. The center should contain brush color, the outside points should retain the background, and the cap should follow the documented round, square, or butt geometry. This pattern catches coordinate transforms and accidental width scaling without comparing an entire artwork.

Erasers require an alpha-aware oracle. On a transparent canvas, erasing commonly reduces alpha rather than painting white. A test that expects white passes only against a white presentation background and fails to describe the exported bitmap. Sample the backing store and assert transparent RGBA, then separately screenshot the composite if the checkerboard or page background matters to users.

Undo and redo are strong metamorphic cases. Capture selected pixel values after a stroke, perform undo, and expect the original values. Redo should restore the post-stroke values. The oracle comes from state relationships rather than a large fixed fixture. Also verify that exporting and reopening the document preserves those probes, because serialization can change color space, alpha, or dimensions.

For zoom and pan, distinguish model invariance from screen output. Zooming should change which screenshot pixels contain a shape, but direct samples at backing-store coordinates may or may not change depending on the renderer's architecture. Write the requirement first: is the canvas itself re-rendered at the new transform, or is CSS transforming a stable bitmap? Then sample the layer that represents that promise.

Color management can also surprise exact checks. Browser screenshots and canvas reads may reflect different conversion stages. Keep fixtures in a known color space, avoid external profiles in tiny oracle images, and treat cross-platform color differences as a controlled-environment concern. If wide-gamut rendering is a product feature, give it a dedicated project and expected values instead of weakening every standard RGB assertion.

## Validate export pixels independently from the viewport

Canvas products often offer PNG export at a resolution different from the displayed element. A viewport sample cannot prove the downloaded file has the requested dimensions, transparent background, or unscaled stroke widths. Trigger the supported export, capture the download through Playwright, decode its bytes, and assert those properties against export coordinates.

Keep the viewport and export oracles separate. The displayed editor may render handles, selection boxes, and grids that must not appear in the exported artwork. Conversely, export can include metadata or padding not visible in the working canvas. Sampling both layers catches code that accidentally serializes the presentation canvas instead of the document surface.

When image download involves a server render, compare a few shared semantic probes rather than requiring byte identity with the client canvas. PNG encoders may write different metadata or compression while preserving pixels. Decode both images to RGBA, verify dimensions, and compare the locations tied to the document model.

## Frequently Asked Questions

### Why does getImageData throw a SecurityError in Playwright?

The canvas is probably tainted by a cross-origin image or video that was drawn without acceptable CORS headers. Browser security blocks pixel reads. Correct the asset delivery configuration or test the composited screenshot instead.

### Should canvas pixel tests run in every browser project?

Run functional pixel samples where cross-browser rendering is part of the risk, but expect more variation near antialiased features. Exact visual baselines are commonly maintained on one controlled project, with targeted behavioral checks across Chromium, Firefox, and WebKit.

### How do I map a Playwright hover position to a decoded PNG?

Capture a locator screenshot with \`scale: 'css'\`, keep the element size stable, and use coordinates relative to that locator. Without CSS scale, device pixels may multiply the hover coordinates by the device scale factor.

### Is one sampled pixel enough to verify a chart bar?

One sample is rarely sufficient. An interior point proves a color at one location, not the bar's width, height, label, or data mapping. Combine representative pixels with DOM accessibility assertions, geometry-aware samples, or a focused visual snapshot.

### Can pixel sampling replace Playwright screenshot comparison?

It is complementary. Sampling gives precise, explainable checks for chosen visual facts. Snapshot comparison covers broad raster changes. Use sampling for stable semantic points and snapshots when the entire composition is the intended contract.
`,
};
