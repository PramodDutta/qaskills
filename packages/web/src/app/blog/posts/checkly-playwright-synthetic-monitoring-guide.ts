import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Checkly and Playwright: Synthetic Monitoring as Code Guide',
  description:
    'Run Playwright tests as production monitors with Checkly: check syntax, CLI workflow, alerting, pricing model, and how it compares to DIY cron suites.',
  date: '2026-07-07',
  category: 'Guide',
  content: `
# Checkly and Playwright: Synthetic Monitoring as Code Guide

Your E2E suite proves the app worked at merge time. Production users experience the app at 3 a.m. on Sunday, after a dependency's CDN hiccups, a certificate rotates, or a third-party payment script degrades. Synthetic monitoring closes that gap by running your critical user journeys against production continuously, and Checkly's specific bet is that those monitors should be the same Playwright code your team already writes, managed in git, deployed like software. They call the workflow monitoring as code (MaC).

This guide covers how Checkly's Playwright-based checks work, the CLI-driven workflow, alerting design, what it costs, and an honest comparison against running your own scheduled suite. For the conceptual background on monitoring versus testing, see our [synthetic monitoring with Playwright guide](/blog/synthetic-monitoring-playwright-guide).

## The Core Model: Checks as Code

Checkly runs three main check types: API checks (single-request assertions with sub-second resolution), browser checks (Playwright scripts), and multistep checks (Playwright's request API for chained API journeys). Browser checks are literally \`@playwright/test\` specs:

\`\`\`typescript
// __checks__/checkout.check.spec.ts
import { test, expect } from '@playwright/test';

test('checkout journey stays alive', async ({ page }) => {
  await page.goto(process.env.ENVIRONMENT_URL ?? 'https://shop.example.com');
  await page.getByRole('link', { name: 'Starter Plan' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('link', { name: 'Cart' }).click();
  await expect(page.getByTestId('cart-total')).toHaveText('$29.00');
});
\`\`\`

The surrounding infrastructure is declared in a construct file, also code:

\`\`\`typescript
// __checks__/checkout.check.ts
import { BrowserCheck, Frequency, AlertEscalationBuilder } from 'checkly/constructs';

new BrowserCheck('checkout-journey', {
  name: 'Checkout journey (prod)',
  frequency: Frequency.EVERY_10M,
  locations: ['eu-west-1', 'us-east-1'],
  code: { entrypoint: './checkout.check.spec.ts' },
  alertEscalationPolicy: AlertEscalationBuilder.runBasedEscalation(2), // alert after 2 consecutive fails
  retryStrategy: { type: 'LINEAR', maxRetries: 1, baseBackoffSeconds: 30 },
});
\`\`\`

Then the CLI does what CLIs should:

\`\`\`bash
npx checkly test        # run checks locally / in CI before deploying them
npx checkly deploy      # ship the monitors like an app deploy
\`\`\`

That test-then-deploy loop is the differentiator: monitors get code review, versioning, and a CI gate, so a broken monitor never silently replaces a working one. Your Playwright skills transfer one to one, including fixtures, role-based locators, and trace debugging; failed check runs come back with the full Playwright trace, video, and console output attached to the alert.

## Designing the Monitor Suite (Smaller Than You Think)

Monitoring is not regression testing at a different time of day. The economics and the failure semantics differ:

| Dimension | CI E2E suite | Synthetic monitors |
|---|---|---|
| Purpose | Catch regressions before merge | Catch outages and degradations in prod |
| Size | Hundreds of tests | 5 to 20 journeys |
| Failure meaning | A developer broke something | Customers are affected NOW |
| Data | Disposable test env | Real prod: needs test accounts, idempotent flows |
| Frequency | Per PR | Every 1 to 15 minutes, multi-region |
| Flake tolerance | Annoying | Intolerable: every flake pages a human |

Pick the journeys whose failure you would declare an incident for: login, search, add-to-cart, checkout with a test card, critical API contracts. Each monitor must be idempotent against production (dedicated test accounts, test-mode payments, cleanup steps) and observable without side effects on real users or analytics (filter the monitor's traffic by user agent or account ID). Keep deep coverage in CI, breadth of uptime in monitoring; our [Playwright E2E guide](/blog/playwright-e2e-complete-guide) covers the suite side of that split.

## Alerting Without Pager Fatigue

The failure mode of synthetic monitoring is not missed outages; it is a team that mutes the channel. Checkly's primitives map to the standard discipline:

- **Retries before alerts.** One retry from a second location distinguishes a blip from an outage; the escalation policy above alerts only on consecutive failures.
- **Location quorum.** Run from 2 or 3 regions; alert when multiple agree. Single-region failures are usually network weather.
- **Severity routing.** Checkout failure pages on-call (PagerDuty, Opsgenie); marketing-page failure posts to Slack. Route by check group, not globally.
- **Degradation thresholds.** Checks can flag soft failures (response over N ms) separately from hard failures, feeding performance budgets rather than incidents. This pairs naturally with the practices in our [performance monitoring and testing guide](/blog/performance-monitoring-testing-guide).

## Pricing Shape and Alternatives

Checkly prices by check runs (a free hobby tier, then usage-based paid tiers; browser-check runs cost more than API-check runs). The practical math: frequency times locations times journeys. Ten browser journeys, every 10 minutes, from two locations is roughly 288,000 browser runs a month, which lands in paid-plan territory; check current pricing before committing, and tune frequency per journey (checkout every 5 minutes, pricing page every hour).

Alternatives worth weighing:

- **DIY: scheduled Playwright in GitHub Actions.** Nearly free, and fine for one or two journeys. You give up multi-region execution, retry semantics, alert escalation, dashboards, and the paper trail; rebuilding those reliably is a real project.
- **Grafana Synthetic Monitoring, Datadog Synthetics:** natural when the rest of observability already lives there; Playwright support is narrower, scripting models more proprietary.
- **UptimeRobot / Pingdom class:** URL pings and simple transactions; not comparable for real user journeys.

The decision usually reduces to whether monitors are code in your repo (Checkly's lane, and the reason Playwright teams pick it) or configuration in an observability platform you already pay for.

## Rollout Checklist

1. Pick 5 incident-worthy journeys; create test accounts and test-mode payment paths for them
2. Write them as plain Playwright specs; review like product code
3. Add constructs with conservative frequency, 2 locations, run-based escalation after 2 failures
4. \`npx checkly test\` in CI, \`npx checkly deploy\` from main only
5. Route alerts by severity; measure a false-positive rate and drive it toward zero before adding more checks
6. Revisit monthly: every incident that monitors missed becomes a new check; every alert that was not an incident becomes a tuning task

Synthetic monitoring is the cheapest insurance in QA: a handful of well-chosen Playwright journeys, run relentlessly, catching the failures your CI suite structurally cannot see. Checkly's contribution is making those monitors live where your tests already live, in the repo, under review, deployed on purpose.

## Frequently Asked Questions

### Can I reuse my existing Playwright tests as Checkly checks?

Yes, browser checks are standard @playwright/test specs, and that reuse is the core pitch. In practice you should port selectively: monitors need production-safe data, idempotent flows, and incident-worthy scope, so most teams copy 5 to 20 journeys rather than pointing the whole suite at prod.

### How is Checkly different from running Playwright on a cron in GitHub Actions?

The DIY route covers execution but not the operational layer: multi-region quorum, retry-then-escalate alerting, on-call routing, dashboards, and per-check history. One or two journeys, DIY is fine; the moment false-positive discipline and paging matter, rebuilding that layer costs more than the subscription.

### What frequency should production monitors run at?

Match frequency to incident tolerance per journey: checkout and login every 5 to 10 minutes from two or more regions, secondary pages every 30 to 60 minutes. Since pricing scales with run volume, tuning per check is the main cost lever.

### How do I stop synthetic monitors from paging on flakes?

Retries plus location quorum plus consecutive-failure escalation. A check must fail its retry, from more than one region, twice in a row before a human gets paged. Then treat every remaining false alarm as a defect in the monitor and fix it the same week.
`,
};
