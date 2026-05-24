import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Percy Visual Testing Complete Guide 2026',
  description:
    'Master Percy by BrowserStack for visual testing in 2026. Snapshot SDK, responsive testing, review workflow, CI integration with Cypress, Playwright, and Storybook.',
  date: '2026-05-20',
  category: 'AI Testing',
  content: `
# Percy Visual Testing Complete Guide 2026

Percy is BrowserStack's visual testing platform. By 2026 it has become the go-to choice for teams that want straightforward visual regression testing without the complexity of full visual AI platforms. The product covers web, mobile web, and Storybook with a simple snapshot SDK, parallel rendering across browsers, and a clean review workflow. For teams that need reliable visual regression checks rather than cutting-edge visual AI, Percy is often the right call.

This guide covers Percy end to end: installation with major test frameworks, snapshot configuration, responsive testing, review workflow, the BrowserStack ecosystem, and CI integration. We include code samples for Cypress, Playwright, Selenium, and Storybook plus a setup checklist. By the end you should know how to add Percy to your existing test suite and use it to catch visual regressions. The guide assumes basic JavaScript or Python familiarity and an existing test suite.

## Key Takeaways

- Percy is BrowserStack's visual testing platform; simple, reliable, and integrated with the BrowserStack ecosystem.
- The snapshot SDK takes screenshots from existing tests; Percy renders them across browsers and compares to baselines.
- Responsive testing checks the same page at multiple widths.
- Review workflow surfaces visual diffs with approve/reject controls.
- Pricing is per-snapshot; cost scales with how much you snapshot.
- Compared to Applitools, Percy is simpler and less expensive but lacks advanced visual AI features.

---

## Why Percy

Percy's value proposition is simplicity. Other visual testing platforms (Applitools especially) have rich feature sets that take time to learn and tune. Percy is straightforward: take snapshots, review diffs, approve or reject. The learning curve is hours, not days.

The trade-off is sophistication. Percy does not have ignore region heuristics as advanced as Applitools, does not have visual AI categorization of changes, and does not have self-healing locators. For teams that need those features, Applitools is the better fit. For teams that just want reliable visual regression, Percy is excellent.

Percy is owned by BrowserStack, which means it integrates well with the broader BrowserStack ecosystem: device clouds, app testing, and accessibility. For teams already on BrowserStack, Percy is a natural add.

---

## Installation

For Cypress:

\`\`\`bash
npm install @percy/cli @percy/cypress
\`\`\`

For Playwright:

\`\`\`bash
npm install @percy/cli @percy/playwright
\`\`\`

For Selenium:

\`\`\`bash
npm install @percy/cli @percy/selenium-webdriver
\`\`\`

For Storybook:

\`\`\`bash
npm install @percy/cli @percy/storybook
\`\`\`

Set the Percy token:

\`\`\`bash
export PERCY_TOKEN=...
\`\`\`

The token comes from the Percy dashboard.

---

## Snapshot Basics

For Cypress:

\`\`\`javascript
// cypress/support/e2e.js
import "@percy/cypress";

// cypress/e2e/home.cy.js
describe("Home page", () => {
  it("renders correctly", () => {
    cy.visit("/");
    cy.percySnapshot();
  });
});
\`\`\`

For Playwright:

\`\`\`javascript
import { test } from "@playwright/test";
import percySnapshot from "@percy/playwright";

test("home page", async ({ page }) => {
  await page.goto("https://example.com");
  await percySnapshot(page, "Home Page");
});
\`\`\`

For Selenium:

\`\`\`javascript
const percySnapshot = require("@percy/selenium-webdriver");

await driver.get("https://example.com");
await percySnapshot(driver, "Home Page");
\`\`\`

The snapshot call takes a screenshot and uploads it to Percy. Percy renders the page across multiple browsers in its cloud and compares to the baseline.

---

## Running with Percy

Wrap your test command with percy exec.

\`\`\`bash
percy exec -- npx cypress run
percy exec -- npx playwright test
percy exec -- node ./tests/selenium.js
\`\`\`

The wrapper sets up the Percy SDK, runs your tests, and uploads snapshots. Without the wrapper, snapshots are not collected.

---

## Configuration

Configure Percy with a percy.yml file at the project root.

\`\`\`yaml
version: 2
snapshot:
  widths: [375, 768, 1280, 1920]
  min-height: 1024
discovery:
  allowed-hostnames: ["example.com", "cdn.example.com"]
  network-idle-timeout: 750
\`\`\`

The widths array defines responsive breakpoints. Percy renders the snapshot at each width and compares to the baseline at that width.

The discovery section controls asset capture. Percy discovers CSS, JS, and image assets used by the page so it can render correctly in its cloud.

---

## Responsive Testing

Percy supports responsive testing out of the box. Specify widths in the snapshot call or in the global config.

\`\`\`javascript
await percySnapshot(page, "Home Page", { widths: [375, 768, 1280] });
\`\`\`

Each width produces a separate baseline. A diff in any width fails the snapshot.

For teams that support a wide range of devices, this is critical. A page that looks great on desktop may break on mobile.

---

## Ignore Regions

For dynamic content, use Percy's ignore regions.

\`\`\`javascript
await percySnapshot(page, "Home Page", {
  percyCSS: ".timestamp { visibility: hidden; }",
});
\`\`\`

The percyCSS option applies CSS only during Percy's render. Use it to hide timestamps, user IDs, or other dynamic content.

For more complex ignore patterns, use the ignore-region option (per-element) or define stable test data that does not vary between runs.

---

## Storybook Integration

Percy has excellent Storybook integration.

\`\`\`bash
percy storybook ./storybook-static
\`\`\`

This command builds Storybook (if needed) and takes a snapshot of every story. Useful for design system regression testing.

The integration is one command. Add to CI and component visual tests run on every PR.

---

## Review Workflow

Percy's review interface shows snapshots grouped by build (one build per CI run). Each snapshot shows:

The baseline image.

The current image.

The diff highlighted.

Approve/reject buttons.

Reviewers go through changes quickly. Approved changes update the baseline; rejected changes flag the build as failing.

For teams with many snapshots, review on every PR. Set up Slack notifications when builds are ready for review.

---

## Pricing

Percy pricing is per-snapshot. A snapshot counts each combination of name and width.

| Tier | Snapshots/Month | Price |
| --- | --- | --- |
| Free | 5,000 | $0 |
| Standard | 25,000 | $149 |
| Pro | 100,000 | $549 |
| Enterprise | Custom | Custom |

For a 5-person team running 1000 snapshots per day across 4 widths, expect $500-$1000/month.

Compared to Applitools, Percy is roughly 30-50% cheaper for equivalent snapshot volumes. The trade-off is the simpler feature set.

---

## CI Integration

Percy integrates with all major CI providers via the CLI.

\`\`\`yaml
# .github/workflows/test.yml
name: Tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: percy exec -- npx playwright test
        env:
          PERCY_TOKEN: \${{ secrets.PERCY_TOKEN }}
\`\`\`

Percy reports a status check on the PR. The check fails until snapshots are reviewed.

---

## BrowserStack Integration

Percy and BrowserStack integrate via the BrowserStack Test Observability product. Visual diffs appear alongside test failures, latency, and other observability data.

For teams on BrowserStack, this gives a unified dashboard for traditional and visual testing. The integration is free for BrowserStack customers.

---

## Comparison to Alternatives

| Tool | Simplicity | Cross-Browser | Visual AI | Storybook | Pricing |
| --- | --- | --- | --- | --- | --- |
| Percy | High | Good | Basic | Excellent | Moderate |
| Applitools | Medium | Best | Best | Yes | Higher |
| Chromatic | High | Limited | Basic | Excellent | Lower |
| BackstopJS | Medium | Limited | None | No | Free |

Percy occupies the middle ground: simpler than Applitools, more featureful than Chromatic, more reliable than open-source BackstopJS.

---

## When to Choose Percy

Choose Percy if:

You want straightforward visual regression testing.

You already use BrowserStack.

Your needs are basic to intermediate (no advanced AI categorization).

You value simplicity over feature depth.

Avoid Percy if:

You need advanced visual AI (Applitools is better).

Your visual testing is Storybook-only (Chromatic is cheaper).

You need self-healing locators (Applitools, Mabl, Functionize).

---

## Setup Checklist

Sign up at percy.io and get a token.

Install the Percy CLI and SDK for your framework.

Add a percySnapshot call to one existing test.

Run percy exec to verify the snapshot uploads.

Inspect the first baseline in the Percy dashboard.

Add more snapshots to other tests.

Configure widths in percy.yml.

Add ignore regions for dynamic content.

Integrate into CI.

Set up review notifications.

---

## Common Patterns

Pattern 1: critical pages. Snapshot the 10-20 most important pages.

Pattern 2: design system. Use Percy + Storybook to catch component regressions.

Pattern 3: responsive coverage. Snapshot every page at 3-4 widths.

Pattern 4: pre-deploy gate. Block deploys on unreviewed snapshots.

---

## Common Pitfalls

Forgetting percy exec. Snapshots are not collected without the wrapper.

Over-snapshotting. Every snapshot costs money. Be selective.

Dynamic content noise. Without ignore regions, dynamic content causes false positives.

Skipping review. Auto-approving silently moves baselines. Always review.

Mismatched browsers. Percy renders in its cloud, not your local browser. Local rendering may differ.

---

## Migrating from Other Tools

From Applitools: SDK calls are similar. Rename percy() to eyes.check(). Configuration differs.

From Chromatic: Chromatic is Storybook-only. Percy's Storybook integration is similar but Percy also covers E2E.

From BackstopJS: BackstopJS is open source and self-managed. Percy is hosted. Plan a month to migrate baselines.

---

## Further Resources

- Percy documentation at docs.percy.io.
- BrowserStack ecosystem integrations.
- Browse visual testing skills at /skills.
- Compare visual tools at /blog.

---

## Conclusion

Percy is the simple, reliable visual testing platform. For teams that need visual regression without the complexity of full visual AI, Percy is the right choice. The Storybook integration is best in class; the responsive testing is straightforward; the BrowserStack ecosystem adds value. Set up takes hours, not days. Browse [/skills](/skills) for related tools and the [/blog](/blog) for deeper guides.
`,
};
