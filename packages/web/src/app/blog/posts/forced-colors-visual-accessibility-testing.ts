import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'forced colors visual accessibility testing',
  description:
    'forced colors visual accessibility testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Accessibility Testing',
  primaryKeyword: 'forced colors visual accessibility testing',
  keywords: [
    'forced colors visual accessibility testing',
    'forced colors accessibility test',
    'Windows high contrast QA',
    'forced-color-adjust regression',
    'focus indicator forced colors',
    'icon visibility high contrast',
  ],
  relatedSlugs: [
    'accessibility-testing-automation-guide',
    'mobile-accessibility-testing-guide',
    'axe-core-playwright-accessibility-testing-2026',
    'wcag-2-2-testing-checklist-qa-engineers',
  ],
  sources: [
    'https://www.w3.org/TR/accname-1.2/',
    'https://www.w3.org/TR/mediaqueries-5/',
    'https://www.w3.org/WAI/WCAG21/Techniques/general/G1',
  ],
  repoEvidence: [
    'seed-skills/accessibility-a11y-enhanced/SKILL.md',
    'seed-skills/wcag-accessibility-testing/SKILL.md',
  ],
  content: `forced colors visual accessibility testing checks whether each control still makes sense when the browser swaps the site's colors. QA moves through a small page by key, checks names and states, saves images, and then repeats the path on Windows. The first lost mark should fail the test.

## What does forced colors visual accessibility testing verify?

The contract is not a screenshot that merely looks different. It is a set of states that users can still find, name, compare, and operate after the browser applies a limited palette. Each control needs a visible boundary, each active item needs a non-color cue, and each keyboard stop needs a clear focus mark.

- A link must remain identifiable against nearby text, while a button must retain a visible shape or another dependable affordance. The test should compare normal and forced modes without requiring the same pixels.

- A custom checkbox needs distinct checked, unchecked, focused, and disabled states. Text, native semantics, a mark, or a border may carry that difference, but authored background color alone is weak evidence.

- A selected tab needs both a programmatic selected state and a visible change. The visual change can use a system color, border, text decoration, shape, or other cue that survives the active palette.

- An icon-only control needs an accessible name even when its painted icon disappears. The [Accessible Name and Description Computation](https://www.w3.org/TR/accname-1.2/) explains how user agents derive names from author markup, host-language labels, and content.

- The [Media Queries Level 5 forced-colors definition](https://www.w3.org/TR/mediaqueries-5/) says an active user agent enforces a user-chosen limited palette. It also warns that forced colors does not always mean a request for higher contrast.

- seed-skills/accessibility-a11y-enhanced/SKILL.md supplies Playwright media emulation, keyboard checks, computed focus styles, screenshots on failure, and manual testing guidance. Those are repository facts; the state matrix in this article is a recommended regression design.

- seed-skills/wcag-accessibility-testing/SKILL.md asks teams to keep checks focused, independent, documented, and connected to CI. It also requires cleanup and actionable output rather than a pass-only scan.

- The broader [accessibility automation guide](/blog/accessibility-testing-automation-guide) covers an end-to-end accessibility program. This page owns forced palette rendering, visible component states, and evidence that identifies which state first became ambiguous.

## How do you build a forced colors accessibility test?

Build one small component gallery instead of starting with an entire product page. Include a text link, native button, icon button, custom checkbox, tab pair, disabled control, skip link, status icon, and one deliberately faulty variant. Give every item a stable test ID and a short state label.

The fixture must control font load, viewport, animation, data, focus order, and initial selection. It should load without remote calls, random values, rotating banners, or dates. A fixed gallery lets the same screenshot and keyboard path run locally and in CI.

- Start with native controls because they reveal whether the test environment actually activated forced colors. Then add custom controls one at a time. A positive baseline should prove the media query matches, the expected control receives focus, and every control exposes its intended accessible name.

- The repository's enhanced accessibility skill already checks keyboard focus and reads computed outlines. This adaptation adds the forced-colors state, records state-specific evidence, and avoids claiming that one computed color proves perception.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('keeps gallery states visible in forced colors', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/fixtures/forced-colors');

  const mediaActive = await page.evaluate(() =>
    matchMedia('(forced-colors: active)').matches,
  );
  expect(mediaActive).toBe(true);

  const controls = [
    ['save', 'Save changes'],
    ['close', 'Close dialog'],
    ['updates', 'Product updates'],
    ['billing-tab', 'Billing'],
  ] as const;

  for (const [testId, name] of controls) {
    const control = page.getByTestId(testId);
    await expect(control).toBeVisible();
    await expect(control).toHaveAccessibleName(name);
    await control.focus();
    await expect(control).toBeFocused();
    await expect(control).toHaveScreenshot(\`\${testId}-focused-forced.png\`);
  }

  await expect(page).toHaveScreenshot('forced-colors-gallery.png', {
    animations: 'disabled',
  });
});
\`\`\`

- This example is based on the media, screenshot, keyboard, and naming patterns in seed-skills/accessibility-a11y-enhanced/SKILL.md. It does not set exact foreground values because system colors differ by palette and platform. The snapshots establish reviewed visual outcomes for the controlled runner.

Run a normal-color control before the forced case. If both snapshots are identical and the media query is false, the environment is wrong rather than the application. If the query is true and only one component loses its edge, the component is the likely owner.

- Add a manual Windows record beside automation. Save the Windows version, browser version, selected contrast theme, zoom, and observed failures. The [mobile accessibility guide](/blog/mobile-accessibility-testing-guide) can cover separate device concerns without expanding this desktop fixture.

## What breaks Windows high contrast QA?

Windows high contrast QA fails when the test treats forced colors as a simple dark theme. A user may choose light, dark, higher-contrast, lower-contrast, or personally selected colors. Assertions tied to black backgrounds and white text will reject valid palettes while missing controls that lost their state.

Background-image icons are a common risk because forced palette processing can make their painted detail unavailable. Keep the accessible name independent from paint, and use a current-color SVG or text fallback where the design allows it. Test disappearance as a visible defect, not as proof that the control has no name.

Transparent borders also cause hidden failures. Teams sometimes reserve space with a transparent border, then rely on a background change for focus or selection. When authored backgrounds are replaced, the reserved edge may not become a useful boundary.

Color-only selection is another weak contract. A selected tab that changes only from blue to green may collapse into the same system colors as its neighbor. Assert selected semantics, then inspect a surviving mark such as a border, underline, weight, shape, or explicit text.

- Do not confuse forced palette failures with focus-order failures. First record the active element and expected test ID, then capture its rendered state. A wrong active element belongs to keyboard navigation; a correct active element with no visible focus belongs to visual styling.

- The repository warns against invisible focus indicators and information conveyed only by color. It also says automated checks do not replace manual review. Those points support a layered oracle, not a universal promise about every Windows build.

- Use the [WCAG testing checklist](/blog/wcag-2-2-testing-checklist-qa-engineers) for adjacent requirements. Keep the present regression narrow enough that a failure names one component, state, palette, browser, and evidence file.

## forced-color-adjust regression fixtures and controls

- A forced-color-adjust regression suite needs positive, negative, boundary, repeated-run, and cleanup controls. Each control changes one cause while preserving component markup, browser build, viewport, data, and traversal order. This isolation prevents a stale snapshot or theme change from looking like a CSS defect.

- The positive control uses native controls and system-friendly styles. It must match the media query, accept keyboard focus, expose names, and retain reviewed boundaries in both normal and forced modes.

- The negative control applies a test-only class that removes a visible outline or opts a decorative area out of adjustment. The suite must reject that variant, proving the oracle can see a known loss.

- The boundary control focuses adjacent controls with similar labels and shapes. Their current, selected, disabled, and unselected states must remain distinguishable without assuming exact colors.

- The repeat control runs the gallery twice in a fresh context. Screenshot names, control order, state records, and mismatch locations should remain stable across both runs.

- The cleanup control closes each page and context, removes generated evidence outside the retained failure folder, and restores no global OS preference. A shared manual machine must return to its prior contrast theme.

- Record a compact manifest for each case. Useful fields include fixture commit, test ID, semantic state, media-query result, focus owner, browser build, OS build, palette name, screenshot path, and reviewer outcome. Exclude personal desktop content and unrelated browser data.

- The [axe-core Playwright guide](/blog/axe-core-playwright-accessibility-testing-2026) can add automated rule scans. It cannot replace the visual state comparison because an element may have valid semantics while its selected mark or icon is not perceivable.

Fault injection should fail for a precise reason. If the negative focus variant passes, report that the expected focused boundary was absent at one test ID. Do not report a broad accessibility failure that forces a reviewer to repeat the whole run.

## How should focus indicator forced colors be asserted?

- Focus indicator forced colors checks need several oracles because no single CSS value proves visibility. Assert the state transition first, inspect available computed features second, compare a reviewed screenshot third, and complete keyboard review on Windows for the release-critical path.

- Exact equality works for deterministic facts such as active test ID, accessible name, selected attribute, disabled state, and media-query result. It is also suitable for a reviewed screenshot on a pinned browser and OS image. It is not suitable for a system color shared across many user palettes.

- A partial-order assertion works when the test only requires one boundary method to survive. For example, require a nonzero outline width, visible border width, text decoration, or another approved mark. The team should review the allowed set so a transparent but nonzero border cannot pass alone.

- A state-transition assertion compares the same component before and after Tab, Space, ArrowRight, or selection. It asks whether focus or selection introduced an observable cue while preserving the prior component identity. Save both states when the comparison fails.

- Bounded timing should cover page readiness, font settlement, and focus changes, not visual perception. Wait for explicit fixture readiness and animation completion rather than sleeping for an arbitrary interval. A timeout means the fixture did not reach its testable state.

- Compatibility assertions should name the tested browser and platform. Browser emulation is a deterministic CI layer, while a real Windows run checks the actual user setting. A pass on one Chromium build does not claim support for every engine or Windows release.

The [W3C skip-link technique](https://www.w3.org/WAI/WCAG21/Techniques/general/G1) describes a link at the page start that moves focus to main content. Include that path in the gallery so the focused skip link and destination remain visible under the forced palette.

Review wider focus behavior in the [accessibility automation guide](/blog/accessibility-testing-automation-guide). The forced palette gate should report the first lost cue, its prior and next state, and the evidence used for the decision.

## icon visibility high contrast in CI

Icon visibility high contrast checks should run on a pinned browser image with a fixed fixture. CI should save the media state, browser and OS metadata, component state map, focused screenshots, full gallery screenshot, and a short failure record. Keep the report small enough for direct review.

Use separate gates for semantics and appearance. The semantic gate checks role, name, selected state, disabled state, and keyboard target. The appearance gate compares reviewed visual evidence and component-specific cues. Both gates must pass for an icon-only control.

- Do not update snapshots automatically in the release job. A styling change should create a reviewable diff that includes normal and forced modes. The reviewer must decide whether each changed state remains perceivable before accepting new baselines.

Run the positive fixture before any injected defect. A broken browser image, missing font, or false media query should stop the run as an environment failure. Negative cases are meaningful only after the base gallery proves the test setup.

- For manual evidence, use a dedicated account and a clean desktop. Capture only the application window, selected theme name, browser version, and result notes. Remove temporary profiles and restore the prior theme after the run.

- The generic workflow in seed-skills/wcag-accessibility-testing/SKILL.md recommends CI reports, failure notifications, independent tests, and cleanup. The enhanced skill adds screenshots and Playwright keyboard checks. Together they support this gate without claiming that automation measures every visual experience.

Use the [accessibility skills category](/categories/accessibility-testing) to find related checks. Keep this job focused on controls and states so a failed icon does not get buried under unrelated page findings.

## forced colors visual accessibility testing comparison matrix

- The matrix changes one state at a time and requires both semantic and visual evidence. Its expected observation describes a contract, not an exact palette. The repository paths identify local testing patterns, while approved W3C sources define names, skip-link focus, and forced-color media behavior.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Normal colors versus forced colors | Same gallery, viewport, data, and browser | Media state changes while all named controls and cues remain usable | A boundary, state, or icon disappears only in forced mode | seed-skills/accessibility-a11y-enhanced/SKILL.md |
| Keyboard focus on every control | Fixed Tab order and one focused item per capture | Active element and visible focus evidence agree | Correct element receives focus but has no reviewed cue | seed-skills/wcag-accessibility-testing/SKILL.md |
| Selected and unselected custom controls | Same tab and checkbox before and after selection | Semantics and a non-color visual state both change | Selected semantics exist but both states look alike | [Accessible name computation](https://www.w3.org/TR/accname-1.2/) |
| Enabled and disabled states | Matched controls with only disabled state changed | Disabled state remains identifiable without color alone | Disabled control is visually identical or wrongly operable | seed-skills/wcag-accessibility-testing/SKILL.md |
| Background icon versus current-color icon | Matched icon controls with the same accessible name | Both controls keep a name and reviewed visible symbol | Background-only icon vanishes or loses its control boundary | [Forced-colors media feature](https://www.w3.org/TR/mediaqueries-5/) |

The first row proves the mode transition and establishes a normal rendering control. The second separates keyboard routing from paint. The third and fourth compare paired states, while the fifth isolates icon technique without changing the control's name.

Do not collapse the results into one pass count. Report each component and state, because one hidden focus ring should not erase evidence that the other controls worked. The first differing state is the fastest path to ownership.

- Repeat the table on at least one real Windows target before release. Emulated CI results are useful for change detection, but the actual operating system, selected palette, display settings, and browser still affect the final observation.

The [blog index](/blog) links broader visual, keyboard, and platform guidance. This matrix remains small so reviewers can inspect every cell after a component or browser update.

## How do you implement forced colors visual accessibility testing?

Implement the gate as a state recorder, not only a page screenshot. The recorder should visit controls in a known order, save semantic facts, capture focused evidence, and compare observed cues with a reviewed fixture contract. A defect must identify one control and one transition.

- The second example models that contract. It is an adaptation of the focused-test, actionable-output, and cleanup rules in seed-skills/wcag-accessibility-testing/SKILL.md. The set of allowed visual cues is a project decision and should be reviewed with accessibility specialists.

\`\`\`typescript
import { expect, type Locator, type Page } from '@playwright/test';

type StateRecord = {
  id: string;
  name: string;
  selected: string | null;
  disabled: boolean;
  cue: boolean;
};

async function recordState(id: string, control: Locator): Promise<StateRecord> {
  await control.focus();
  return control.evaluate((element, controlId) => {
    const style = getComputedStyle(element);
    const cue =
      parseFloat(style.outlineWidth) > 0 ||
      parseFloat(style.borderWidth) > 0 ||
      style.textDecorationLine !== 'none' ||
      style.boxShadow !== 'none';

    return {
      id: controlId,
      name: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '',
      selected: element.getAttribute('aria-selected'),
      disabled:
        element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true',
      cue,
    };
  }, id);
}

export async function auditForcedGallery(page: Page): Promise<StateRecord[]> {
  const ids = ['save', 'close', 'updates', 'billing-tab', 'disabled-action'];
  const records: StateRecord[] = [];

  for (const id of ids) {
    const control = page.getByTestId(id);
    await expect(control).toBeVisible();
    const record = await recordState(id, control);
    expect(record.name, \`\${id} needs an accessible name\`).not.toBe('');
    expect(record.cue, \`\${id} needs a reviewed visible cue\`).toBe(true);
    records.push(record);
  }

  return records;
}
\`\`\`

- This computed check is intentionally conservative. A nonzero style can still be invisible, so screenshot and manual review remain required. Its value is diagnostic: it catches missing style paths and records the first component that lacks every approved cue.

Follow this procedure for each supported browser and Windows image:

1. Read seed-skills/accessibility-a11y-enhanced/SKILL.md and seed-skills/wcag-accessibility-testing/SKILL.md, then record supported media, keyboard, screenshot, naming, CI, and cleanup patterns.
2. Build the isolated gallery with links, buttons, custom checkboxes, selected tabs, disabled controls, icons, stable test IDs, fixed data, and visible baseline focus.
3. Run normal and forced positive cases, confirm the media query, traverse every control, record semantic states, and save reviewed screenshots before injecting faults.
4. Inject one background-only icon, transparent boundary, color-only selection, hidden focus mark, or adjustment opt-out at a time while all other inputs remain fixed.
5. Compare each result with the five-row matrix, then report the first control, transition, semantic fact, computed cue, or screenshot region that differs.
6. Run the deterministic gate in CI, complete a real Windows review for critical flows, retain safe evidence, close contexts, remove temporary profiles, and restore OS settings.

Run the base case again after all fault cases. That final control catches leaked classes, selection, focus, or browser context state. It also proves cleanup did not make a later test inherit the previous defect.

- Use the [skills directory](/skills) to select focused accessibility patterns. Keep the fixture and evidence contract in version control so every browser or component change receives the same review.

## Frequently Asked Questions

### How should QA verify controls, focus indicators, icons, and selected states when Windows forced-colors mode overrides CSS?

- Activate forced colors, confirm the media query, and traverse a fixed component gallery by keyboard. Compare semantic states, computed cues, reviewed screenshots, and a real Windows run. Fail when a named control loses its boundary, focus mark, icon, disabled cue, or selected distinction under the chosen palette.

### What should a forced colors accessibility test fixture record?

- Record fixture commit, component test ID, role, accessible name, selected and disabled states, active element, media-query result, browser build, Windows build, palette name, and screenshot path. Add the first mismatching cue and cleanup result. Avoid storing unrelated desktop content or a user's personal display settings.

### Which failure proves Windows high contrast QA is broken?

- A decisive failure keeps the correct semantic state and keyboard target but loses a reviewed visible distinction only when forced colors is active. For example, the selected tab remains aria-selected yet looks identical to its neighbor. A false media query instead proves the runner setup is broken.

### How do teams isolate forced-color-adjust regression?

- Use matched controls and change only one test-only adjustment rule. Keep markup, state, viewport, browser, data, and palette fixed, then capture before and after evidence. Run a native-control positive case first and restore styles afterward. This separates an application rule from browser or operating-system variation.

### Which assertion is strongest for focus indicator forced colors?

- The strongest practical oracle combines exact active-element identity, a state transition, a reviewed focused screenshot, and manual Windows confirmation. Computed outline or border values add diagnosis but cannot prove perception alone. Exact system-color equality is too narrow because users can select different palettes and contrast preferences.

### How should CI report icon visibility high contrast failures?

- CI should name the icon control, accessible name, forced-colors state, browser and OS build, expected visible technique, observed cue, screenshot diff, and cleanup status. It should separate a missing painted icon from a missing accessible name. Keep the failure concise and retain only application-window evidence.

## Conclusion

forced colors visual accessibility testing gives the team a clear pass rule. Each control must keep its name, edge, key focus, state, and useful icon when the browser swaps colors.
This keeps forced colors visual accessibility testing clear for each review.

Keep the test page small and fixed. Run native controls first, add one known fault at a time, and name the first part that no longer makes sense.

Save both the good and bad view for the same state. Then run the good case once more, so old focus, style, or page data cannot leak into the next check.

The CI run is a fast change check, not the last word for all users. A clean Windows run with the chosen theme gives the team the last piece of proof.

Review the [accessibility testing automation guide](/blog/accessibility-testing-automation-guide), then open the [QA skills directory](/skills). Use the forced colors visual accessibility testing matrix in the next test run.`,
};
