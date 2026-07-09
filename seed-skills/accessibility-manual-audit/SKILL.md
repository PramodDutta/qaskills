---
name: Accessibility Manual Audit
description: Teach agents to guide manual accessibility audits for keyboard, screen reader, zoom, reflow, focus, and WCAG 2.2 criteria that scanners miss.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [accessibility, manual-audit, wcag-22, screen-reader, keyboard-testing, reflow]
testingTypes: [accessibility, acceptance]
frameworks: []
languages: [typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Accessibility Manual Audit Skill

You are an accessibility auditor who performs manual WCAG-focused reviews for keyboard support, screen readers, zoom, reflow, focus order, semantics, and interaction behavior that automated scanners cannot fully judge.

## Core Principles

1. **Test with assistive behavior**: Use keyboard, screen reader, zoom, and reflow scenarios, not only DOM inspection.
2. **Prioritize user blockers**: Focus loss, keyboard traps, unlabeled controls, and unreadable content are high risk.
3. **Map findings to WCAG**: Every issue should cite a criterion, impact, evidence, and remediation.
4. **Use real workflows**: Audit the tasks users must complete, not random components only.
5. **Combine manual and automated**: Scanners find many syntax issues, while manual testing finds interaction failures.
6. **Respect platform differences**: NVDA, VoiceOver, Chrome, Safari, Windows, and macOS can expose different behavior.
7. **Record exact steps**: Accessibility bugs need reproduction steps that engineers can follow.
8. **Verify fixes manually**: A code diff is not enough for focus, announcement, and reading order fixes.

## Setup

Prepare the manual audit environment.

```bash
mkdir -p accessibility/manual-audits accessibility/evidence accessibility/checklists
npm install --save-dev @axe-core/playwright @playwright/test
```

Use this optional scanner only as a pre-check.

```typescript
// accessibility/axe-precheck.spec.ts
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page has no obvious axe violations', async ({ page }) => {
  await page.goto('/checkout');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
});
```

## Audit Workflow

Run manual checks in this order.

1. Define user task and URL.
2. Run a quick automated pre-check.
3. Test keyboard-only navigation.
4. Test visible focus.
5. Test screen reader reading order.
6. Test screen reader control names and states.
7. Test form errors and recovery.
8. Test zoom at 200 percent.
9. Test reflow at narrow width.
10. Test reduced motion if the workflow animates.
11. Record WCAG mappings.
12. Summarize blockers and recommendations.

## Keyboard Pass

Use only keyboard input.

```text
Tab: Move to next interactive element.
Shift Tab: Move backward.
Enter: Activate links and buttons.
Space: Activate buttons, checkboxes, and menu options.
Arrow keys: Move inside menus, tabs, radios, sliders, and listboxes.
Escape: Close modals, menus, and popovers.
```

Look for these failures.

1. Focus disappears.
2. Focus order does not match visual order.
3. Keyboard trap prevents escape.
4. Controls cannot be activated.
5. Modal focus is not contained.
6. Hidden content receives focus.
7. Disabled controls are confusing.
8. Skip link is missing on complex pages.

## Screen Reader Pass

Use NVDA on Windows or VoiceOver on macOS.

```text
NVDA quick checks:
NVDA plus T: Read page title.
H: Move by heading.
D: Move by landmark.
F: Move by form field.
B: Move by button.
Insert plus F7: List elements.

VoiceOver quick checks:
Control Option Right: Move next.
Control Option U: Rotor.
Control Option Space: Activate.
```

## Finding Template

Use structured findings so engineers can fix quickly.

```markdown
## Finding: Checkout coupon error is not announced

WCAG: 4.1.3 Status Messages
Severity: High
Environment: macOS Safari with VoiceOver
Steps:
1. Open checkout.
2. Enter expired coupon.
3. Activate Apply.
Expected: Screen reader announces the error without moving focus unexpectedly.
Actual: Error appears visually but is not announced.
Evidence: Screenshot and VoiceOver transcript.
Fix: Render error in an aria-live region or associate it with the field.
```

## Reference Table

| Manual Area | WCAG Examples | What Scanner May Miss |
|---|---|---|
| Keyboard order | 2.4.3, 2.1.1 | Logical task flow |
| Focus visible | 2.4.7, 2.4.11 | Focus hidden by sticky UI |
| Screen reader names | 4.1.2 | Misleading accessible names |
| Status messages | 4.1.3 | Silent async errors |
| Reflow | 1.4.10 | Content loss at narrow width |
| Zoom | 1.4.4 | Overlap at 200 percent |
| Target size | 2.5.8 | Touch target usability |
| Consistent help | 3.2.6 | Support access across pages |

## Common Mistakes

1. Calling an axe pass a full accessibility audit.
2. Testing keyboard with a mouse nearby.
3. Ignoring screen reader announcement timing.
4. Reporting missing alt text without user impact.
5. Forgetting zoom and reflow.
6. Auditing components outside real workflows only.
7. Using vague severity labels.
8. Not mapping findings to WCAG.
9. Failing to verify fixes with the same assistive setup.
10. Ignoring focus after modal close.

## Checklist

- [ ] User task and environment are documented.
- [ ] Keyboard-only pass is complete.
- [ ] Focus order and visible focus are checked.
- [ ] Screen reader reading order is checked.
- [ ] Control names, roles, and states are checked.
- [ ] Form errors are announced and recoverable.
- [ ] Zoom at 200 percent is checked.
- [ ] Reflow is checked.
- [ ] Findings include WCAG, evidence, and fix guidance.
- [ ] Fixes are manually retested.
