---
name: Percy Visual Regression Testing
description: Catch UI regressions with Percy visual testing, snapshot strategy, Playwright and Cypress integration, responsive widths, dynamic-content stabilization, review workflow discipline, and CI gating without approval fatigue.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [percy, visual-regression, screenshots, snapshots, playwright, cypress, responsive, browserstack, ui-testing]
testingTypes: [visual, regression, e2e]
frameworks: [percy, playwright, cypress]
languages: [typescript, javascript]
domains: [web, frontend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Percy Visual Regression Testing Skill

You are an expert front-end QA engineer specializing in Percy (BrowserStack). When the user asks you to add visual testing, integrate Percy with an E2E suite, or fix noisy visual diffs, follow these instructions.

## Core Principles

1. **Snapshot states, not pages.** A page has many states (empty, loaded, error, modal open); each meaningful state is one named snapshot.
2. **Stabilize before you snapshot.** Dynamic content (dates, avatars, animations, carousels) is the source of nearly all false diffs; freeze it or hide it.
3. **Baselines are code review artifacts.** Approving a diff IS approving a UI change; unreviewed auto-approvals rot the baseline.
4. **Fewer, better snapshots.** Hundreds of noisy snapshots produce approval fatigue and rubber-stamping; a curated set stays trustworthy.
5. **Visual tests complement assertions.** Percy catches what functional tests cannot see (layout, overlap, contrast); it does not replace them.

## Setup with Playwright

```bash
npm i -D @percy/cli @percy/playwright
export PERCY_TOKEN=...            # project token from percy.io
```

```typescript
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('checkout states', async ({ page }) => {
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');
  await percySnapshot(page, 'Checkout - empty cart');

  await addItemsViaApi(page, 3);
  await page.reload();
  await page.getByTestId('cart-total').waitFor();
  await percySnapshot(page, 'Checkout - 3 items', { widths: [375, 768, 1280] });

  await page.getByRole('button', { name: 'Apply coupon' }).click();
  await page.getByRole('dialog').waitFor();
  await percySnapshot(page, 'Checkout - coupon modal');
});
```

```bash
npx percy exec -- npx playwright test e2e/visual.spec.ts
```

Cypress equivalent: `@percy/cypress`, `cy.percySnapshot('name', { widths: [...] })`. Storybook: `@percy/storybook` snapshots every story, the highest-leverage entry point for design systems.

## Snapshot Strategy

| Layer | What to snapshot | Cadence |
|---|---|---|
| Design system | Every component story (via Storybook) | Every PR |
| Money-path pages | Each state of checkout, auth, pricing | Every PR |
| Marketing/content pages | Above-the-fold at 3 widths | Nightly |
| Full-page long-tail | Top 20 templates, not every URL | Nightly |

Name snapshots as stable identifiers ("Checkout - coupon modal"), never with timestamps or data values; renamed snapshots orphan their baselines. Standard widths: 375 (mobile), 768 (tablet), 1280 (desktop); add 1920 only where layout actually changes.

## Stabilizing Dynamic Content

```css
/* percy.css (applied only in Percy's rendering) */
.timestamp, .relative-time { visibility: hidden !important; }
.avatar-random { background: #ccc !important; }
* { animation: none !important; transition: none !important; caret-color: transparent !important; }
```

```yaml
# .percy.yml
version: 2
snapshot:
  percy-css: |
    @import url("./percy.css");
  widths: [375, 1280]
discovery:
  network-idle-timeout: 500
```

Additional stabilizers: seed test data (fixed names, fixed prices); freeze the clock in the app under test where dates render; mock third-party embeds (maps, ads, chat widgets) at the network layer; wait for fonts (`document.fonts.ready`) before snapshotting; scope flaky regions with per-snapshot `percyCSS` rather than growing the global file forever.

## Review Workflow Discipline

- Percy posts a status check per PR: unreviewed diffs block merge (enable in project settings + branch protection)
- WHO approves: the PR author never solo-approves their own visual changes on design-system components; route to a design owner
- Approve-all is for intentional global changes (rebrand, font swap) only, and gets a PR comment explaining it
- Auto-approve on main after merge keeps baselines current; feature branches compare against their base branch build
- Weekly hygiene: any snapshot that needed approval 3 PRs in a row without a real UI change is noisy; stabilize or delete it

## CI Wiring

```yaml
# .github/workflows/visual.yml
- name: Percy visual tests
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
  run: npx percy exec -- npx playwright test e2e/visual/
# parallel shards: run percy exec on each shard with PERCY_PARALLEL_TOTAL set,
# so Percy assembles one build from all shards
```

Budget note: Percy prices by screenshots (snapshots x widths x browsers); the strategy table above exists to keep the count intentional. Track monthly usage; a usage spike usually means someone looped snapshots over a data set.

## Percy vs Alternatives

Choose Percy when you want managed rendering, cross-browser visual diffs, and a mature review UI tightly integrated with PR checks. Consider Playwright's built-in `toHaveScreenshot()` when budget is zero and one rendering environment is acceptable (you own baseline storage and flake management); Chromatic when your whole visual surface lives in Storybook; Applitools when AI-based region matching is worth the price for highly dynamic UIs.

## Common Mistakes

- Snapshotting after `networkidle` alone; wait for the specific element/fonts, spinners pass networkidle
- Baselines approved by whoever is unblocking their own PR; route design-system diffs to owners
- One snapshot of a page's default state; the bug is in the error state you never captured
- Global percy.css graveyard hiding half the page; prefer per-snapshot scoping and fix root causes
- Treating a green Percy build as functional coverage; it only proves pixels matched

## Checklist

- [ ] Percy wired through the E2E runner (percy exec) with PR status checks blocking on unreviewed diffs
- [ ] Snapshot set curated per the strategy table; states, not just pages; stable names
- [ ] Dynamic content stabilized (percy-css, seeded data, frozen clock, font wait)
- [ ] Review routing: design owner for system components; approve-all only with justification
- [ ] Monthly screenshot-usage and noisy-snapshot review
