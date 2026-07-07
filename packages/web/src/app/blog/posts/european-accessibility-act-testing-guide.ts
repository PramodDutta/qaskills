import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'European Accessibility Act Testing Guide for QA Teams',
  description:
    'What the European Accessibility Act means for QA in 2026: who must comply, EN 301 549 and WCAG mapping, an audit workflow, and automation coverage.',
  date: '2026-07-07',
  category: 'Guide',
  content: `
# European Accessibility Act Testing Guide for QA Teams

The European Accessibility Act (EAA, Directive 2019/882) stopped being a future problem on June 28, 2025. Since that date, most consumer-facing digital products and services sold into the EU must be accessible, and member states enforce it with market surveillance authorities, complaint mechanisms, and fines that vary by country but reach into six figures in several jurisdictions. Unlike earlier EU accessibility rules that targeted the public sector, the EAA squarely covers private companies: e-commerce, banking, transport booking, e-books, streaming interfaces, and more, including non-EU companies selling to EU consumers.

For QA teams this converts accessibility from a values conversation into a compliance requirement with a legal standard attached. This guide explains who is in scope, what standard you are actually tested against, how to structure an audit-ready testing workflow, and how far automation gets you. For tooling fundamentals, see our [accessibility testing automation guide](/blog/accessibility-testing-automation-guide).

## Who Is in Scope (Probably You)

The EAA covers products and services "for consumers", with notable categories:

- E-commerce services: effectively any B2C website or app that concludes contracts or takes payment online
- Consumer banking and payment services
- Electronic communications (messaging, VoIP)
- Access to audiovisual media (streaming UIs, players)
- E-books and dedicated reading software
- Transport: ticketing, check-in, real-time travel information
- Operating systems, self-service terminals, and their interfaces

Key nuances QA leads should know:

- **Non-EU companies are covered** when they direct services at EU consumers. A US SaaS with an EU checkout is in scope for that funnel.
- **Microenterprise exemption:** service providers under 10 employees AND under 2 million euro turnover are exempt from the service obligations. This does not travel far; venture-backed startups typically pass the threshold quickly.
- **Legacy grace periods exist** (service contracts running until 2030 in some cases), but any interface shipped or substantially updated after June 2025 is live scope.
- **B2B-only products** are formally outside the consumer definition, but procurement increasingly demands EAA-level conformance anyway, so the practical scope is wider than the legal one.

None of this is legal advice; scope edge cases belong with counsel. QA's job starts once someone decides "we must conform."

## The Standard You Are Tested Against

The EAA itself states functional requirements, not test criteria. The presumption-of-conformity route runs through **EN 301 549**, the European standard for ICT accessibility, whose web and app requirements incorporate **WCAG 2.1 Level AA** success criteria (with EN-specific additions for software, documentation, and support channels). In practice:

| Layer | What it means for testing |
|---|---|
| WCAG 2.1 AA | The concrete pass/fail criteria your audits run against |
| EN 301 549 extras | Platform software, documentation, support channels also assessed |
| WCAG 2.2 | Not yet the harmonized baseline, but testing against it future-proofs you |
| Accessibility statement | A published, maintained document describing conformance and gaps |
| Feedback channel | Users must be able to report barriers; complaints can trigger enforcement |

Test to WCAG 2.2 AA, report against 2.1 AA, and keep the accessibility statement synchronized with known-issues from your bug tracker. Auditors and authorities read the statement first; a stale one is an easy first finding.

## An Audit-Ready QA Workflow

1. **Inventory user journeys, not pages.** Enforcement scenarios start from "a user could not complete checkout with a screen reader", so scope your test plan around the money paths: search, product page, cart, checkout, account, support contact.
2. **Automated scanning on every build.** axe-core wired into your E2E suite catches roughly the machine-detectable classes (naming, contrast, structure, ARIA misuse). Run it per journey state, not just per URL, so modals and error states get scanned. Our [AI accessibility testing tools roundup](/blog/ai-accessibility-testing-tools-2026) covers scanners that classify and prioritize findings.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('checkout payment step has no critical a11y violations', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByRole('button', { name: 'Continue to payment' }).click();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  const serious = results.violations.filter(v =>
    ['critical', 'serious'].includes(v.impact ?? ''));
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
\`\`\`

3. **Manual assistive-technology passes per release cycle.** Keyboard-only completion of every money path; screen reader passes with NVDA plus Chrome and VoiceOver plus Safari at minimum; 200 percent zoom and reflow checks. Automation cannot judge whether the reading order makes sense or whether the error message actually helps.
4. **Track findings as compliance items.** Each violation gets a WCAG criterion reference, severity, journey, and remediation owner. This log feeds both the fix backlog and the accessibility statement's "known non-conformities" section.
5. **Regression-lock fixes.** Every remediated barrier gets an automated check where possible (axe rule scoping or an explicit assertion), so conformance ratchets instead of oscillating.

## How Far Automation Gets You

Industry measurements consistently place automated detection somewhere between a third and a half of WCAG failures by occurrence (Deque has reported findings in the 50 percent range with modern rulesets; independent practitioners often measure lower). The honest operating assumption: automation is your regression net and your scale mechanism, manual testing is your conformance evidence. An EAA audit will not be impressed by a green axe run; it will ask whether a blind user can buy the product. Both layers, permanently.

## Priorities If You Are Starting Late

Late starters should triage by enforcement exposure: fix the checkout and authentication barriers first (blockers with legal teeth), publish an honest accessibility statement with a remediation roadmap second (authorities respond better to documented progress than to silence), then work the long tail by severity. Budget-wise, teams that retrofit report the work dominated by design-system fixes (focus management, color tokens, form patterns); once those land, per-page findings collapse quickly.

The EAA is ultimately a forcing function for practices that were already correct: semantic markup, role-based selectors (which also make your E2E suite more stable), keyboard-first flows, and accessibility checks in CI. Teams that treat it as an engineering-quality program, not a legal checkbox, end up with both the conformance file and a measurably better product.

## Frequently Asked Questions

### Does the EAA apply to companies outside the EU?

Yes, when they direct products or services at EU consumers. A US or Indian SaaS with EU customers, an EU-shipping storefront, or localized EU checkout is in scope for those funnels. Enforcement runs through the member state where the service is offered.

### Is WCAG compliance the same as EAA compliance?

Not identical, but close in practice. Conformance is presumed via EN 301 549, whose web requirements incorporate WCAG 2.1 AA, plus additional requirements (support channels, documentation, accessibility statement). Testing to WCAG 2.2 AA and maintaining an honest statement covers the QA-owned share of the obligation.

### What happens if we are not compliant yet?

Market surveillance authorities respond to complaints and can require corrective action, with fines varying by member state. Documented assessment, a published accessibility statement listing known non-conformities, and an active remediation roadmap materially change how those interactions go compared to silence.

### Can automated testing alone make us EAA compliant?

No. Automated rulesets detect roughly a third to a half of WCAG failures by occurrence, and none of the judgment criteria (meaningful focus order, useful error text, sensible reading sequence). Automation is the regression net; manual assistive-technology passes on your money paths are the conformance evidence.
`,
};
