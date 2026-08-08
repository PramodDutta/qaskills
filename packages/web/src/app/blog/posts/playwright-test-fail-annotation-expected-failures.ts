import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Test Fail Annotation for Expected Failures That Stay Honest',
  description: 'Use playwright test fail annotation expected failures so known bugs stay visible, unexpectedly fixed behavior fails the build, and quarantine never becomes silent skip.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Playwright Test Fail Annotation for Expected Failures That Stay Honest

A Playwright test fail annotation for expected failures is \`test.fail()\`, optionally with a condition and description. Playwright still runs the test. If the body fails, the outcome is treated as expected and the overall run can stay green for that case. If the body passes, Playwright reports an unexpected pass and fails the test result. That inversion is the entire point: you document a known broken path without turning the check into a permanent skip that never re-evaluates product reality.

Expected failures are not the same as soft assertions, retries, or quarantines that hide results. Soft assertions keep collecting failures inside one test. Retries re-run flaky work. A skip removes the check. \`test.fail\` keeps the check alive as a living contract that the defect still exists. The moment the product is fixed, or the moment your locator or data setup starts masking the bug, the suite complains by reporting an unexpected success.

This guide treats playwright test fail annotation expected failures as an operational workflow for QA and test-automation engineers who ship with AI coding agents. You will map the pass/fail matrix, attach triage metadata, set CI budgets, diagnose the classic "unexpectedly passed after a silent fix" failure mode, and remove annotations before they rot into institutional debt. Official annotation docs live at https://playwright.dev/docs/test-annotations. For how Playwright sits among other runners, see the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). When a "fixed" expected failure was really a bad selector, use the [Playwright locator best practices](/blog/playwright-best-practices-locators-2026).

## Map the four outcomes of an annotated fail test

Before you sprinkle \`test.fail\` through a suite, internalize the outcome table. Teams that treat "annotated fail" as "ignore" will misread dashboards and ship regressions.

| Annotation state | Test body result | Playwright outcome | What it means operationally |
|---|---|---|---|
| No \`test.fail\` | Pass | Pass | Behavior matches expectation |
| No \`test.fail\` | Fail | Fail | Regression or flake |
| \`test.fail\` active | Fail | Expected failure (treated as ok for that expectation) | Known defect still reproduces |
| \`test.fail\` active | Pass | Unexpected pass (failure of the fail expectation) | Bug fixed, annotation stale, or test no longer exercises the bug |

Playwright documents \`test.fail()\` as marking a test that should fail: the runner executes it and verifies that it does fail. If it does not fail, Playwright complains. That complaint is your signal to either delete the annotation and keep the test as a normal regression guard, or fix the test if it stopped covering the defect.

There is also a focused form, \`test.fail.only\`, documented for debugging a single expected-failure case while excluding the rest of the suite. Use it locally when you are validating that a ticket still reproduces. Do not leave \`.only\` in shared branches; CI should run the full fail-annotated set so budget and drift stay visible.

## Choose fail over skip when the bug must keep reproducing

The most common process mistake is using \`test.skip\` for a product defect because "CI is red and we need to ship." Skip freezes the last known truth into absence. Nobody re-runs the scenario. Product managers believe the risk is managed. Six months later the bug is still open, or worse, it was fixed two releases ago and nobody removed the skip because nothing forced a re-check.

Use this decision table when a test turns red for a known reason:

| Situation | Prefer | Why |
|---|---|---|
| Confirmed product bug with a ticket | \`test.fail\` + issue annotation | Keeps reproduction live; unexpected fix is detected |
| Environment missing a feature flag in this pipeline | Conditional \`test.fail\` or conditional skip with explicit reason | Avoids lying about product quality on envs that never run the path |
| Test is wrong or data is corrupt | Fix the test; do not annotate | Annotation would encode a false product claim |
| Flake with no clear root cause yet | Stabilize first; short quarantine with owner and expiry | Fail annotation is for deterministic known fails, not noise |
| External dependency down in CI | Skip or isolate with a health gate | Expected fail on infra outage creates misleading "bug still present" signal |

A practical rule: if you would tell a human "this should fail until ticket X closes," use \`test.fail\`. If you would tell a human "do not run this here," use skip or project filtering. If you cannot explain the difference in one sentence, you are not ready to annotate.

## Write the minimal fail annotation that still tells the truth

Start with the body-level call when the entire scenario is the known failure:

\`\`\`ts
// tests/billing/invoice-pdf.spec.ts
import { test, expect } from '@playwright/test';

test('invoice PDF download includes line items', async ({ page }) => {
  // Known defect: PDF export drops line items for multi-currency invoices.
  // https://tracker.example.com/issues/BILL-4421
  test.fail(true, 'BILL-4421: multi-currency invoice PDF omits line items');

  await page.goto('/invoices/9001');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();

  // Assertion that currently fails on the defect:
  const text = await extractPdfText(path!);
  expect(text).toMatch(/Line item/i);
  expect(text).toMatch(/EUR|USD/);
});

async function extractPdfText(filePath: string): Promise<string> {
  // Use your real PDF text extractor in the project.
  // Placeholder keeps the example focused on the fail annotation.
  const { readFile } = await import('node:fs/promises');
  const bytes = await readFile(filePath);
  return bytes.toString('latin1');
}
\`\`\`

Notes that matter for AI agents generating tests:

1. Put the ticket id in the description string, not only in a comment. Comments do not appear in reports the same way annotation reasons do.
2. Keep assertions that actually fail for the defect. An expected-failure test that fails in setup before the product assertion is weak evidence.
3. Prefer one clear failing expectation over a long chain of soft failures. Soft assertions and fail annotations solve different problems.

You can also mark at declaration time with details. Playwright supports test details including annotations for issue tracking:

\`\`\`ts
import { test, expect } from '@playwright/test';

test(
  'checkout blocks reused gift cards',
  {
    annotation: [
      { type: 'issue', description: 'https://tracker.example.com/issues/PAY-118' },
      { type: 'expected-failure', description: 'Gift card reuse still allowed after refund' },
    ],
  },
  async ({ page }) => {
    test.fail();

    await page.goto('/checkout');
    await page.getByLabel('Gift card code').fill('GIFT-REUSE-1');
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page.getByRole('alert')).toContainText(/already redeemed|cannot be reused/i);
  },
);
\`\`\`

The \`annotation\` array is metadata for humans and report tooling. \`test.fail()\` is the status inverter. Use both when you want triage systems and CI dashboards to agree on ownership.

## Use conditional fail for browser, flag, or tenant-specific defects

Not every defect reproduces everywhere. Conditional fail is the documented pattern for "this should fail only when condition is true."

\`\`\`ts
import { test, expect } from '@playwright/test';

test('Safari keeps session after password change', async ({ page, browserName }) => {
  test.fail(
    browserName === 'webkit',
    'AUTH-77: WebKit loses session cookie after password change',
  );

  await page.goto('/account/security');
  await page.getByLabel('Current password').fill(process.env.E2E_USER_PASSWORD!);
  await page.getByLabel('New password').fill(process.env.E2E_USER_PASSWORD_NEW!);
  await page.getByLabel('Confirm new password').fill(process.env.E2E_USER_PASSWORD_NEW!);
  await page.getByRole('button', { name: 'Update password' }).click();

  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
});
\`\`\`

Conditional fail is also useful for feature-flag matrices:

\`\`\`ts
import { test, expect } from '@playwright/test';

const newCheckout = process.env.FEATURE_CHECKOUT_V2 === '1';

test('express pay shows Apple Pay when eligible', async ({ page }) => {
  test.fail(
    newCheckout,
    'CHK-903: checkout v2 hides Apple Pay wallet button on eligible devices',
  );

  await page.goto('/checkout');
  await expect(page.getByRole('button', { name: 'Apple Pay' })).toBeVisible();
});
\`\`\`

What people get wrong here: they copy a conditional fail, then change CI so the condition is never true, and believe the bug is monitored. The annotation becomes dead code. Pair every conditional with a CI job that still exercises the true branch on a schedule, or the condition is theater.

## Attach structured annotations so reports are searchable

Playwright lets you push annotations during the test through \`test.info()\`. That is useful when the fail decision depends on runtime discovery, or when you want multiple tags for owners, severity, and expiry.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('admin can revoke API tokens', async ({ page }) => {
  const info = test.info();
  info.annotations.push(
    { type: 'owner', description: 'platform-auth' },
    { type: 'severity', description: 'high' },
    { type: 'expires', description: '2026-09-15' },
    { type: 'issue', description: 'https://tracker.example.com/issues/AUTH-201' },
  );

  test.fail(true, 'AUTH-201: revoke button returns 500 for OAuth tokens');

  await page.goto('/admin/api-tokens');
  await page.getByRole('row', { name: /ci-bot/i }).getByRole('button', { name: 'Revoke' }).click();
  await expect(page.getByRole('status')).toHaveText(/revoked/i);
});
\`\`\`

A small report post-processor can fail the pipeline if any expected-failure annotation is past its \`expires\` date. That is a process control Playwright does not ship for you, but the annotation channel gives you the data.

Illustrative Node script for CI (adjust paths to your report format):

\`\`\`ts
// scripts/check-expected-failure-budget.ts
import { readFileSync } from 'node:fs';

type Annotation = { type: string; description?: string };
type Spec = {
  tests?: Array<{
    title: string;
    outcome?: string;
    annotations?: Annotation[];
  }>;
};

const report = JSON.parse(readFileSync('playwright-report/report.json', 'utf8')) as {
  suites?: Array<{ specs?: Spec[] }>;
};

const today = new Date().toISOString().slice(0, 10);
const expired: string[] = [];
let expectedFailCount = 0;

for (const suite of report.suites ?? []) {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const annotations = t.annotations ?? [];
      const hasFail = annotations.some(
        (a) => a.type === 'expected-failure' || /fail/i.test(a.type),
      );
      if (hasFail) expectedFailCount += 1;
      const exp = annotations.find((a) => a.type === 'expires')?.description;
      if (exp && exp < today) expired.push(\`\${t.title} expired \${exp}\`);
    }
  }
}

const maxBudget = Number(process.env.MAX_EXPECTED_FAILURES ?? '25');
if (expectedFailCount > maxBudget) {
  console.error(\`Expected-failure count \${expectedFailCount} exceeds budget \${maxBudget}\`);
  process.exit(1);
}
if (expired.length) {
  console.error('Expired expected failures:\\n' + expired.join('\\n'));
  process.exit(1);
}
console.log(\`Expected failures: \${expectedFailCount} (budget \${maxBudget})\`);
\`\`\`

Wire the script after \`npx playwright test\` once you confirm your JSON report shape. Treat the budget number as illustrative policy, not a universal standard.

## Build a ticket-to-removal lifecycle for expected failures

Annotations without lifecycle become permanent grey debt. Use a linear workflow:

1. **Reproduce on main** with a minimal test that fails for the product reason.
2. **Open or link a ticket** with severity, owner, and customer impact.
3. **Annotate with \`test.fail\`** plus issue URL and optional expiry.
4. **Land the annotation in a PR** that does not mix unrelated refactors.
5. **Watch for unexpected pass** in CI after related product PRs merge.
6. **Remove the annotation** in the same change that verifies the green path, or in a follow-up that only deletes the annotation and asserts pass.
7. **Never re-annotate** the same ticket without changing the reproduction story.

A removal PR should look boring:

\`\`\`ts
// before
test('admin can revoke API tokens', async ({ page }) => {
  test.fail(true, 'AUTH-201: revoke button returns 500 for OAuth tokens');
  // ...
});

// after product fix lands
test('admin can revoke API tokens', async ({ page }) => {
  await page.goto('/admin/api-tokens');
  await page.getByRole('row', { name: /ci-bot/i }).getByRole('button', { name: 'Revoke' }).click();
  await expect(page.getByRole('status')).toHaveText(/revoked/i);
});
\`\`\`

If the unexpected pass appears before the product PR is intentional, investigate immediately. You may have changed fixtures, seed data, or locators so the test no longer reaches the broken path.

## Diagnose the realistic failure mode: unexpected pass after a silent fix

**Symptom:** CI fails with an unexpected pass on a test marked \`test.fail\`. Engineers who only skim "failed" in the log often re-mark the test or force green incorrectly.

**Diagnosis steps:**

1. Read the Playwright error carefully. Unexpected pass means the body succeeded while the fail annotation demanded failure.
2. Diff the last green expected-failure run against the current commit: product code, feature flags, seed data, and the test itself.
3. Run the test locally without the annotation to confirm it is a true pass, not a flake that happened to pass once.
4. Check whether a partial fix made the assertion pass while the real bug still exists on a different path (for example, multi-currency still broken for JPY while EUR works).
5. If product is fixed, remove \`test.fail\` and keep the test. If product is not fixed, restore a faithful reproduction: better seed data, stricter assertion, or a second case.

**Illustrative timeline (numbers are examples, not industry stats):**

| Day | Event | Suite signal |
|---|---|---|
| Day 0 | BILL-4421 annotated with \`test.fail\` | Expected failure, pipeline green |
| Day 12 | Engineer hardens PDF text extraction | Still expected failure |
| Day 18 | Product ships line-item fix for multi-currency | Unexpected pass, pipeline red |
| Day 18 | QA removes annotation in a 3-line PR | Normal pass, pipeline green |

The red day is success, not noise. Teams that "fix" unexpected passes by deleting the test throw away free regression coverage.

## Separate expected product failure from setup and locator failure

An expected-failure annotation is only honest if the failure mode matches the ticket. If the test dies on a missing login button because the staging deploy is broken, you have not verified BILL-4421. You verified infra.

Protect setup with explicit preconditions outside the annotated expectation when practical:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('refunds appear on the ledger within one refresh', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_FINANCE_USER!);
  await page.getByLabel('Password').fill(process.env.E2E_FINANCE_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation')).toBeVisible();

  test.fail(true, 'FIN-55: refund rows missing until hard reload');

  await page.goto('/ledger?account=ac_100');
  await page.getByRole('button', { name: 'Issue refund' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByRole('row', { name: /refund/i })).toBeVisible();
});
\`\`\`

If login fails, the test fails for a real environment reason without pretending FIN-55 reproduced. If you need the entire test including setup to be the expected failure, document that the defect is "cannot reach ledger," not a subtler UI bug.

Locator quality is a frequent false friend. A loose locator that matches a static heading can "pass" after a redesign even though the refund row is still missing. That is why locator hygiene and expected-failure honesty are linked. Prefer role and name contracts, and avoid silent \`.first()\` when strict mode should catch ambiguity.

## Compare fail annotations with related Playwright controls

Engineers often stack tools until the suite becomes unreadable. Keep the mental model tight:

| Tool | Primary job | Still executes test? | Good with known product bugs? |
|---|---|---|---|
| \`test.fail\` | Invert pass/fail for known broken behavior | Yes | Yes, when deterministic |
| \`test.skip\` / \`test.fixme\` | Omit execution under a condition | No (when skipped) | Only when running is impossible or harmful |
| \`test.only\` | Temporarily focus while debugging | Only focused tests | Local debugging only |
| Soft assertions | Collect multiple assertion failures | Yes | Complementary, not a substitute |
| Retries | Absorb intermittent infrastructure flakes | Yes, multiple times | Bad mask for deterministic product bugs |
| \`test.step\` | Structure reports | Yes | Always fine for readability |

Retries on a \`test.fail\` case can make reports harder to read if the failure is deterministic: you pay for multiple identical failures. Prefer retries for known infra flakes, not for annotated product defects.

## Set CI policy so expected failures cannot grow without limit

Without policy, every red PR becomes an annotation. Codify:

1. **Budget:** maximum number of expected-failure tests per repo or package (illustrative: 25 for a mid-size app suite).
2. **Age:** every annotation has an owner and expiry; CI fails on expired entries.
3. **Severity gate:** critical path tests may not use \`test.fail\` without staff engineer approval.
4. **Diff visibility:** PRs that add \`test.fail\` must include the ticket link in the description.
5. **No batch quarantine:** forbid a single PR that annotates dozens of failures without individual tickets.

Example GitHub Actions job fragment (names are conventional, adjust to your workflow):

\`\`\`yaml
# .github/workflows/e2e.yml
name: e2e
on:
  pull_request:
  push:
    branches: [main]

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - name: Enforce expected-failure budget
        if: always()
        run: npx tsx scripts/check-expected-failure-budget.ts
        env:
          MAX_EXPECTED_FAILURES: '25'
\`\`\`

If you generate HTML and JSON reports, upload them as artifacts so unexpected-pass debugging does not require re-running the entire suite.

## Guide AI coding agents so they do not misuse fail annotations

AI agents are quick to silence red tests. Give them explicit repository rules:

\`\`\`markdown
## Expected failures (Playwright)

- Prefer fixing the product or the test over annotations.
- If a known product bug blocks a PR, use test.fail(true, "TICKET: reason") plus an issue annotation.
- Never use test.fail for flakes. Stabilize or isolate instead.
- Never add test.fail without a ticket id in the description.
- When a test with test.fail starts passing, remove the annotation; do not delete the test.
- Do not wrap entire files in test.fail at describe level unless every child shares the same defect.
\`\`\`

Ready-made QA skills install from qaskills.sh with the qaskills CLI when you want reusable agent instructions for Playwright triage instead of reinventing house rules in every repo.

A review checklist for agent-authored PRs:

| Check | Reject if |
|---|---|
| Ticket id present | Description is "temporary" or empty |
| Reproduction is specific | Annotation added on a broad smoke test with many reasons to fail |
| No \`.only\` left behind | Focused debugging helpers remain |
| Locator is user-facing | Brittle CSS selected to force a particular fail/pass |
| Expiry set for long-lived bugs | Open-ended quarantine without owner |

## Pattern library: describe-level and project-level strategies

Sometimes a whole area is broken, such as a redesign branch of admin. You can annotate each test, or use a shared helper:

\`\`\`ts
// tests/support/expectedFailure.ts
import { test } from '@playwright/test';

export function expectFailure(ticket: string, reason: string): void {
  test.info().annotations.push(
    { type: 'issue', description: ticket },
    { type: 'expected-failure', description: reason },
  );
  test.fail(true, \`\${ticket}: \${reason}\`);
}
\`\`\`

\`\`\`ts
// tests/admin/redesign.spec.ts
import { test, expect } from '@playwright/test';
import { expectFailure } from '../support/expectedFailure';

test.describe('admin redesign billing tab', () => {
  test('shows open invoices', async ({ page }) => {
    expectFailure('ADM-12', 'billing tab blank after redesign');
    await page.goto('/admin/billing');
    await expect(page.getByRole('table', { name: 'Open invoices' })).toBeVisible();
  });

  test('exports CSV', async ({ page }) => {
    expectFailure('ADM-12', 'billing tab blank after redesign');
    await page.goto('/admin/billing');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    await expect(page.getByRole('status')).toContainText(/export started/i);
  });
});
\`\`\`

If the entire project should not gate merge, a better tool is a separate Playwright project with a non-required CI check, not a blanket fail annotation. Required checks belong to green paths. Exploratory or known-broken redesign suites can report without blocking \`main\`.

## What people get wrong: treating fail as a quieter skip

Three anti-patterns show up repeatedly:

1. **Annotate and forget:** no ticket, no owner, no expiry. Six months later nobody knows if the product still fails.
2. **Annotate flaky tests:** intermittent pass/fail under \`test.fail\` produces chaotic reports (sometimes expected fail, sometimes unexpected pass). Fix flake sources: waits, shared state, locators.
3. **Assert nothing meaningful:** the test fails on a timeout waiting for a spinner that always appears, not on the business assertion. The annotation then claims the wrong defect is monitored.

Correct the third with a hard precondition and a single business assertion that matches the ticket title. If you cannot write that assertion, you do not yet understand the bug well enough to annotate it.

## Keep expected failures visible in human rituals

Technical controls fail without social visibility:

- Weekly QA review lists all open expected-failure tickets with age.
- Sprint planning includes "annotation removal" as real work when product fixes land.
- Release notes mention customer-visible defects that remain annotated.
- On-call does not page for expected failures, but dashboards still show them as technical debt count, not as zero failures.

Illustrative dashboard query idea: count tests whose latest result is expected failure, group by annotation owner. The absolute count matters less than the trend. A rising slope means the team is using annotations as a merge lubricant.

## End-to-end example: from red CI to honest green

Suppose \`checkout.spec.ts\` fails on main after a payments deploy.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('card decline shows inline error', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByLabel('Card number').fill('4000000000000002');
  await page.getByLabel('Expiry').fill('12/30');
  await page.getByLabel('CVC').fill('123');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByRole('alert')).toHaveText(/card was declined/i);
});
\`\`\`

Investigation shows the API now returns a generic 500 for that test PAN. Product opens PAY-880. Until fixed, annotate:

\`\`\`ts
test('card decline shows inline error', async ({ page }) => {
  test.fail(true, 'PAY-880: decline path returns 500 instead of structured error');
  test.info().annotations.push({
    type: 'issue',
    description: 'https://tracker.example.com/issues/PAY-880',
  });

  await page.goto('/checkout');
  await page.getByLabel('Card number').fill('4000000000000002');
  await page.getByLabel('Expiry').fill('12/30');
  await page.getByLabel('CVC').fill('123');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByRole('alert')).toHaveText(/card was declined/i);
});
\`\`\`

When PAY-880 merges, CI fails with unexpected pass. The follow-up commit removes \`test.fail\` and the issue annotation. The test remains as regression coverage. No skip was ever introduced. No green-by-deletion occurred.

## FAQ-oriented operational notes before the formal FAQ

Reporter confusion is normal the first week you adopt expected failures. Teach the team that "green with expected failures" still means debt exists. HTML reports should be opened when counts move. Agents should be forbidden from bulk-adding \`test.fail\` in autofix loops. If your organization needs zero expected failures on release branches, enforce that with a branch-specific budget of zero while allowing a small budget on integration branches.

Also remember that annotations do not replace contract tests, unit tests, or monitoring. They are a surgical tool for known, ticketed, still-reproducing gaps in end-to-end coverage.

## Frequently Asked Questions

### When should I use test.fail instead of test.skip for a broken feature?

Use \`test.fail\` when the scenario can still run and should keep proving that the product defect exists. Use skip when execution is impossible or unsafe in that environment, such as a missing credential, an unavailable third-party sandbox, or a browser that cannot load the page at all. Skip stops learning. Fail keeps a living reproduction. If the only goal is to merge while ignoring quality, neither annotation is appropriate: fix the product or isolate the work on a branch with explicit non-required checks.

### Why did CI fail when my expected failure started passing?

Because Playwright treats an unexpected pass as an error for fail-annotated tests. That is intentional. It means the product may be fixed, the test may no longer hit the broken path, or a flake produced a one-off success. Run the test locally without the annotation, compare recent product changes, and either remove \`test.fail\` after confirming a real fix or restore a faithful reproduction if the bug remains. Do not re-introduce skip to silence the signal.

### Can I mark an entire describe block as expected to fail?

You can call \`test.fail\` inside a \`beforeEach\` or use helpers so each child inherits the annotation, but only when every test shares the same defect story. Mixed suites become misleading: a fixed child will unexpected-pass while a still-broken sibling expected-fails, and the shared annotation text will lie about at least one case. Prefer per-test annotations with precise ticket text. For large broken areas, a separate Playwright project with a non-blocking CI job is often cleaner than blanket fail annotations.

### How do AI coding agents typically misuse fail annotations?

Agents often add \`test.fail\` to clear red builds without tickets, use it on flaky tests, leave \`.only\` behind after debugging, or delete tests that unexpected-pass instead of removing the annotation. Prevent that with repository rules: require ticket ids, ban fail-for-flake, enforce expected-failure budgets in CI, and review agent PRs for annotation diffs specifically. Teach agents that unexpected pass is a cleanup task, not a license to remove coverage. Pair those rules with solid locator practices so "passes" reflect real product behavior.
`,
};
