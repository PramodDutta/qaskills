import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'IBM Equal Access Accessibility Checker: Automated a11y Testing Guide',
  description: 'Equal Access Accessibility Checker guide for QA teams: configure scans, add CI gates, use baselines, and triage a11y failures with confidence.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# IBM Equal Access Accessibility Checker: Automated a11y Testing Guide

IBM Equal Access Accessibility Checker is active, not renamed, and not discontinued. I verified the Node package \`accessibility-checker\` at version \`4.0.34\`, published in September 2026, and the IBM repository shows recent release automation for the same version. The tool family includes browser extensions, a Node package, a Cypress wrapper, a Java checker, an accessibility rules engine, and published IBM rule-set documentation.

For QA engineers, the payoff is straightforward: use the equal access accessibility checker for deterministic accessibility scans inside tests, then keep manual accessibility work for keyboard journeys, screen reader behavior, UX intent, and criteria that automation cannot prove. It is a strong fit for teams that already run Playwright, Puppeteer, Selenium, Cypress, or URL-based smoke tests in CI.

The first decision is scope. Do not wire the checker into every end-to-end test and call the suite accessible. Instead, build a small accessibility contract around stable pages and critical states: unauthenticated marketing routes, logged-in dashboard shells, modal dialogs, form errors, navigation menus, and data tables. Use the checker as a gate for regressions, then pair it with deeper workflows from [accessibility testing automation](/blog/accessibility-testing-automation-guide) and focused CLI scans like [Pa11y accessibility testing](/blog/pa11y-accessibility-testing-guide-2026) when you need a second engine or broader URL coverage.

## Verified Project Snapshot

| Area | Verified status on 2026-09-28 | What QA teams should do |
| --- | --- | --- |
| Node package | \`accessibility-checker\` is active at \`4.0.34\` on npm | Pin the package in a lockfile and review release notes before broad upgrades |
| Repository | \`IBMa/equal-access\` has recent \`main-4.x\` activity and release jobs | Treat it as maintained, but still pin dependencies in CI |
| Runtime | Repository build requirements list Node 22 | Run scanner jobs on Node 22 or newer, matching your app test runner where possible |
| Browser tooling | Node docs name Selenium, Puppeteer, and Playwright page objects | Prefer the driver you already use for user-state setup |
| Cypress | \`cypress-accessibility-checker\` wraps the Node package | Use it for Cypress suites, but verify plugin compatibility with your Cypress major |
| Rules | Default policy is \`IBM_Accessibility\`; \`npx achecker archives\` lists archives and policies | Pin \`ruleArchive: versioned\` when audit repeatability matters |

The practical implication is that IBM Equal Access can sit at three levels. A browser extension is useful while debugging a single page. The Node package is useful for Playwright, Puppeteer, Selenium, URL, file, and HTML-string scans. The Cypress package is useful when your existing Cypress tests already navigate the state that needs a scan. Do not mix all three in one pipeline unless you have a reason. One well-owned CI gate beats three noisy scans that nobody triages.

## Choose the Integration Surface

| Integration | Best use | Watch out for |
| --- | --- | --- |
| Browser extension | Exploratory checks during story review or bug reproduction | Results are easy to forget unless you copy them into a ticket |
| \`npx achecker\` | Batch URL, file, or directory scans with minimal test code | It may instantiate Puppeteer, so CI browser dependencies still matter |
| Playwright or Puppeteer API | Scan authenticated pages, component states, modals, and SPA routes | Always close the checker engine after scans finish |
| Selenium API | Enterprise suites already built around WebDriver | Use a unique label per scan so baseline matching is predictable |
| Cypress wrapper | Cypress teams that want scans inside existing command chains | Keep accessibility checks away from highly dynamic tests unless baselined |

The mistake people make is treating accessibility scans like visual snapshots: run everywhere, approve once, forget. Equal Access baselines compare results by rule and XPath. That is useful, but it can also hide an issue that moved to a different element or changed because the DOM was refactored. The baseline should be a temporary contract for known exceptions, not a permanent excuse file.

## Install the Node Checker

Use the Node package when you want one integration that works across test runners. The official install command is short:

\`\`\`bash
npm install --save-dev accessibility-checker
npx achecker --version
npx achecker archives
\`\`\`

For CI, the first command belongs in normal dependency installation. The second command gives you a quick sanity check that the binary is on the path. The third command matters because policy and archive names are not guesses. If an AI coding agent proposes a policy string, make it prove the string appears in \`npx achecker archives\` or in your already approved config.

If your project uses ES modules, the IBM docs call out a separate \`aceconfig.mjs\` option because Node cannot load a CommonJS \`aceconfig.js\` from an ESM package. That is a small detail, but it is exactly the detail that breaks a CI job after a repo switches \`"type": "module"\`.

## Configure .achecker.yml For CI

The default configuration uses the latest archive, the \`IBM_Accessibility\` policy, and default report behavior. That is fine for a first scan. For CI, write the intent down in \`.achecker.yml\` so the runner, local machine, and agent all use the same thresholds.

\`\`\`yaml
ruleArchive: versioned
policies:
  - IBM_Accessibility
failLevels:
  - violation
  - potentialviolation
reportLevels:
  - violation
  - potentialviolation
  - recommendation
  - potentialrecommendation
  - manual
outputFormat:
  - json
  - html
outputFolder: results/accessibility
outputFilenameTimestamp: false
baselineFolder: test/accessibility/baselines
cacheFolder: .cache/accessibility-checker
puppeteerArgs:
  - --no-sandbox
  - --disable-setuid-sandbox
\`\`\`

\`ruleArchive: latest\` gives you the newest rules. That is useful for exploratory work and scheduled drift checks. \`ruleArchive: versioned\` uses the rule release aligned with the tool version, which makes CI less surprising. A team that owns regulated reports should prefer repeatability in pull requests, then run a separate scheduled job against the latest archive to discover new rule coverage.

\`failLevels\` and \`reportLevels\` solve different problems. \`reportLevels\` controls what appears in the output. \`failLevels\` controls whether \`assertCompliance\` returns a failure. Do not hide manual and recommendation findings from reports just because they should not block the build. QA leads need that data for backlog planning.

## Scan From Playwright Without Losing State

A strong Playwright pattern is to navigate and assert page readiness before invoking the checker. That prevents scans against loading skeletons, empty placeholders, or modals that have not opened yet.

\`\`\`javascript
const { test, expect } = require('@playwright/test');
const aChecker = require('accessibility-checker');

test.afterAll(async () => {
  await aChecker.close();
});

test('settings page has no blocking IBM Equal Access findings', async ({ page }) => {
  await page.goto('http://localhost:3000/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeEnabled();

  const result = await aChecker.getCompliance(page, 'settings/default');
  const code = aChecker.assertCompliance(result.report);

  if (code !== 0) {
    console.log(aChecker.stringifyResults(result.report));
  }

  expect(code).toBe(0);
});
\`\`\`

Two details are doing real work here. The heading and button assertions prove the app is in the intended state before scanning. The \`afterAll\` hook closes the engine, which IBM documents as important for proper report output and cleanup. If you scatter one-off scans without closing the engine, you can get missing reports or slow worker shutdown.

For agent-written tests, make the label scheme explicit. A good label like \`settings/default\`, \`checkout/payment-error\`, or \`admin/users-table\` survives refactors. A label like \`test 1\` makes baselines and report folders hard to trust.

## Use Cypress When Cypress Owns The Journey

The Cypress wrapper adds commands that map to the Node API. The typical flow is \`cy.getCompliance(label).assertCompliance()\`. Register the plugin in the Cypress node events setup and import the support command once.

\`\`\`javascript
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on) {
      on('task', {
        accessibilityChecker: require('cypress-accessibility-checker/plugin'),
      });
    },
  },
});
\`\`\`

\`\`\`javascript
import 'cypress-accessibility-checker';
// cy.findByRole comes from Cypress Testing Library: npm install --save-dev @testing-library/cypress
import '@testing-library/cypress/add-commands';

describe('billing accessibility', () => {
  it('checks the declined-card error state', () => {
    cy.visit('/billing');
    cy.findByRole('button', { name: 'Update payment method' }).click();
    cy.findByLabelText('Card number').type('4000000000000002');
    cy.findByRole('button', { name: 'Save card' }).click();
    cy.findByText('Your card was declined.').should('be.visible');

    cy.getCompliance('billing/declined-card').assertCompliance();
  });
});
\`\`\`

The Cypress example checks a failure state, not just a happy page load. That matters because many serious accessibility regressions appear only after validation errors, loading failures, disabled actions, toast messages, and focus moves. A checkout screen can pass on first render and still fail when the error summary is not announced or a modal traps keyboard users.

## Baselines Without Normalizing Failure

Baselines are valuable when a known accessibility issue cannot be fixed in the same sprint. IBM documents that \`assertCompliance\` compares matching baseline results by XPath and rule ID; without a baseline, it evaluates the configured \`failLevels\`.

Use baselines for known, ticketed exceptions. Do not use them to get the first pipeline green.

| Baseline situation | Good response | Risky response |
| --- | --- | --- |
| Third-party widget has a known violation | Baseline one route, link to the vendor ticket, add expiry review | Baseline every page that imports the widget |
| Large legacy app introduces a first gate | Start with report-only, then gate changed routes | Generate baselines for the entire app and never revisit |
| Dynamic table creates unstable XPath | Add stable markup and reduce scan scope | Accept repeated baseline churn |
| Rule archive update changes output | Run scheduled latest-archive job, then plan fixes | Change \`failLevels\` to ignore the new category |

A useful baseline review includes three questions. Is the finding still present? Is the affected flow still important? Is the original owner still accountable? If any answer is unknown, the baseline has become debt rather than documentation.

## GitHub Actions Pipeline

This workflow runs app tests, preserves the reports, and uses current GitHub Actions majors supplied for this environment. It assumes your npm scripts start the app and run Playwright accessibility specs.

\`\`\`yaml
name: accessibility

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  equal-access:
    runs-on: ubuntu-24.04
    steps:
      - name: Check out code
        uses: actions/checkout@v7

      - name: Set up Node
        uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run IBM Equal Access tests
        run: npm run test:a11y

      - name: Upload accessibility reports
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: equal-access-reports-\${{ github.run_id }}
          path: results/accessibility
          if-no-files-found: warn
\`\`\`

For pull requests, fail on \`violation\` and \`potentialviolation\` after the team has burned down the first wave. During adoption, run the same job with \`continue-on-error: true\` or a report-only script for a week, but publish the report every time. The habit you want is not "green at all costs." It is "new accessibility debt is visible immediately."

## Multi-Page CLI Scans

The \`npx achecker\` CLI can scan paths from a text file. Use that when the state does not require complex authentication or when you can seed a static preview.

\`\`\`text
http://localhost:3000/
http://localhost:3000/pricing
http://localhost:3000/docs/getting-started
./storybook-static/button-primary.html
\`\`\`

\`\`\`bash
npm run build
npm run preview
npx achecker ./a11y-targets.txt
\`\`\`

This is intentionally boring. It catches broken language attributes, missing image alternatives, invalid ARIA, landmark mistakes, contrast issues that the engine can detect, and recurring template defects. It will not prove a whole product is accessible. That is fine. A fast smoke scan earns its keep by catching regression classes before they reach manual audit.

## Diagnose A Real Failure Mode

A common CI failure looks like this: local Playwright accessibility tests pass, but GitHub Actions fails with a content security policy error while loading the checker engine. IBM documents a known CSP issue where the engine script can be blocked when loaded from a CDN. The quick diagnosis is to open the browser console or saved Playwright trace and look for a refused script load tied to the accessibility checker engine.

Do not fix this by disabling CSP in tests unless your production app also disables it, which it should not. Prefer a test-specific configuration that points the rule server to the allowed IBM host, or run the scan against a page state where the checker can inject what it needs without relaxing unrelated security controls. If the failure happens only on CI, also compare headers from local preview and CI preview. Reverse proxies and preview servers often add stricter CSP than the developer server.

Another failure is much quieter: the scan passes because it ran too early. The report shows a tiny number of executed rules, few elements, and no meaningful findings. The fix is not to trust the pass. Add readiness assertions before the scan, and for SPA screens wait on user-visible landmarks rather than network idle. A page can stop making requests while still rendering empty tabs or delayed form controls.

## What People Get Wrong About Automated A11y

Automation is a detector, not a judge. Equal Access can flag rule violations and potential violations, but it cannot understand whether the product explanation makes sense, whether focus order matches the user task, whether an error recovery path is humane, or whether screen reader output is understandable in context. The experimental simulation API can help developers inspect announcements, but IBM labels it experimental, so do not build a permanent pass or fail policy around its exact output shape.

The second misconception is that one engine is enough. Different tools encode different rule sets and reporting styles. Equal Access is especially attractive in IBM-flavored compliance environments because it aligns with IBM Accessibility Requirements and \`IBM_Accessibility\` policy. Axe, Pa11y, Lighthouse, and manual audits still have roles. Your architecture should make it easy to add another checker without rewriting every test.

The third misconception is that AI coding agents can "fix accessibility" safely in bulk. Agents are helpful at adding labels, replacing invalid ARIA, and creating tests. They can also invent role names, overuse \`aria-label\`, remove visible text, or satisfy a scanner while hurting real users. When you ask Claude Code, Cursor, or Copilot to help, give it the failing rule, the DOM snippet, the expected user behavior, and a test that asserts the visible interaction still works.

## Operating Model For QA Leads

Make the equal access accessibility checker part of a review loop:

| Cadence | Owner | Output |
| --- | --- | --- |
| Every pull request | Feature QA or owning engineer | Gated scan for touched critical states |
| Nightly | QA automation | Latest archive report over stable URLs |
| Sprint review | QA lead and product owner | Baseline review and fix prioritization |
| Release candidate | Accessibility specialist if available | Manual keyboard and assistive technology pass |

If your team packages reusable automation routines, ready-made QA skills can install from qaskills.sh with the qaskills CLI. Treat those skills as starting points: review the generated \`.achecker.yml\`, labels, and CI thresholds before letting them block releases.

## Frequently Asked Questions

### Is IBM Equal Access Accessibility Checker still maintained?

Yes. I verified the \`accessibility-checker\` npm package at version \`4.0.34\` and saw recent release automation in the \`IBMa/equal-access\` repository for September 2026. The broader toolkit also remains linked from IBM's accessibility tools pages. Maintenance does not remove the need to pin versions. Accessibility rules change, dependencies change, and a green build can become noisy after an unplanned upgrade.

### Should I use \`ruleArchive: latest\` or \`ruleArchive: versioned\`?

Use \`versioned\` for pull-request gates when repeatability matters. It ties rule behavior to the tool version, which makes failures easier to reproduce. Use \`latest\` in a scheduled discovery job when you want to learn about new or changed rules before they block feature work. Teams under audit often run both: stable gates for development, current-rule reports for planning.

### Can the checker replace manual accessibility testing?

No. It can catch many machine-detectable issues, including invalid ARIA, missing text alternatives, language defects, contrast failures, and structural mistakes. It cannot fully validate keyboard strategy, screen reader comprehension, focus recovery, cognitive load, or whether a component is usable in the real task. Use it to remove obvious defects before manual testing starts.

### Why did my scan pass with almost no findings?

Check whether the page was actually ready. A scan against a loading shell, empty route, hidden modal, or unauthenticated redirect can pass while testing the wrong thing. Add visible assertions before \`getCompliance\`, use stable labels, and inspect the report summary for executed rule count and page URL. A tiny scan of a complex page is usually a setup bug.
`,
};
