import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Accessibility Testing Automation -- axe-core, WCAG 2.2, and AI',
  description:
    'Complete guide to accessibility testing automation. Covers axe-core, Lighthouse, WCAG 2.2 compliance, keyboard testing, screen readers, and AI agent a11y automation.',
  date: '2026-02-22',
  category: 'Guide',
  content: `
Accessibility testing has shifted from a "nice-to-have" afterthought to a legal and business necessity. In 2026, with the European Accessibility Act (EAA) in full effect, WCAG 2.2 as the recognized standard, and ADA lawsuits hitting record numbers, every web application needs automated accessibility testing baked into its development workflow. This guide covers the complete accessibility testing automation stack -- from axe-core integration and Lighthouse audits to keyboard navigation testing, color contrast validation, and screen reader compatibility -- and shows you how AI coding agents can accelerate a11y compliance across your entire codebase.

Whether you are building a new application or retrofitting an existing one, the techniques in this guide will help you catch the majority of accessibility defects automatically, before they reach production and before they become legal liabilities.

## Key Takeaways

- **WCAG 2.2 is the standard in 2026** -- it introduces new success criteria for focus appearance, dragging alternatives, target size, consistent help, redundant entry, and accessible authentication
- **axe-core catches approximately 57% of WCAG issues automatically** -- integrating it with Playwright gives you programmatic, CI-friendly accessibility scanning on every commit
- **Lighthouse provides broader accessibility auditing** but with less specificity than axe-core -- use both tools together for maximum coverage
- **Keyboard navigation and focus management testing** are critical areas that automated scanners frequently miss -- you need dedicated test cases for tab order, focus traps, and skip links
- **Automated tools catch only 30-40% of all accessibility issues** -- the remaining 60-70% require manual testing with screen readers and assistive technology, but automation handles the repetitive baseline
- **AI coding agents equipped with accessibility skills** can generate axe-core tests, flag ARIA misuse, and enforce contrast ratios as part of their normal code review and test generation workflow

---

## Why Accessibility Testing Matters in 2026

Accessibility testing has never been more important, and the reasons extend far beyond compliance checklists. The convergence of legal requirements, business incentives, and technical standards has made accessibility a first-class engineering concern.

### The Legal Landscape

ADA-related web accessibility lawsuits in the United States have increased every year since 2017, with over 4,600 federal lawsuits filed in 2025 alone. The legal theory is straightforward: websites are places of public accommodation, and inaccessible websites violate Title III of the Americans with Disabilities Act. Courts have consistently sided with plaintiffs, and settlements routinely include both monetary damages and mandated remediation.

In Europe, the European Accessibility Act (EAA) took full effect in June 2025, requiring that digital products and services sold in the EU meet accessibility standards. Unlike the ADA, the EAA is explicit about technical requirements and directly references WCAG 2.1 Level AA as the minimum standard. Organizations selling into the EU market without compliant digital products face enforcement actions and fines.

Canada, Australia, and the UK have similar regulations. The global trend is clear: accessibility compliance is becoming as mandatory as data privacy compliance.

### The Business Case

Beyond legal risk, accessibility makes business sense. The World Health Organization estimates that 16% of the global population -- approximately 1.3 billion people -- experience significant disability. That is a massive user base excluded by inaccessible applications.

Accessible design also benefits users without disabilities. Captions help people in noisy environments. Keyboard navigation helps power users. Clear visual hierarchy helps everyone. The "curb cut effect" means that accessibility improvements improve the experience for all users.

There are SEO benefits too. Search engines cannot see images without alt text, cannot navigate forms without labels, and cannot parse content without semantic HTML. Accessible websites consistently rank higher in search results because the same structural elements that assistive technologies need are the same elements that search engine crawlers rely on.

### WCAG 2.2 Adoption Timeline

WCAG 2.2 was published as a W3C Recommendation in October 2023 and has become the de facto standard in 2026. While WCAG 2.1 Level AA remains the legal benchmark in many jurisdictions, forward-looking organizations are adopting WCAG 2.2 because it addresses real usability gaps -- particularly for users with cognitive and motor disabilities. WCAG 2.2 does not replace 2.1; it adds nine new success criteria while removing one (4.1.1 Parsing, which is obsolete in modern HTML).

---

## WCAG 2.2 Quick Reference

Understanding WCAG 2.2 is essential for effective accessibility testing. The guidelines are organized around four principles, three conformance levels, and a set of specific success criteria.

### The Four Principles (POUR)

Every WCAG success criterion falls under one of four principles:

- **Perceivable** -- Information and user interface components must be presentable to users in ways they can perceive. This includes text alternatives for images, captions for video, sufficient color contrast, and content that can be resized without loss of functionality.
- **Operable** -- User interface components and navigation must be operable. This includes keyboard accessibility, sufficient time limits, seizure prevention, navigable page structure, and input modality alternatives.
- **Understandable** -- Information and the operation of the user interface must be understandable. This includes readable content, predictable page behavior, and input assistance for error prevention and correction.
- **Robust** -- Content must be robust enough to be reliably interpreted by a wide variety of user agents, including assistive technologies. This includes valid markup, proper name/role/value for custom components, and status messages that assistive tech can announce.

### Conformance Levels

- **Level A** -- The minimum level of accessibility. Addresses the most critical barriers. Failure to meet Level A means some users cannot access your content at all.
- **Level AA** -- The standard target for most organizations and the level referenced by most accessibility laws. Addresses the most common barriers for the widest range of users.
- **Level AAA** -- The highest level. Not typically required for entire sites because some criteria are extremely difficult to meet for all content types, but individual criteria can be adopted selectively.

### New WCAG 2.2 Success Criteria

WCAG 2.2 introduced nine new success criteria that address gaps in the previous version:

| Success Criterion | Level | What It Requires |
|---|---|---|
| 2.4.11 Focus Not Obscured (Minimum) | AA | The focused element is not entirely hidden by author-created content |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | The focused element is fully visible, not even partially obscured |
| 2.4.13 Focus Appearance | AAA | Focus indicators meet minimum size and contrast requirements |
| 2.5.7 Dragging Movements | AA | Functionality that uses dragging has a single-pointer alternative |
| 2.5.8 Target Size (Minimum) | AA | Interactive targets are at least 24x24 CSS pixels, with exceptions |
| 3.2.6 Consistent Help | A | Help mechanisms appear in the same relative order across pages |
| 3.3.7 Redundant Entry | A | Information previously entered is auto-populated or available for selection |
| 3.3.8 Accessible Authentication (Minimum) | AA | Authentication does not require cognitive function tests unless alternatives exist |
| 3.3.9 Accessible Authentication (Enhanced) | AAA | No cognitive function tests for authentication, period |

### Common Accessibility Failures

These are the issues that automated tools catch most frequently:

| Issue | WCAG Criterion | Impact | Fix |
|---|---|---|---|
| Missing alt text on images | 1.1.1 Non-text Content | Screen readers cannot describe images | Add descriptive alt attributes; use alt="" for decorative images |
| Insufficient color contrast | 1.4.3 Contrast (Minimum) | Low-vision users cannot read text | Ensure 4.5:1 ratio for normal text, 3:1 for large text |
| Missing form labels | 1.3.1 Info and Relationships | Screen readers cannot identify form fields | Associate labels with inputs using for/id or wrapping |
| Empty links or buttons | 4.1.2 Name, Role, Value | Screen readers announce "link" or "button" with no context | Add visible text, aria-label, or aria-labelledby |
| Missing document language | 3.1.1 Language of Page | Screen readers use wrong pronunciation rules | Add lang attribute to the html element |
| Missing page title | 2.4.2 Page Titled | Users cannot identify the page purpose | Add a descriptive title element to every page |
| Keyboard trap | 2.1.2 No Keyboard Trap | Keyboard users get stuck in a component | Ensure focus can always be moved away using standard keys |
| Missing skip navigation | 2.4.1 Bypass Blocks | Keyboard users must tab through all navigation on every page | Add a skip-to-main-content link as the first focusable element |

---

## Automated Testing with axe-core

axe-core is the industry-standard accessibility testing engine, developed and maintained by Deque Systems. It is open source, runs in any browser environment, and forms the foundation of most accessibility testing tools including Lighthouse, axe DevTools, and accessibility linters. axe-core tests against WCAG 2.0, 2.1, and 2.2 success criteria and provides actionable, developer-friendly results with fix suggestions.

The key advantage of axe-core is its zero false positive guarantee -- Deque commits to ensuring that every issue reported by axe-core is a genuine accessibility violation. This makes it safe to use as a CI gate without worrying about spurious failures blocking deployments.

### Playwright + @axe-core/playwright Integration

The most powerful way to use axe-core is through Playwright integration. The \`@axe-core/playwright\` package provides a clean API for running accessibility scans within your Playwright test suite, giving you the same browser automation capabilities you use for E2E testing applied to accessibility.

\`\`\`bash
npm install --save-dev @axe-core/playwright
\`\`\`

### Full Page Accessibility Scan

\`\`\`typescript
// tests/accessibility/full-page.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility - Full Page Scans', () => {
  test('homepage has no accessibility violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });

  test('login page meets WCAG 2.2 AA', async ({ page }) => {
    await page.goto('/login');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
\`\`\`

### Scanning a Specific Region

When you need to test a specific component -- such as a modal dialog or a navigation menu -- you can scope the scan to a CSS selector:

\`\`\`typescript
test('navigation menu is accessible', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page })
    .include('nav[aria-label="Main navigation"]')
    .analyze();

  expect(results.violations).toEqual([]);
});

test('modal dialog meets accessibility standards', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Settings' }).click();

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();

  expect(results.violations).toEqual([]);
});
\`\`\`

### Custom Rule Configuration

You can enable or disable specific rules, exclude known issues that are being tracked for remediation, and configure rule strictness:

\`\`\`typescript
test('page scan with custom rules', async ({ page }) => {
  await page.goto('/legacy-page');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .disableRules(['color-contrast']) // Temporarily disabled during redesign
    .exclude('#third-party-widget')  // Cannot control third-party content
    .analyze();

  // Log violations for debugging
  if (results.violations.length > 0) {
    console.log('Accessibility violations found:');
    results.violations.forEach((violation) => {
      console.log(\`  Rule: \${violation.id}\`);
      console.log(\`  Impact: \${violation.impact}\`);
      console.log(\`  Description: \${violation.description}\`);
      console.log(\`  Help: \${violation.helpUrl}\`);
      violation.nodes.forEach((node) => {
        console.log(\`    Element: \${node.html}\`);
        console.log(\`    Fix: \${node.failureSummary}\`);
      });
    });
  }

  expect(results.violations).toEqual([]);
});
\`\`\`

### Parsing Test Output

axe-core results include detailed information for every violation. Each violation object contains the rule ID, impact level (critical, serious, moderate, minor), a description of the issue, a help URL linking to Deque's documentation, and an array of affected nodes with their HTML and suggested fixes. You can transform this output into custom reports, pipe it into issue trackers, or generate accessibility scorecards.

\`\`\`typescript
// helpers/a11y-reporter.ts
import type { Result } from 'axe-core';

export function formatViolations(violations: Result[]): string {
  if (violations.length === 0) return 'No accessibility violations found.';

  return violations
    .map((v) => {
      const nodes = v.nodes
        .map((n) => \`    - \${n.html}\\n      Fix: \${n.failureSummary}\`)
        .join('\\n');
      return \`[\${v.impact?.toUpperCase()}] \${v.id}: \${v.description}\\n\${nodes}\`;
    })
    .join('\\n\\n');
}
\`\`\`

---

## Lighthouse Accessibility Audits

Google Lighthouse includes an accessibility audit category that runs a subset of axe-core rules along with additional checks. While axe-core gives you deep, detailed accessibility analysis, Lighthouse provides a broader perspective with a single 0-100 score that is easy to track over time and use as a CI quality gate.

### Programmatic Lighthouse in CI

You can run Lighthouse programmatically using the \`lighthouse\` npm package, which is ideal for CI integration:

\`\`\`typescript
// scripts/lighthouse-a11y.ts
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function runAccessibilityAudit(url: string): Promise<number> {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

  const result = await lighthouse(url, {
    port: chrome.port,
    onlyCategories: ['accessibility'],
    output: 'json',
  });

  await chrome.kill();

  const score = result?.lhr?.categories?.accessibility?.score;
  if (score === null || score === undefined) {
    throw new Error('Failed to get accessibility score');
  }

  const percentScore = Math.round(score * 100);
  console.log(\`Accessibility score: \${percentScore}/100\`);

  // List individual audit results
  const audits = result?.lhr?.audits;
  if (audits) {
    Object.values(audits).forEach((audit: any) => {
      if (audit.score !== null && audit.score < 1) {
        console.log(\`  FAIL: \${audit.title} (score: \${audit.score})\`);
      }
    });
  }

  return percentScore;
}

// Fail the build if score is below threshold
const THRESHOLD = 90;
const score = await runAccessibilityAudit('http://localhost:3000');
if (score < THRESHOLD) {
  console.error(\`Accessibility score \${score} is below threshold of \${THRESHOLD}\`);
  process.exit(1);
}
\`\`\`

### axe-core vs Lighthouse for Accessibility

Both tools use axe-core under the hood, but they serve different purposes:

| Aspect | axe-core | Lighthouse |
|---|---|---|
| **Scope** | Accessibility only | Performance, SEO, a11y, best practices |
| **Detail** | Deep -- every violation with affected nodes and fixes | Broad -- pass/fail per audit, single score |
| **False positives** | Zero false positive policy | Slightly higher false positive rate |
| **Customization** | Full rule configuration, include/exclude regions | Limited -- on/off per audit |
| **CI integration** | Direct Playwright/Puppeteer integration | Requires Chrome launcher setup |
| **Best for** | Detailed a11y testing in test suites | Quick health checks and trend tracking |

The recommended approach is to use axe-core in your Playwright test suite for detailed, per-page accessibility testing, and Lighthouse in your CI pipeline as a high-level quality gate. If Lighthouse catches a regression, your axe-core tests will tell you exactly what broke and where.

---

## Keyboard Navigation Testing

Keyboard accessibility is one of the most critical aspects of web accessibility, and one of the most frequently overlooked. Approximately 8% of users rely on keyboards or keyboard-like devices as their primary input method. This includes people with motor disabilities, power users who prefer keyboard navigation, and users of assistive technologies like switch devices.

Automated scanners like axe-core can detect some keyboard issues (missing tabindex, keyboard traps in certain patterns), but thorough keyboard testing requires dedicated test cases that simulate real keyboard interaction.

### Tab Order Testing

Tab order should follow a logical, predictable sequence that matches the visual layout of the page. Testing tab order programmatically with Playwright:

\`\`\`typescript
test('tab order follows visual layout', async ({ page }) => {
  await page.goto('/contact');

  // Define expected tab order by accessible name or role
  const expectedOrder = [
    'Skip to main content',
    'Home',
    'About',
    'Contact',
    'First name',
    'Last name',
    'Email address',
    'Message',
    'Send message',
  ];

  const actualOrder: string[] = [];

  for (let i = 0; i < expectedOrder.length; i++) {
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    const name =
      (await focused.getAttribute('aria-label')) ||
      (await focused.innerText().catch(() => '')) ||
      (await focused.getAttribute('placeholder')) ||
      '';
    actualOrder.push(name.trim());
  }

  expect(actualOrder).toEqual(expectedOrder);
});
\`\`\`

### Focus Trap Detection

Modal dialogs and dropdown menus must trap focus within themselves when open, and release focus when closed. A focus trap that cannot be escaped is a WCAG 2.1.2 violation.

\`\`\`typescript
test('modal traps focus and releases on close', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Open settings' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Tab through all focusable elements in the dialog
  const focusableCount = await dialog
    .locator('button, input, select, textarea, a[href], [tabindex="0"]')
    .count();

  for (let i = 0; i < focusableCount + 2; i++) {
    await page.keyboard.press('Tab');

    // Verify focus stays within the dialog
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.contains(el) ?? false;
    });
    expect(focusedElement).toBe(true);
  }

  // Close with Escape
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // Focus should return to the trigger button
  const triggerFocused = await page
    .getByRole('button', { name: 'Open settings' })
    .evaluate((el) => el === document.activeElement);
  expect(triggerFocused).toBe(true);
});
\`\`\`

### Skip Link Verification

Skip links allow keyboard users to bypass repetitive navigation and jump directly to the main content. They should be the first focusable element on the page and become visible on focus:

\`\`\`typescript
test('skip link works correctly', async ({ page }) => {
  await page.goto('/');

  // First Tab should focus the skip link
  await page.keyboard.press('Tab');
  const skipLink = page.getByText('Skip to main content');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  // Activating skip link moves focus to main content
  await page.keyboard.press('Enter');
  const main = page.locator('main, [id="main-content"]').first();
  await expect(main).toBeFocused();
});
\`\`\`

### Focus Visible State Testing

WCAG 2.4.7 requires that keyboard focus is always visible. WCAG 2.4.13 (Level AAA) goes further, requiring focus indicators to meet minimum size and contrast requirements. You can test focus visibility programmatically:

\`\`\`typescript
test('all interactive elements have visible focus indicators', async ({ page }) => {
  await page.goto('/');

  const interactiveElements = page.locator(
    'a[href], button, input, select, textarea, [tabindex="0"]'
  );
  const count = await interactiveElements.count();

  for (let i = 0; i < count; i++) {
    const element = interactiveElements.nth(i);
    await element.focus();

    // Check that focus indicator is visible via outline or box-shadow
    const styles = await element.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        outlineWidth: computed.outlineWidth,
        boxShadow: computed.boxShadow,
      };
    });

    const hasVisibleFocus =
      (styles.outlineWidth !== '0px' && styles.outline !== 'none') ||
      styles.boxShadow !== 'none';

    expect(hasVisibleFocus, \`Element \${i} missing focus indicator\`).toBe(true);
  }
});
\`\`\`

---

## Color Contrast and Visual Testing

Color contrast is one of the most common accessibility failures. WCAG defines specific contrast ratios that ensure text and UI components are readable by users with low vision, color blindness, and other visual impairments.

### WCAG Contrast Requirements

- **Normal text** (under 18pt or under 14pt bold): Minimum 4.5:1 contrast ratio against background (Level AA)
- **Large text** (18pt+ or 14pt+ bold): Minimum 3:1 contrast ratio (Level AA)
- **Enhanced contrast**: 7:1 for normal text, 4.5:1 for large text (Level AAA)
- **Non-text contrast** (UI components and graphical objects): Minimum 3:1 contrast ratio (Level AA, criterion 1.4.11)
- **Focus indicators**: WCAG 2.4.13 requires focus indicators to have a minimum contrast ratio of 3:1 against adjacent colors and a minimum area of 2 CSS pixels

### Programmatic Contrast Checking

While axe-core handles most contrast violations, you can write targeted contrast tests for critical UI elements:

\`\`\`typescript
test('primary button text has sufficient contrast', async ({ page }) => {
  await page.goto('/');

  const button = page.getByRole('button', { name: 'Get started' });
  const colors = await button.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
    };
  });

  // Parse RGB values and calculate relative luminance
  const textLuminance = getRelativeLuminance(parseRgb(colors.color));
  const bgLuminance = getRelativeLuminance(parseRgb(colors.backgroundColor));

  const contrastRatio =
    (Math.max(textLuminance, bgLuminance) + 0.05) /
    (Math.min(textLuminance, bgLuminance) + 0.05);

  expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
});
\`\`\`

### Dark Mode Testing

Applications that support dark mode need contrast testing in both modes. A color combination that passes in light mode may fail in dark mode and vice versa. Run your axe-core scans in both color schemes:

\`\`\`typescript
for (const colorScheme of ['light', 'dark'] as const) {
  test(\`homepage passes a11y in \${colorScheme} mode\`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
\`\`\`

### Non-Text Contrast

WCAG 1.4.11 (Level AA) requires that user interface components and graphical objects have a contrast ratio of at least 3:1 against adjacent colors. This applies to form field borders, custom checkboxes, radio buttons, toggle switches, icons that convey meaning, chart elements, and focus indicators. Automated tools like axe-core check some of these, but custom component contrast often requires manual verification or targeted visual regression tests.

---

## Screen Reader Testing

Automated tools catch approximately 30-40% of accessibility issues. The remaining 60-70% involve problems that require understanding context, reading order, and user experience -- things that only screen reader testing can reveal. While you cannot fully automate screen reader testing, you can automate the prerequisites that make screen reader experiences work correctly.

### ARIA Roles, Properties, and States

ARIA (Accessible Rich Internet Applications) provides attributes that communicate the purpose and state of custom UI components to assistive technologies. Proper ARIA usage is essential for screen reader compatibility.

**Key roles for custom components:**

- \`role="dialog"\` for modals -- pair with \`aria-modal="true"\` and \`aria-labelledby\`
- \`role="tablist"\`, \`role="tab"\`, \`role="tabpanel"\` for tab interfaces
- \`role="alert"\` for important messages that need immediate announcement
- \`role="status"\` for live updates like "3 results found"
- \`role="navigation"\` for nav sections (or use \`<nav>\` element)

### Landmark Regions

Screen reader users navigate by landmarks. Every page should have these landmark regions defined by HTML5 elements or ARIA roles:

- \`<header>\` or \`role="banner"\` -- Site header (once per page)
- \`<nav>\` or \`role="navigation"\` -- Navigation sections (can have multiple, label each)
- \`<main>\` or \`role="main"\` -- Primary content area (once per page)
- \`<footer>\` or \`role="contentinfo"\` -- Site footer (once per page)
- \`<aside>\` or \`role="complementary"\` -- Sidebar or supplementary content
- \`<form>\` or \`role="form"\` -- Significant forms (label each)

\`\`\`typescript
test('page has required landmark regions', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('header, [role="banner"]').first()).toBeAttached();
  await expect(page.locator('nav, [role="navigation"]').first()).toBeAttached();
  await expect(page.locator('main, [role="main"]').first()).toBeAttached();
  await expect(page.locator('footer, [role="contentinfo"]').first()).toBeAttached();
});
\`\`\`

### Common ARIA Mistakes

These are the ARIA patterns that cause the most screen reader issues:

- **Using aria-label when aria-labelledby would be better.** \`aria-label\` creates a text label that is only available to assistive tech. \`aria-labelledby\` references visible text, keeping the visual and accessible labels in sync. When visible text exists, always prefer \`aria-labelledby\`.
- **Adding redundant roles.** Native HTML elements already have implicit roles. A \`<button>\` does not need \`role="button"\`. A \`<nav>\` does not need \`role="navigation"\`. Adding redundant roles creates noise and can cause some screen readers to announce the role twice.
- **Missing live regions.** Dynamic content that updates without a page reload -- search results, form validation messages, chat messages -- must use \`aria-live\` to announce changes. Without it, screen reader users have no way to know that content has changed.
- **Incorrect use of aria-hidden.** Setting \`aria-hidden="true"\` on a parent element hides all children from assistive tech, including focusable elements. If a hidden element receives focus, screen reader users are placed in a confusing state where they can interact with something that is supposed to be invisible.

### Screen Reader Testing Checklist

While these cannot all be automated, reviewing this checklist ensures your manual testing covers the critical paths:

1. Can the page purpose be understood from the page title alone?
2. Are headings structured hierarchically (h1, h2, h3) without skipping levels?
3. Are images described with meaningful alt text (or alt="" for decorative images)?
4. Are form fields properly labeled and error messages associated with their fields?
5. Are dynamic updates (notifications, live data) announced via aria-live regions?
6. Can all functionality be completed without a mouse?
7. Is the reading order logical when CSS is disabled?
8. Are custom widgets (tabs, accordions, dialogs) navigable with expected keyboard patterns?

---

## CI/CD Integration

Accessibility testing belongs in your CI/CD pipeline alongside unit tests, integration tests, and E2E tests. By running axe-core scans on every pull request, you prevent accessibility regressions from reaching production.

### GitHub Actions Workflow

\`\`\`yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  a11y-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Build application
        run: pnpm build

      - name: Start application
        run: pnpm start &
        env:
          NODE_ENV: production

      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 30000

      - name: Run accessibility tests
        run: pnpm exec playwright test tests/accessibility/ --reporter=html

      - name: Upload accessibility report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: accessibility-report
          path: playwright-report/
          retention-days: 14
\`\`\`

### Failure Thresholds and PR Review Gates

Configure your accessibility tests to fail the build when violations are found. Use branch protection rules to require the accessibility check to pass before merging:

\`\`\`typescript
// playwright.config.ts (accessibility project)
export default defineConfig({
  projects: [
    {
      name: 'accessibility',
      testDir: './tests/accessibility',
      use: {
        baseURL: 'http://localhost:3000',
        // Test in a single browser -- a11y issues are browser-independent
        ...devices['Desktop Chrome'],
      },
    },
  ],
  // Fail fast on first violation
  reporter: [['html', { open: 'never' }], ['list']],
});
\`\`\`

For a more comprehensive CI/CD setup including unit tests, integration tests, and E2E alongside accessibility, see our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions).

---

## Building an Accessibility Testing Strategy

Effective accessibility testing follows a layered strategy, similar to the traditional testing pyramid. Each layer catches different types of issues, and no single layer is sufficient on its own.

### The Accessibility Testing Pyramid

**Layer 1 -- Automated Scanning (Base)**
axe-core and Lighthouse scans on every page. Catches structural issues: missing alt text, insufficient contrast, missing labels, improper ARIA usage, missing landmarks. This layer runs in CI on every commit and catches approximately 30-40% of all accessibility issues. It is fast, reliable, and free.

**Layer 2 -- Component-Level Testing**
Dedicated accessibility tests for individual components: modals, dropdowns, tabs, forms, accordions. Tests keyboard interaction patterns, focus management, and ARIA states. This layer runs in CI as part of your Playwright test suite.

**Layer 3 -- Integration Testing**
End-to-end accessibility testing across user flows: registration, checkout, settings management. Tests that keyboard navigation works across page transitions, that focus is managed correctly during client-side routing, and that dynamic content updates are announced. This layer runs in CI but is more expensive and typically covers critical paths only.

**Layer 4 -- Manual Testing with Assistive Technology (Top)**
Real screen reader testing (NVDA on Windows, VoiceOver on macOS, TalkBack on Android), switch device testing, voice control testing. This catches the 60-70% of issues that automated tools miss: confusing reading order, unhelpful link text in context, missing audio descriptions, cognitive complexity. This layer is performed during sprint reviews, before major releases, and during dedicated accessibility audits.

### Prioritization

Not all accessibility issues are equally urgent. Use axe-core's impact levels to prioritize remediation:

1. **Critical** -- Users with disabilities are completely blocked from accessing content or functionality. Fix immediately.
2. **Serious** -- Significant difficulty for users with disabilities. Fix in the current sprint.
3. **Moderate** -- Some difficulty, but workarounds exist. Schedule for upcoming sprints.
4. **Minor** -- Inconvenience rather than barrier. Address during refactoring or as part of regular development.

### Shift-Left Accessibility

The cheapest accessibility fix is the one that never becomes a bug. Integrate accessibility into your development process from the start:

- **Design system components** should be built accessible by default. If your button component handles focus, contrast, and ARIA correctly, every button in the application inherits those properties.
- **Code reviews** should include accessibility checks. Does this PR introduce any interactive elements without keyboard support? Are new images missing alt text? Are custom components using ARIA correctly?
- **Developer training** ensures that the team understands why accessibility matters and how to implement it. A one-hour workshop on keyboard navigation and screen reader basics pays dividends across every subsequent sprint.

For a deeper dive into shift-left strategies, see our [shift-left testing guide](/blog/shift-left-testing-ai-agents).

---

## Automate Accessibility Testing with AI Agents

AI coding agents can dramatically accelerate accessibility testing when equipped with the right QA skills. Instead of manually writing axe-core integration tests, configuring Lighthouse audits, and building keyboard navigation test suites from scratch, you can install accessibility-focused skills that teach your agent how to generate these tests automatically.

### Install Accessibility Skills

\`\`\`bash
npx @qaskills/cli add axe-accessibility
\`\`\`

The \`axe-accessibility\` skill teaches your AI agent to integrate axe-core into Playwright tests, configure custom rule sets, handle known issues with exclusions, and generate comprehensive page-level and component-level accessibility scans.

\`\`\`bash
npx @qaskills/cli add accessibility-auditor
\`\`\`

The \`accessibility-auditor\` skill provides broader accessibility audit capabilities including WCAG compliance checking, Lighthouse integration, and accessibility report generation.

### Additional Recommended Skills

- **accessibility-a11y-enhanced** -- Advanced accessibility testing patterns including ARIA validation, live region testing, and cognitive accessibility checks
- **playwright-e2e** -- General Playwright expertise that complements accessibility skills with proper page object patterns, fixture setup, and CI integration. See our [Playwright guide](/blog/playwright-e2e-complete-guide) for details
- **audit-website** -- Comprehensive website auditing that includes accessibility as one of multiple quality dimensions

### Browse and Install

Explore the full collection of accessibility testing skills at [qaskills.sh/skills](/skills), or browse the [accessibility testing category](/categories/accessibility-testing) for specialized skills. If you are new to QASkills, our [getting started guide](/getting-started) walks you through installation and agent configuration in under five minutes.

Once installed, your AI agent can generate complete accessibility test suites when you prompt it with requests like "write accessibility tests for the checkout flow" or "add axe-core scanning to our existing Playwright tests." The agent knows the correct patterns because the skill has embedded that expert knowledge directly into its context.

---

## Frequently Asked Questions

### What percentage of accessibility issues can automated testing catch?

Automated tools like axe-core and Lighthouse catch approximately 30-40% of all WCAG accessibility issues. These tend to be the structural, programmatically detectable issues: missing alt text, insufficient contrast, missing form labels, improper ARIA attributes, and missing landmark regions. The remaining 60-70% require manual testing -- particularly for cognitive accessibility, reading order, meaningful link text in context, and the overall user experience with assistive technologies. Despite this limitation, automated testing is essential because it catches the most common issues, runs on every commit, and prevents regressions. Think of automated testing as your baseline -- it ensures you never ship the easy-to-catch violations, freeing your manual testing time for the harder issues.

### What WCAG conformance level should we target?

Most organizations should target **WCAG 2.2 Level AA**. This is the level referenced by the ADA, the European Accessibility Act, and most accessibility legislation worldwide. Level AA covers the most impactful success criteria without imposing requirements that are prohibitively difficult for all content types. That said, individual Level AAA criteria are worth adopting selectively -- particularly 2.4.13 Focus Appearance (which improves keyboard usability) and 3.3.9 Accessible Authentication Enhanced (which removes cognitive barriers to login). Level A alone is insufficient for most applications; it addresses only the most severe barriers and leaves many common issues unaddressed.

### What is the cost of not testing for accessibility?

The costs break down into three categories. **Legal costs**: ADA web accessibility lawsuits average \$25,000-\$75,000 in settlement costs for small to mid-size companies, with larger enterprises facing six-figure or seven-figure settlements. The EAA introduces fines that vary by EU member state but can be substantial. **Lost revenue**: With 16% of the global population experiencing disability, inaccessible applications exclude a significant portion of potential users. Companies that remediate accessibility issues typically see 10-15% increases in overall engagement metrics because the improvements benefit all users. **Remediation costs**: Fixing accessibility issues after launch is 5-10 times more expensive than building accessibly from the start. A retroactive accessibility audit and remediation for a medium-sized web application typically costs \$50,000-\$150,000.

### Which accessibility testing tools should we use?

Use a combination of tools for maximum coverage. **axe-core** (via @axe-core/playwright) for detailed, per-page accessibility testing in your test suite -- this is your primary automated tool. **Lighthouse** for high-level accessibility scoring and trend tracking in CI. **eslint-plugin-jsx-a11y** for catching accessibility issues at the linting stage (shift-left). **WAVE** (browser extension) for quick visual accessibility checks during development. **NVDA** (Windows) or **VoiceOver** (macOS) for manual screen reader testing. **Colour Contrast Analyser** (desktop app) for checking specific color combinations. Start with axe-core in your Playwright tests -- that gives you the highest return on investment.

### How do we get started with accessibility testing?

Start with three concrete steps. **First**, add axe-core scanning to your existing Playwright tests. Install \`@axe-core/playwright\`, write a single test that scans your homepage, and run it. This will give you a baseline of current violations. **Second**, fix the critical and serious issues first -- these are the ones that actually prevent users from accessing your application. Focus on missing alt text, missing form labels, keyboard traps, and insufficient contrast. **Third**, add accessibility tests to your CI pipeline so that new violations are caught before they reach production. From there, expand your test coverage page by page, add keyboard navigation tests for custom components, and schedule periodic manual testing with screen readers. Installing accessibility skills for your AI agent (\`npx @qaskills/cli add axe-accessibility\`) accelerates this process by generating the tests for you.
`,
};
