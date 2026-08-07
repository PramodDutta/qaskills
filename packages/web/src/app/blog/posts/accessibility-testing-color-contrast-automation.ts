import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Accessibility Testing Color Contrast Automation That Survives Real UI Themes',
  description: 'Build accessibility testing color contrast automation that checks WCAG ratios on live DOM states, catches overlay failures, and gates CI without token noise.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Accessibility Testing Color Contrast Automation That Survives Real UI Themes

Accessibility testing color contrast automation is the practice of measuring foreground and background luminance for real text and non-text UI on a rendered page, then asserting those ratios against WCAG thresholds for each component state. The payoff is early detection of regressions that manual design reviews miss: hover styles that drop body text under 4.5:1, disabled buttons that look fine in light mode but vanish in dark mode, and toast messages layered over busy background images.

You do not get durable coverage by screenshotting a style guide once. Contrast is a runtime property of the cascade. Opacity, pseudo-elements, sticky headers, CSS variables, forced colors, and high-contrast modes all change the effective colors under the cursor. Automation that samples computed styles on the live tree, walks visible interactive and textual nodes, and records both the ratio and the element identity is the baseline that scales across design systems.

This guide shows how to build that pipeline with browser automation, how to map WCAG text and non-text criteria to concrete selectors and states, where teams create false confidence, and how to wire contrast gates into CI so intentional token changes still land while accidental regressions fail the pull request. If your suite also covers keyboard focus and locator stability, pair this with the guidance in [Playwright best practices for locators](/blog/playwright-best-practices-locators-2026) so contrast checks attach to resilient targets rather than brittle class chains.

## WCAG contrast rules you can turn into measurable checks

WCAG 2.2 defines contrast requirements that map cleanly to automated oracles when you separate text size, UI component type, and incidental graphics. The Understanding documents at https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html and https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html are the normative intent sources. Automation should encode the observable outcomes, not invent stricter product rules unless your org policy requires them.

For text and images of text, Success Criterion 1.4.3 Contrast (Minimum) at Level AA requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text. Large text is typically 18pt regular or 14pt bold and larger. Success Criterion 1.4.6 Contrast (Enhanced) at Level AAA raises those floors to 7:1 and 4.5:1. Most product teams gate AA and treat AAA as progressive enhancement for legal copy or critical alerts.

For non-text UI, Success Criterion 1.4.11 Non-text Contrast requires at least 3:1 for graphical objects and user interface components that convey meaning, against adjacent colors. That includes focus indicators, icon-only buttons, chart series that encode categories, and input borders when the border is the only affordance. Decorative graphics and inactive components have different expectations; inactive states often need separate product policy beyond the letter of the criterion.

| Criterion | Level | Typical automated threshold | What to sample |
|---|---|---|---|
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 normal, 3:1 large | Text color vs effective background |
| 1.4.6 Contrast (Enhanced) | AAA | 7:1 normal, 4.5:1 large | Same samples, stricter gate for critical copy |
| 1.4.11 Non-text Contrast | AA | 3:1 | Control borders, icons, focus rings vs adjacent colors |
| 1.4.1 Use of Color | A | Not a ratio alone | Do not rely on color-only status without shape or text |

Automation cannot fully certify 1.4.1 Use of Color by ratio alone. A red error outline at 3:1 may still fail if color is the only error cue. Keep a separate assertion that error messages exist in text or aria messaging, and use contrast automation for the visual legibility of that text and border.

## Convert CSS colors into relative luminance and ratios

