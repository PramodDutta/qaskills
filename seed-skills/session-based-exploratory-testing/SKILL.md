---
name: Session Based Exploratory Testing
description: Teach agents to run session-based exploratory testing with charters, time boxes, tours, note-taking, debriefs, and coverage tracking.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [exploratory-testing, session-based-testing, charters, test-strategy, coverage, debrief]
testingTypes: [strategy, acceptance]
frameworks: []
languages: [typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Session Based Exploratory Testing Skill

You are an exploratory test lead who runs focused test sessions with clear charters, time boxes, evidence, debriefs, and coverage maps that improve product understanding.

## Core Principles

1. **Use charters, not wandering**: Exploration needs a mission, risk focus, and stopping point.
2. **Time box the work**: A session should usually be 45 to 90 minutes with notes captured during the run.
3. **Follow the evidence**: Let findings guide investigation, but record every major branch.
4. **Balance learning and testing**: Exploration discovers behavior, risks, and questions, not only bugs.
5. **Capture coverage honestly**: State what was covered, skipped, blocked, and still unknown.
6. **Debrief every session**: Convert notes into bugs, automation ideas, documentation updates, and risks.
7. **Use tours deliberately**: Pick a tour that matches the feature and failure mode.
8. **Feed automation**: Stable discoveries become regression tests, while broad risks stay as charters.

## Setup

Create a lightweight workspace for session notes.

```bash
mkdir -p exploratory/charters exploratory/notes exploratory/evidence exploratory/coverage
touch exploratory/coverage/release-map.md
touch exploratory/notes/session-template.md
```

Use a simple note template.

```markdown
# Session Notes

Charter:
Tester:
Date:
Build:
Time box:
Environment:

## Setup

## Timeline

## Bugs

## Questions

## Coverage

## Follow-ups
```

## Charter Design

A useful charter contains these parts.

1. Mission.
2. Product area.
3. Risk focus.
4. Test data.
5. Constraints.
6. Out-of-scope areas.
7. Time box.
8. Evidence required.
9. Debrief audience.

## Example Charter

```markdown
# Charter: Checkout Discount Risk

Mission: Explore discount behavior during checkout.
Area: Cart, coupon entry, order summary, payment step.
Risk: Incorrect totals, expired coupons, stacked discounts, confusing errors.
Data: Synthetic buyer with saved address.
Constraints: Do not submit payment.
Out of scope: Admin coupon creation.
Time box: 60 minutes.
Evidence: Screenshots for total changes and console errors.
Debrief: QA lead, checkout engineer, product owner.
```

## Tours

Choose tours based on risk.

| Tour | Use When | Example Prompt |
|---|---|---|
| Money tour | Pricing or payment matters | Try discounts, taxes, refunds, totals |
| Data tour | Inputs and persistence matter | Change profile fields and reload |
| Interrupt tour | Workflow can be disrupted | Refresh, back, close tab, retry |
| Persona tour | Different roles matter | Buyer, admin, guest, expired user |
| Error tour | Validation matters | Invalid coupon, missing address |
| Claims tour | Marketing or docs make promises | Compare UI behavior to copy |

## Note-Taking Style

Use timestamped notes with concise evidence.

```text
00:00 Started checkout discount charter on staging build 8124.
07:20 Coupon SAVE10 applies 10 percent discount, total changed from 100 to 90.
12:45 Refresh preserved coupon in cart.
18:10 Expired coupon shows generic error, expected expiry-specific message.
24:30 Console shows 400 from POST /coupons/validate for expired coupon.
31:00 Back button from payment step preserves order summary.
45:00 Stopped, key risk is unclear coupon error messaging.
```

## Coverage Tracking

Track coverage as a map, not a pass count.

```typescript
type SessionCoverage = {
  area: string;
  covered: string[];
  skipped: string[];
  risks: string[];
  automationIdeas: string[];
};

const checkoutDiscountCoverage: SessionCoverage = {
  area: 'checkout discounts',
  covered: ['valid coupon', 'expired coupon', 'refresh after coupon', 'back from payment'],
  skipped: ['tax-inclusive regions', 'gift cards'],
  risks: ['generic coupon errors may increase support tickets'],
  automationIdeas: ['valid coupon keeps total after refresh'],
};

console.log(JSON.stringify(checkoutDiscountCoverage, null, 2));
```

## Debrief Questions

Ask these after each session.

1. What did we learn?
2. What bugs did we find?
3. What risk remains?
4. What should be automated?
5. What needs a product decision?
6. What data or environment blocked us?
7. What charter should run next?
8. Did the time box fit the scope?

## Common Mistakes

1. Starting without a charter.
2. Writing notes after the session from memory.
3. Reporting only bugs and losing coverage context.
4. Testing happy paths only.
5. Letting a 60 minute session become all-day wandering.
6. Ignoring questions raised during testing.
7. Filing bugs without reproduction evidence.
8. Treating exploratory testing as unstructured clicking.
9. Forgetting to debrief.
10. Not feeding automation with stable findings.

## Checklist

- [ ] The session has a charter.
- [ ] Time box and environment are recorded.
- [ ] Test data is identified.
- [ ] Notes are captured during the session.
- [ ] Evidence is saved for important findings.
- [ ] Bugs include reproduction steps.
- [ ] Coverage, skipped areas, and risks are documented.
- [ ] Debrief happened with the right audience.
- [ ] Automation ideas were extracted.
- [ ] Next charters were identified.
