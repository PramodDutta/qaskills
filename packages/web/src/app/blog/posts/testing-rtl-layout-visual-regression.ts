import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing RTL Layouts with Visual Regression',
  description:
    'Test RTL layouts with visual regression by controlling fonts and direction, checking logical alignment, mirrored icons, overflow, mixed text, and baselines.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Testing RTL Layouts with Visual Regression

The Arabic checkout looks plausible until the screenshot diff reveals three asymmetric defects: the coupon icon still points right, a validation bubble is clipped against the left edge, and the totals column remains aligned for English. A global \`dir="rtl"\` can reverse flow, but it cannot decide which artwork is directional, whether mixed Latin text needs isolation, or whether a physical CSS offset should have been logical.

Visual regression is valuable here because direction bugs are spatial. It must be paired with semantic and geometric assertions, otherwise a tolerant pixel threshold can approve a layout that is consistently wrong.

## Define what should mirror and what should stay fixed

RTL is not a horizontal flip of every pixel. Text direction, flex and grid flow, table columns, margins, padding, and navigation arrows often mirror. Logos, media controls, charts, clocks, mathematical notation, and familiar device icons commonly retain orientation. Product and localization teams should classify assets rather than leaving each developer to guess.

| Element | Typical RTL behavior | Test observation |
|---|---|---|
| Back navigation chevron | Mirrors to point toward inline start | Icon geometry and accessible name agree |
| Next/previous pagination | Positions and arrows mirror semantically | Correct destination after click |
| Brand logo | Remains unchanged | Pixel region matches approved asset |
| Progress arrow showing sequence | Often mirrors with flow | Stages read in localized order |
| Media play triangle | Usually unchanged | No accidental CSS transform |
| Numeric account ID | LTR run inside RTL sentence | Digits and punctuation remain readable |
| Form label and error | Align to inline start | Neither assumes physical left or right |

Create this inventory for the page under test. A screenshot reviewer can then distinguish a real directional defect from an intentional invariant.

## Drive direction through the real locale path

Do not test RTL solely by executing \`document.body.style.direction = 'rtl'\`. That bypasses routing, translation loading, locale-specific fonts, \`lang\` and \`dir\` attributes, and server-rendered markup. Enter through the same locale mechanism users receive.

\`\`\`ts
import { expect, test } from '@playwright/test';

test.describe('Arabic checkout', () => {
  test.use({
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
  });

  test('renders the review step in RTL', async ({ page }) => {
    await page.goto('/ar/checkout/review?fixture=visual-order');

    await expect(page.locator('html')).toHaveAttribute('lang', /^ar/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'مراجعة الطلب' })).toBeVisible();
    await expect(page.getByTestId('checkout-review')).toHaveScreenshot(
      'checkout-review-ar.png',
      {
        animations: 'disabled',
        caret: 'hide',
        scale: 'css',
      },
    );
  });
});
\`\`\`

Browser locale influences APIs and formatting, but it does not automatically set application direction. The \`lang\` and \`dir\` assertions prove the product applied semantic document metadata. Prefer the HTML \`dir\` attribute over using only CSS \`direction\` because direction belongs to content semantics and inherits through the document.

## Stabilize fonts before approving pixels

Arabic and Hebrew glyph rendering changes when a preferred web font fails and a platform fallback takes over. Different shaping metrics can reflow every line. Wait for document fonts and use the same browser build, operating system image, viewport, device scale, and font files for baseline generation and comparison.

\`\`\`ts
test.beforeEach(async ({ page }) => {
  await page.route('**/api/checkout/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        orderId: 'ORD-2048',
        items: [{ name: 'لوحة مفاتيح', quantity: 1, price: 349.0 }],
        total: 349.0,
      }),
    });
  });
});

async function waitForVisualReadiness(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect(page.getByTestId('checkout-skeleton')).toBeHidden();
  await expect(page.getByTestId('order-id')).toHaveText('ORD-2048');
}
\`\`\`

Network mocking shown here stabilizes application data, not font delivery. Serve fonts locally in the test build or verify the font resource loads. Mask only data that is genuinely nondeterministic and irrelevant. Masking an entire price or address region can hide the very alignment and mixed-direction bugs the RTL suite exists to catch.

For baseline mechanics and snapshot configuration, consult the [Playwright visual snapshots guide](/blog/playwright-visual-comparison-snapshots-guide).

## Prefer logical CSS and test computed geometry

Rules such as \`margin-left\` and \`border-right\` encode physical sides. Logical properties such as \`margin-inline-start\`, \`padding-inline-end\`, and \`inset-inline-start\` follow writing direction. Visual tests catch many mistakes, while small geometric assertions explain them precisely.

\`\`\`ts
test('summary label starts on the right of its value in Arabic', async ({ page }) => {
  await page.goto('/ar/checkout/review?fixture=visual-order');
  await waitForVisualReadiness(page);

  const label = await page.getByTestId('total-label').boundingBox();
  const value = await page.getByTestId('total-value').boundingBox();
  expect(label).not.toBeNull();
  expect(value).not.toBeNull();
  expect(label!.x).toBeGreaterThan(value!.x);

  await expect(page.getByTestId('totals')).toHaveScreenshot('totals-ar.png');
});
\`\`\`

This assertion encodes the page's specific design: the label occupies the inline-start side and the value follows toward inline end. It is more informative than a full-page diff alone. Avoid asserting exact pixel coordinates unless fixed placement is the contract; relative positions survive harmless spacing changes.

| Physical rule to review | Logical counterpart | Common screenshot symptom |
|---|---|---|
| \`margin-left\` | \`margin-inline-start\` | Gap stays on wrong side |
| \`right: 0\` | \`inset-inline-end: 0\` | Badge pins to LTR corner |
| \`text-align: left\` | \`text-align: start\` | Labels remain left aligned |
| \`border-left\` | \`border-inline-start\` | Accent bar fails to mirror |
| Left/right padding pair | Inline-start/end padding | Icon and text spacing swaps incorrectly |

Physical properties are not forbidden. A decorative element anchored to the physical east edge may intentionally remain there. The review question is whether the side is semantic or physical.

## Directional icons need semantic assertions

A screenshot can show a chevron reversed, but it cannot prove clicking it navigates backward. Assert icon treatment and behavior. Prefer distinct RTL assets or a documented CSS transform on a directional icon, while excluding non-directional icons from the mirroring selector.

\`\`\`ts
test('RTL back control points and navigates toward the previous step', async ({ page }) => {
  await page.goto('/ar/checkout/payment?fixture=visual-order');
  const back = page.getByRole('link', { name: 'العودة إلى الشحن' });

  await expect(back).toBeVisible();
  await expect(back.getByTestId('directional-chevron')).toHaveCSS(
    'transform',
    'matrix(-1, 0, 0, 1, 0, 0)',
  );
  await expect(back).toHaveScreenshot('back-to-shipping-ar.png');

  await back.click();
  await expect(page).toHaveURL(/\/ar\/checkout\/shipping$/);
});
\`\`\`

Computed transform matrices can differ if other transforms are composed, so a product-specific data attribute or asset identity may be a more stable semantic check. Keep the screenshot because it verifies the icon's placement, spacing, and visual direction together.

## Mixed-direction text is where shallow RTL checks fail

Arabic sentences often contain phone numbers, emails, URLs, coupon codes, currency, and Latin product names. The Unicode bidirectional algorithm can place punctuation unexpectedly when segments lack isolation. Build fixtures containing combinations that have caused real ambiguity:

1. Arabic label followed by \`support@example.test\`.
2. Order ID \`ORD-123-XY\` between Arabic words.
3. A positive and negative decimal amount with currency.
4. Parentheses around a Latin SKU.
5. User-generated text beginning with an unknown direction.
6. Arabic text containing an LTR URL with query parameters.

Use \`<bdi>\` or equivalent isolation for unknown user content where appropriate. \`dir="auto"\` lets the browser determine direction from the first strong character for such values. Do not force every number to RTL.

Take component-level snapshots for these strings. Full-page diffs make a punctuation displacement hard to locate and expensive to review.

## Overflow checks complement screenshots

Text clipping can be subtle in a scaled diff. Assert that important containers do not overflow and that controls remain inside the viewport across widths.

\`\`\`ts
test('Arabic address card does not overflow a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/ar/account/address?fixture=long-arabic');
  await page.evaluate(async () => document.fonts.ready);

  const overflow = await page.getByTestId('address-card').evaluate((element) => ({
    horizontal: element.scrollWidth > element.clientWidth,
    vertical: element.scrollHeight > element.clientHeight,
  }));
  expect(overflow.horizontal).toBe(false);
  expect(overflow.vertical).toBe(false);
  await expect(page.getByTestId('address-card')).toHaveScreenshot(
    'long-address-ar-360.png',
  );
});
\`\`\`

Some components intentionally scroll, such as a data grid. In that case assert the intended scroll axis, visible controls, and initial scroll position rather than a universal no-overflow rule. RTL \`scrollLeft\` behavior has browser nuances, so test user-observable navigation rather than hard-coding one raw value across engines.

## Baselines should be paired, not derived by flipping

Maintain approved LTR and RTL baselines from actual renders. Do not generate an RTL expectation by mirroring the LTR PNG. Text glyphs, asset exceptions, localized length, number formatting, and component order differ.

| Baseline scope | Strength | Maintenance cost |
|---|---|---|
| Whole page at key breakpoint | Finds interaction among components | Large diffs from small content changes |
| Stable section or component | Localizes directional defects | May miss page-level alignment |
| Icon control crop | Precise asset and spacing review | Too narrow for surrounding flow |
| LTR and RTL geometry assertions | Explains intended relationship | Does not cover paint and typography |

Use a small portfolio: one page snapshot, focused snapshots for risky components, and semantic assertions. More snapshots are not automatically more coverage if reviewers approve noise without inspection.

## Keep screenshot tolerance honest

Playwright waits for two consecutive stable screenshots before comparison and disables animations by default. Configure thresholds narrowly enough to expose real changes. Pixel-difference tolerances are appropriate for minor rasterization variation, not for hiding a permanently misplaced divider.

A \`stylePath\` can hide cursors or third-party dynamic widgets, but every override changes what is under test. Store the stylesheet beside visual tests and review it like test code. If it hides timestamps, verify that it does not also hide their alignment container.

Baseline updates must happen in the canonical container or runner image. Review RTL changes with someone able to assess the language and interaction semantics. A green diff produced by blindly accepting screenshots is weaker than no visual gate because it creates false confidence.

## Responsive matrices should target directional risk

Do not multiply every locale, browser, viewport, and theme without a reason. Choose combinations from layout risk:

| Variant | Defect class targeted |
|---|---|
| 360 px Arabic | Wrapping, clipped actions, off-canvas navigation |
| Desktop Hebrew | Dense tables and mixed numeric columns |
| WebKit RTL | Engine-specific shaping and scroll behavior |
| High contrast or dark RTL | Directional assets and focus indicators |
| 200% zoom equivalent viewport | Reflow and logical spacing |

Keep one canonical environment for strict pixel baselines. Use additional engines for semantic, overflow, and selective component snapshots if raster differences make shared baselines costly.

The [internationalization testing guide](/blog/internationalization-testing-i18n-guide) covers translations, pluralization, dates, collation, and locale input beyond visual direction.

## Triage RTL diffs by layer

When a diff appears, check document state first: correct locale, \`lang\`, and \`dir\`. Then verify fonts and fixture data. Next classify the region as flow, alignment, asset mirroring, bidi isolation, overflow, or unrelated nondeterminism. Use Playwright trace and DOM inspection to connect pixels to computed CSS.

An image diff showing the whole panel shifted can stem from one physical margin on the parent. Fix the root logical property instead of updating child offsets. If only glyph edges differ across CI, compare font network responses and runner image before increasing tolerance.

## A release-ready RTL visual suite

For each critical journey, include the real RTL locale route, deterministic representative content, loaded target fonts, semantic document attributes, selected visual baselines, relative geometry for key relationships, behavior checks for directional controls, mixed-script fixtures, and overflow cases at narrow widths. Run it in a pinned environment and require human review for baseline changes.

Visual regression then serves its proper role: detecting spatial consequences that DOM assertions miss, while semantic checks explain whether the mirrored interface still works.

## Forms mix directions inside one component

Arabic forms still contain LTR email addresses, card numbers, and coupon codes. Assert field-level direction, validation placement, reveal-icon position, and focus outline rather than assuming every descendant inherits RTL.

\`\`\`ts
test('email remains readable in the RTL profile form', async ({ page }) => {
  await page.goto('/ar/account/profile?fixture=mixed-fields');
  const email = page.getByLabel('البريد الإلكتروني');
  await expect(email).toHaveValue('reader@example.test');
  await expect(email).toHaveCSS('direction', 'ltr');
  await email.focus();
  await expect(page.getByTestId('email-field')).toHaveScreenshot(
    'email-field-focused-ar.png',
    { caret: 'hide' },
  );
});
\`\`\`

Whether the field aligns physically left or at inline start is a design decision, but character order must remain intelligible. Include the longest supported localized error message.

## Tables need approved column semantics

The \`dir\` attribute can reverse table columns. Some analytic products intentionally keep metric order stable while localizing labels. Capture a focused baseline and assert header associations with roles.

| Table risk | Visual check | Behavioral check |
|---|---|---|
| Reversed columns | Approved RTL sequence | Cells retain correct headers |
| Numeric alignment | Decimal columns line up | Values sort numerically |
| Sticky identifier | Correct inline edge sticks | Horizontal scroll keeps it visible |
| Sort indicator | Arrow avoids heading overlap | Click updates \`aria-sort\` |
| Wide content | Edge shadow appears correctly | Keyboard reaches hidden cells |

Do not assume mirroring the whole grid is correct. Domain conventions may outweigh simple flow reversal.

## Keyboard order is not visible in pixels

CSS can reorder children without changing DOM focus order. Walk controls with Tab and assert focus through accessible roles. Task order does not always correspond to monotonically decreasing x-coordinates, especially in dialogs and mixed-direction forms.

Inspect focus-ring clipping at both inline edges. An outline tuned for an LTR drawer can disappear under an RTL overflow container. Keep keyboard behavior as the oracle and add a focused snapshot for paint.

Theme variants can choose different SVG assets or remove background arrows in forced colors. Test accessible naming first, then use targeted theme snapshots for components whose directional art actually changes. Avoid multiplying every page baseline across every theme without a specific directional risk.

## Test overlays at both inline edges

Tooltips, menus, date pickers, and validation popovers frequently use physical positioning from an anchoring library. Open them near the right and left viewport edges in RTL, then assert they remain visible and point to the triggering control. A closed-state page screenshot cannot expose collision and fallback-placement defects.

Dialogs introduce their own direction boundary. The page may be RTL while an embedded code sample remains LTR. Verify the dialog inherits the intended \`dir\`, its close button occupies the approved side, focus enters and returns correctly, and long localized actions wrap without reversing priority.

## Compare meaning, not pixel symmetry

An RTL screenshot does not need to be geometrically symmetric with English. Translation length changes wrapping, Arabic fonts have different ascenders, and localized dates change width. Review whether hierarchy, relationships, and task flow are preserved. Exact mirroring is expected only for selected spatial structures.

When a diff is caused by an approved translation update, examine overflow and adjacent controls before updating the baseline. A legitimate text change can reveal a real layout defect. Record why the baseline changed in review so future investigators know whether an asymmetry was intentional.

## Frequently Asked Questions

### Can I create the RTL baseline by flipping the LTR screenshot?

No. RTL rendering includes different text, shaping, punctuation, component order, and assets that intentionally do not mirror. Capture an actual RTL render through the application's locale path.

### Should every icon be mirrored in an RTL interface?

No. Mirror icons that encode horizontal direction, such as back and forward in a flow. Logos, media controls, clocks, and many universal symbols usually remain fixed. Maintain a product-reviewed icon classification.

### Why do RTL screenshots differ only in CI?

The usual causes are missing or different fonts, a different browser build, viewport or device-scale mismatch, locale data, and animations or late content. Pin the environment and wait for \`document.fonts.ready\` plus application readiness.

### Is \`dir="rtl"\` enough to test Arabic layout?

It is necessary but not sufficient. Test localized content, logical CSS, mixed-direction strings, directional assets, overflow, focus order, and control behavior. Enter via the real locale selection so server and client setup are included.

### How much screenshot difference should an RTL test allow?

Use the smallest tolerance compatible with stable rendering in the pinned environment. Derive it from observed antialiasing noise, not from the size of a current failure. A tolerance should never be used to approve layout displacement.
`,
};