The contrast ratio formula is public and stable: \`(L1 + 0.05) / (L2 + 0.05)\` where L1 is the lighter relative luminance and L2 is the darker. Relative luminance for sRGB follows the WCAG definition that linearizes each channel before weighting red, green, and blue. Implement this once as a pure function and unit test it against known pairs such as black on white (21:1) and mid gray on white.

\`\`\`ts
export type Rgb = { r: number; g: number; b: number; a?: number };

export function parseCssColor(input: string): Rgb | null {
  const hex = input.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) {
      return {
        r: parseInt(h[0] + h[0], 16),
        g: parseInt(h[1] + h[1], 16),
        b: parseInt(h[2] + h[2], 16),
        a: 1,
      };
    }
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgb = input.match(
    /^rgba?\\(\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*,\\s*([\\d.]+)(?:\\s*,\\s*([\\d.]+))?\\s*\\)$/i,
  );
  if (!rgb) return null;
  return {
    r: Number(rgb[1]),
    g: Number(rgb[2]),
    b: Number(rgb[3]),
    a: rgb[4] === undefined ? 1 : Number(rgb[4]),
  };
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(rgb: Rgb): number {
  const r = channelLuminance(rgb.r);
  const g = channelLuminance(rgb.g);
  const b = channelLuminance(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg: Rgb, bg: Rgb): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
\`\`\`

Unit tests for the pure functions belong in whatever [JavaScript testing frameworks](/blog/javascript-testing-frameworks-complete-guide-2026) your monorepo already standardizes on. Keep browser sampling and ratio math separate so CI can fail fast on math regressions without launching Chromium.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseCssColor } from './contrast';

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    const black = parseCssColor('#000000')!;
    const white = parseCssColor('#ffffff')!;
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
  });

  it('is commutative for the same pair', () => {
    const a = parseCssColor('rgb(32, 32, 32)')!;
    const b = parseCssColor('rgb(250, 250, 250)')!;
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 8);
  });
});
\`\`\`

Alpha is the hard part. Semi-transparent text or glassmorphism cards require compositing the foreground over the background before measuring. A naive \`color\` versus \`background-color\` comparison on a translucent label will report an optimistic ratio that sighted users never see. Composite using the standard over operator until alpha reaches 1 or you hit a solid ancestor.

## Sample effective colors from the live DOM, not design tokens alone

Design tokens are useful for preventing entire themes from shipping broken defaults. They are not sufficient for product UI. Components override tokens, local styles inject opacity, and content authors place light text on hero images. Sample from the rendered tree.

A practical Playwright pattern evaluates inside the page, walks candidates under a root, and returns serializable findings. Prefer role and text based targeting when you assert a specific control, and use a broad scan for regression sweeps.

\`\`\`ts
import { test, expect, type Page } from '@playwright/test';

type ContrastFinding = {
  selectorHint: string;
  textSample: string;
  fg: string;
  bg: string;
  ratio: number;
  fontSizePx: number;
  fontWeight: number;
  required: number;
  pass: boolean;
};

async function scanTextContrast(page: Page, root = 'main'): Promise<ContrastFinding[]> {
  return page.locator(root).evaluate((rootEl) => {
    const parse = (input: string) => {
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#000';
      ctx.fillStyle = input;
      const computed = String(ctx.fillStyle);
      // Canvas serializes fully opaque colors as #rrggbb and only uses
      // rgba() when there is alpha, so handle both forms.
      const hex = computed.match(/^#([0-9a-f]{6})$/i);
      if (hex) {
        const n = parseInt(hex[1], 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
      }
      const m = computed.match(
        /rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/i,
      );
      if (!m) return null;
      return {
        r: Number(m[1]),
        g: Number(m[2]),
        b: Number(m[3]),
        a: m[4] === undefined ? 1 : Number(m[4]),
      };
    };

    const channel = (c: number) => {
      const x = c / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    const lum = (rgb: { r: number; g: number; b: number }) =>
      0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
    const ratio = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
      const L1 = lum(a);
      const L2 = lum(b);
      const light = Math.max(L1, L2);
      const dark = Math.min(L1, L2);
      return (light + 0.05) / (dark + 0.05);
    };

    const solidBackground = (el: Element): { r: number; g: number; b: number } | null => {
      let current: Element | null = el as Element;
      let acc = { r: 0, g: 0, b: 0, a: 0 };
      while (current && current !== document.documentElement) {
        const bg = parse(getComputedStyle(current).backgroundColor);
        if (bg && bg.a > 0) {
          const a = bg.a * (1 - acc.a);
          acc = {
            r: acc.r + bg.r * a,
            g: acc.g + bg.g * a,
            b: acc.b + bg.b * a,
            a: acc.a + a,
          };
          if (acc.a >= 0.99) {
            return { r: acc.r / acc.a, g: acc.g / acc.a, b: acc.b / acc.a };
          }
        }
        current = current.parentElement;
      }
      return { r: 255, g: 255, b: 255 };
    };

    const isLarge = (sizePx: number, weight: number) => {
      const pt = sizePx * 0.75;
      return pt >= 18 || (pt >= 14 && weight >= 700);
    };

    const nodes = Array.from(rootEl.querySelectorAll('p, span, a, button, label, li, h1, h2, h3, h4, td, th'));
    const findings: any[] = [];

    for (const node of nodes) {
      const style = getComputedStyle(node);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const text = (node.textContent || '').trim().replace(/\\s+/g, ' ');
      if (!text) continue;

      const fg = parse(style.color);
      const bg = solidBackground(node);
      if (!fg || !bg) continue;

      const sizePx = parseFloat(style.fontSize);
      const weight = parseInt(style.fontWeight, 10) || 400;
      const required = isLarge(sizePx, weight) ? 3 : 4.5;
      const r = ratio(fg, bg);

      findings.push({
        selectorHint: node.tagName.toLowerCase() + (node.id ? '#' + node.id : ''),
        textSample: text.slice(0, 80),
        fg: style.color,
        bg: \`rgb(\${Math.round(bg.r)}, \${Math.round(bg.g)}, \${Math.round(bg.b)})\`,
        ratio: Number(r.toFixed(2)),
        fontSizePx: sizePx,
        fontWeight: weight,
        required,
        pass: r + 1e-6 >= required,
      });
    }
    return findings;
  });
}

test('marketing hero body text meets AA contrast in light theme', async ({ page }) => {
  await page.goto('/pricing');
  await page.emulateMedia({ colorScheme: 'light' });
  const findings = await scanTextContrast(page, '[data-testid="pricing-hero"]');
  const failures = findings.filter((f) => !f.pass);
  expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
});
\`\`\`

Notice the scan ignores nodes that are not visible via CSS display or visibility. Off-screen SR-only helpers and zero-opacity placeholders need separate policies. Also note that background images still defeat pure \`background-color\` walks. For hero sections with photographic backdrops, sample pixels under the text bounding box with canvas or screenshot region analysis, or require a solid scrim behind text as a design rule and assert the scrim exists.

## Map thresholds to component states, not only default styles

A button that passes at rest can fail on hover, focus-visible, active, selected, or disabled presentation. Contrast automation that only loads the page and samples default CSS leaves the most common regression path untested: a designer tweaks hover tokens for brand alignment and ships a 2.8:1 hover label.

Build a state matrix for interactive components and drive each state with real user events or forced classes when the product supports data attributes for storybook-like previews.

| Component | States to sample | Text threshold | Non-text checks |
|---|---|---|---|
| Primary button | default, hover, focus-visible, disabled | 4.5:1 label | Focus ring 3:1 vs adjacent |
| Text field | empty, filled, error, disabled | 4.5:1 value and label | Border 3:1 when border is sole affordance |
| Tab list | selected, unselected, focus | 4.5:1 tab label | Selected indicator 3:1 |
| Toast | info, success, warning, error | 4.5:1 message | Icon 3:1 against toast surface |
| Link in body | default, hover, visited if styled | 4.5:1 | Underline or other non-color cue |

\`\`\`ts
import { test, expect } from '@playwright/test';

test('primary CTA keeps AA contrast across interaction states', async ({ page }) => {
  await page.goto('/signup');
  const cta = page.getByRole('button', { name: 'Create account' });

  const states: Array<{ name: string; setup: () => Promise<void> }> = [
    { name: 'default', setup: async () => {} },
    {
      name: 'hover',
      setup: async () => {
        await cta.hover();
      },
    },
    {
      name: 'focus-visible',
      setup: async () => {
        await page.keyboard.press('Tab');
        // Move focus until the CTA is focused if needed in real apps
        await cta.focus();
      },
    },
  ];

  for (const state of states) {
    await state.setup();
    const sample = await cta.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
        outlineColor: style.outlineColor,
        outlineWidth: style.outlineWidth,
      };
    });
    // Reuse pure contrast helpers after parsing colors in Node
    expect(sample.color, state.name).toBeTruthy();
    expect(sample.backgroundColor, state.name).not.toBe('rgba(0, 0, 0, 0)');
  }
});
\`\`\`

Disabled controls are a frequent source of disagreement. WCAG allows inactive components different treatment for non-text contrast in some readings, but product policy may still demand readable disabled labels. Encode the policy explicitly: either exclude disabled from the AA text gate or require a documented minimum such as 3:1 for disabled text in your design system.

## Catch false confidence from opacity, overlays, and background images

Teams often celebrate a green axe or Lighthouse contrast score on a sparse content page, then ship a modal that fails because the dimmed backdrop changes perceived contrast for text that still sits above the page. Overlays create two common failure modes.

First, content under a semi-transparent modal backdrop may remain focusable or visible in a washed-out form. If your product correctly inert-backgrounds the page, contrast checks should target the modal surface only. If inert is missing, contrast and focus order both fail and you should fix focus trapping first.

Second, sticky cookie banners and chat widgets cover text without changing the text's CSS colors. Ratio math still passes while users cannot read the covered words. Contrast automation is not a substitute for occlusion checks. Combine ratio sampling with intersection checks against known overlay selectors, or assert that focused and primary content rectangles are not fully covered.

Background images defeat ancestor \`background-color\` walks. Mitigations that work in practice:

1. Require design system heroes to place text on a solid or near-solid scrim and assert scrim opacity and color.
2. For critical marketing templates, capture a clipped screenshot of the text region and estimate background by sampling pixels around glyph edges.
3. Mark photographic regions as manual review in the accessibility test plan rather than pretending CSS color walks cover them.

\`\`\`ts
async function assertScrimBehindHeroText(page: Page) {
  const result = await page.locator('[data-hero]').evaluate((hero) => {
    const scrim = hero.querySelector('[data-hero-scrim]');
    if (!scrim) return { ok: false, reason: 'missing scrim' };
    const style = getComputedStyle(scrim);
    const bg = style.backgroundColor;
    const opacity = Number(style.opacity);
    return { ok: opacity >= 0.55 && bg !== 'rgba(0, 0, 0, 0)', bg, opacity };
  });
  expect(result.ok, JSON.stringify(result)).toBeTruthy();
}
\`\`\`

## Theme matrices: light, dark, high contrast, and forced colors

Modern products ship at least light and dark themes. Many also support Windows high contrast / forced colors. A contrast suite that only runs the default light theme will miss dark-mode token inversions where borders disappear into surfaces.

Drive themes through the same mechanisms users have: \`prefers-color-scheme\`, a theme toggle that sets a class or \`data-theme\` on \`html\`, or both. Document which source of truth wins when they conflict.

| Environment | How to activate in Playwright | What usually breaks |
|---|---|---|
| Light | \`emulateMedia({ colorScheme: 'light' })\` plus theme class if app overrides | Default brand buttons on pale surfaces |
| Dark | \`colorScheme: 'dark'\` and \`data-theme="dark"\` | Muted secondary text, dividers, chart axes |
| High contrast | OS-level forced colors where supported; app high-contrast stylesheet | Focus rings removed, borders set to transparent |
| Print | \`emulateMedia({ media: 'print' })\` | Gray body text intended for screens only |

\`\`\`ts
const themes = [
  { name: 'light', colorScheme: 'light' as const, attr: 'light' },
  { name: 'dark', colorScheme: 'dark' as const, attr: 'dark' },
];

for (const theme of themes) {
  test(\`checkout summary text passes AA in \${theme.name} theme\`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme.colorScheme });
    await page.addInitScript((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, theme.attr);
    await page.goto('/checkout');
    const findings = await scanTextContrast(page, '[data-testid="order-summary"]');
    expect(findings.filter((f) => !f.pass)).toEqual([]);
  });
}
\`\`\`

Ready-made QA skills install from qaskills.sh with the qaskills CLI when you want a starting harness for accessibility sampling rather than scaffolding pure functions from scratch. Keep the skill output as a template; product-specific theme attributes still need local wiring.

## CI gates that fail regressions without blocking intentional token work

Contrast CI should distinguish three outcomes: hard fail on product surfaces that violate policy, soft warn on experimental pages, and approved exceptions with expiry. Dumping thousands of token pair comparisons into a single job creates noise that teams mute forever.

Structure jobs like this:

1. Unit test the luminance and ratio library on every commit.
2. Run targeted Playwright contrast specs for critical journeys on every pull request.
3. Run a broader scan nightly and publish a JSON report artifact.
4. Require a human-reviewed exception file for known temporary violations.

\`\`\`yaml
# .github/workflows/a11y-contrast.yml
name: a11y-contrast
on:
  pull_request:
  schedule:
    - cron: '0 6 * * *'

jobs:
  contrast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:unit:contrast
      - run: npm run test:e2e:contrast
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: contrast-report
          path: artifacts/contrast/**/*
\`\`\`

Serialize findings with stable keys so diffs are reviewable: route, theme, component test id, state, and criterion. Unstable keys based on full text content create noisy diffs when marketing copy changes.

\`\`\`json
{
  "route": "/pricing",
  "theme": "dark",
  "target": "pricing-hero/subhead",
  "state": "default",
  "criterion": "1.4.3",
  "ratio": 3.12,
  "required": 4.5,
  "status": "fail"
}
\`\`\`

When design intentionally softens a marketing gradient, update the exception file in the same PR as the visual change, with owner and expiry. Exceptions without owners become permanent accessibility debt.

## Failure mode: flaky contrast failures from animation and late styles

A realistic failure mode looks like this: the PR contrast job fails with a 3.4:1 ratio on a heading, the engineer re-runs the job, and it passes. The root cause is often not math. It is timing. Fonts swap after first paint, CSS-in-JS injects theme variables after hydration, or a skeleton shimmer still sits under the text when the sample runs.

Diagnosis sequence:

1. Capture the finding payload including computed \`color\`, resolved background, font family, and timestamp relative to navigation.
2. Screenshot the target region at sample time.
3. Log whether \`document.fonts.status\` is loaded.
4. Check for ongoing CSS transitions on \`color\` or \`background-color\`.
5. Confirm the app finished hydrating theme class attributes.

Fixes that hold:

- Wait for fonts with \`document.fonts.ready\` before scanning.
- Wait for a deterministic ready flag such as \`data-app-ready="true"\` that the app sets after theme application.
- Disable animations in test via \`page.emulateMedia({ reducedMotion: 'reduce' })\` and a test-only CSS override that sets \`transition: none\` on sampled subtrees.
- Avoid sampling during route transition overlays.

\`\`\`ts
async function prepareForContrastSample(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: \`
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }
    \`,
  });
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.locator('[data-app-ready="true"]').waitFor({ state: 'attached' });
}
\`\`\`

If failures still flicker, freeze the clock only when the product uses time-based theme demo modes. Do not freeze time globally if it breaks auth token tests in the same project.

## What people get wrong when they only scan the default theme homepage

The most common organizational mistake is treating a single automated scan of the marketing homepage in light mode as proof that the product meets contrast requirements. That scan misses authenticated app shells, dense data tables, error states, empty states, chart tooltips, and dark mode. It also trains the team to trust a dashboard number instead of journey-based acceptance.

Another mistake is equating "axe reported zero contrast issues" with "users can read the UI." Automated rules engines are valuable tripwires. They do not always composite translucent layers the way your eyes do, and they may skip content outside the evaluated subset. Use engine rules as one signal inside a broader accessibility testing color contrast automation strategy that includes state matrices, theme matrices, and critical journey assertions with explicit thresholds.

A third mistake is hard-coding hex expectations in tests (\`expect(color).toBe('#ffffff')\`) instead of asserting ratios. Token refactors that preserve contrast then fail CI for cosmetic reasons, which trains teams to delete the tests. Assert the accessibility property (ratio and criterion), not the brand palette, unless you are snapshotting the design system package itself.

## Non-text contrast for focus rings, icons, and charts

Text ratio suites leave 1.4.11 gaps. Focus indicators must be visible against adjacent colors. Icon-only controls need identifiable icons at 3:1 against their background. Charts that encode meaning only by color need additional shape or label cues, while the colored series should still separate adequately from the plot background when color is part of the encoding.

For focus rings, force \`:focus-visible\` in the browser when possible, then sample outline or box-shadow colors against the surrounding surface. Box-shadow based focus styles are harder because multiple shadows may compose. Prefer design tokens that expose a single solid focus color and assert that color's ratio against known surface tokens at the design-system unit level, then smoke-test a few product pages for presence of a non-zero focus indicator.

\`\`\`ts
test('focus ring on email field meets non-text contrast intent', async ({ page }) => {
  await page.goto('/login');
  const email = page.getByLabel('Email');
  await email.focus();
  const styles = await email.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      outlineColor: s.outlineColor,
      outlineWidth: s.outlineWidth,
      boxShadow: s.boxShadow,
      backgroundColor: s.backgroundColor,
    };
  });
  const width = parseFloat(styles.outlineWidth);
  const hasOutline = width > 0 && styles.outlineColor !== 'rgba(0, 0, 0, 0)';
  const hasShadow = styles.boxShadow !== 'none';
  expect(hasOutline || hasShadow).toBeTruthy();
});
\`\`\`

For charts, assert legend text contrast and require pattern fills or direct labels for critical series when your accessibility policy demands non-color cues. Pure pixel comparison of chart series colors is brittle; prefer structured assertions against the charting library's resolved palette configuration.

## Organizing the repository for long-term contrast coverage

Keep pure color math in a framework-agnostic package. Keep browser scanners in the end-to-end suite. Keep design-system token pair tests next to the token source. This separation lets frontend engineers change button padding without rerunning full marketing site scans, while still protecting luminance math.

Suggested layout:

\`\`\`text
packages/a11y-contrast/          # pure functions + unit tests
e2e/contrast/journeys/           # Playwright journey assertions
e2e/contrast/scans/              # broad scanners + report writers
design-system/tokens/contrast/   # token pair AA/AAA tables
accessibility/exceptions.json    # time-boxed waivers
\`\`\`

Review exceptions weekly. A quarantine for contrast debt without expiry is how WCAG findings become permanent fixtures. Tie exception expiry to a tracking ticket and fail CI when the date passes.

When locators for journey-based contrast checks churn, fix the locator strategy using resilient roles and labels rather than disabling the test. Contrast assertions that target \`getByRole('button', { name: 'Pay now' })\` survive class name refactors that destroy \`.btn-primary-2\` selectors.

## Putting journey coverage ahead of raw page volume

Prioritize routes by user impact: authentication, checkout, account recovery, core data entry, and error recovery. A perfect score on thirty blog templates will not help if the password reset form fails AA in dark mode. Expand broad scans after journey gates are green.

For each journey, write a short contrast contract:

- Entry URL and auth role
- Themes required
- Components and states under test
- Thresholds (AA vs AAA for specific legal text)
- Known overlays and whether they should be dismissed first
- Exceptions file keys if any

That contract becomes the test description and the PR review checklist. Engineers stop arguing about whether a 4.4:1 failure "looks fine on my monitor" because the oracle is explicit.

## Frequently Asked Questions

### Should accessibility testing color contrast automation replace manual reviews?

No. Automation excels at regression detection for known surfaces, states, and themes, and it applies consistent math at scale. Manual review still catches meaning issues automation does not model well, such as whether a chart is understandable without color, whether a low-contrast decorative line is actually communicating structure, and whether a brand gradient behind text remains readable across real photography. Use automation as a gate and keep short keyboard-and-vision reviews for new templates and major visual redesigns.

### How do I choose between AA and AAA thresholds in CI?

Default product UI gates to WCAG AA: 4.5:1 for normal text, 3:1 for large text, and 3:1 for covered non-text components. Reserve AAA (7:1 normal text) for content your policy elevates, such as long-form legal text, medical dosage instructions, or government services that mandate enhanced contrast. Encoding AAA globally often creates unproductive conflict with brand systems and leads teams to disable the suite. Prefer selective AAA assertions over a blanket threshold.

### Why does my contrast test pass in Storybook but fail in the app shell?

Storybook stories frequently render components on idealized backgrounds without the application chrome, sidebar density, darkened main area, or portal-based overlays used in production. The component tokens may be fine while the composed surface behind them is different. Run at least one product-page smoke test per critical component in the real shell, and keep Storybook tests for token-level pairs and interaction states that do not depend on route-level layout.

### Can Lighthouse scores alone prove contrast compliance?

Lighthouse and similar audits are useful smoke signals, but they are not a full accessibility testing color contrast automation program. They may not exercise authenticated routes, every theme, hover and error states, or custom canvas rendering. Treat a Lighthouse contrast warning as a defect to investigate, and treat a clean score as "no easy findings on this URL snapshot," not as certification. Journey-based Playwright or equivalent sampling remains necessary for release confidence.
`,
};
