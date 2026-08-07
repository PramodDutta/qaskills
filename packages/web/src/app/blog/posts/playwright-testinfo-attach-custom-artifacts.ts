import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright testInfo.attach Custom Artifacts: A Practical Debugging Guide',
  description: 'Learn playwright testinfo attach custom artifacts workflows that preserve traces, logs, API evidence, and AI-readable failure context for faster CI triage.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Playwright testInfo.attach Custom Artifacts: A Practical Debugging Guide

Playwright \`testInfo.attach\` custom artifacts are how you turn a failed test from a vague red line into a small evidence packet. The method lets a test add files or in-memory bodies to the report, with a content type that tells reporters and downstream tools what the artifact is. Screenshots, JSON payloads, API transcripts, feature flag snapshots, console logs, SQL seed manifests, accessibility scans, and model prompts can all become first-class test evidence instead of forgotten local files.

The payoff is practical: when a QA engineer or an AI coding agent opens the failure, the important context is already attached to the test that produced it. You do not have to reproduce the failure, search through CI logs, guess which user was used, or ask the agent to infer state from a stack trace. A disciplined artifact strategy makes Playwright failures easier to triage, easier to deduplicate, and easier to hand to an agent for repair.

This guide focuses on concrete, runnable Playwright patterns: attaching structured data, writing helper functions, keeping artifacts small, handling secrets, publishing attachments from CI, and diagnosing the common failure mode where an attachment exists locally but disappears from the report. For a broader framework comparison, pair this with [JavaScript Testing Frameworks Complete Guide 2026](/blog/javascript-testing-frameworks-complete-guide-2026). If the artifact points to a locator failure, use [Playwright Best Practices Locators 2026](/blog/playwright-best-practices-locators-2026) as the companion checklist for making the failing interaction more stable.

## Treat attachments as evidence, not decoration

The most useful Playwright attachments answer a specific question a reviewer will ask after a failure. What user was used? Which API response changed? Did the page render the expected accessible name? Did the test seed data exist before the click? Was the payment provider mocked or live? An artifact that answers one of those questions is evidence. An artifact that simply proves the test was running is noise.

Good attachments have three properties. They are scoped to one test, they are named so the report can be scanned quickly, and they contain enough context to be useful without exposing secrets. This matters because Playwright can run tests in parallel. A shared log file named \`debug.log\` is ambiguous when several workers fail at the same time. A test-specific file named \`checkout-api-response.json\` is much easier to reason about.

Use this decision table before adding an attachment:

| Reviewer question | Artifact to attach | Format | When to attach |
|---|---|---|---|
| What did the app send back? | API request and response summary | JSON | On assertion failure or after a risky API call |
| What did the user see? | Screenshot or DOM snapshot | PNG or text | On UI mismatch, usually only on failure |
| Which data did this test create? | Seed manifest with record IDs | JSON | Always for tests that create server records |
| What did the browser report? | Console messages and page errors | Text or JSON | On failure, or always for flaky areas |
| What did the AI agent need? | Prompt, tool result, and expected contract | JSON | For AI-assisted generation or repair workflows |

The table also shows why \`testInfo.attach\` should not become a dumping ground. If every test attaches screenshots, full traces, raw logs, and page HTML whether they pass or fail, your CI storage grows and the report becomes harder to use. Attach what helps a human or agent isolate the cause.

## The two supported attachment shapes

Playwright supports attaching a file path or an in-memory body. Use a path when you already have a file, such as a screenshot saved by \`page.screenshot\`, a generated HAR fragment, or a report from another tool. Use a body when the data is small and produced inside the test, such as JSON, plain text, or a compact CSV summary.

The basic shape is intentionally small:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('checkout summary includes tax', async ({ page }, testInfo) => {
  await page.goto('/checkout');

  const summary = await page.getByTestId('order-summary').textContent();

  await testInfo.attach('order-summary.txt', {
    body: summary || '',
    contentType: 'text/plain',
  });

  await expect(page.getByText('Tax')).toBeVisible();
});
\`\`\`

The name is visible in Playwright reporters. The \`contentType\` helps tools render or classify the attachment. For JSON, attach a string body and use \`application/json\`:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('profile API returns the active plan', async ({ request }, testInfo) => {
  const response = await request.get('/api/profile');
  const profile = await response.json();

  await testInfo.attach('profile-response.json', {
    body: JSON.stringify(profile, null, 2),
    contentType: 'application/json',
  });

  expect(profile.plan).toBe('team');
});
\`\`\`

For a file path, create the file first. Playwright copies the attachment to the output location, so the file should exist before the \`attach\` call finishes.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('billing settings can be opened', async ({ page }, testInfo) => {
  await page.goto('/settings/billing');

  const screenshotPath = testInfo.outputPath('billing-settings.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await testInfo.attach('billing-settings.png', {
    path: screenshotPath,
    contentType: 'image/png',
  });

  await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
});
\`\`\`

The example uses \`testInfo.outputPath\` because Playwright gives each test an output directory that is safe for parallel execution. Do not write all attachments to a shared \`tmp\` folder with a fixed name. That is how one worker overwrites another worker's evidence.

## Name artifacts for scanning in CI reports

Attachment names should be boring and predictable. The person opening the report is usually already under pressure. They should not have to open twelve files to discover which one contains the useful state.

Use a naming convention that places the subject first and the representation second. \`cart-state.json\` is easier to scan than \`state-cart-final.json\`. If the artifact is conditional, include the condition in the name, such as \`failure-console-errors.json\`. If it is tied to a step, use the step name, not an internal helper name.

| Naming pattern | Good example | Weak example | Reason |
|---|---|---|---|
| Subject plus format | \`checkout-response.json\` | \`response.json\` | The subject survives outside the test body |
| Failure scope | \`failure-dom-snippet.txt\` | \`debug.txt\` | The reader knows why it exists |
| Role and page | \`admin-users-page.png\` | \`screenshot1.png\` | Multiple roles remain distinguishable |
| External dependency | \`stripe-mock-events.json\` | \`events.json\` | The provider boundary is obvious |
| Data seed | \`seeded-projects.json\` | \`data.json\` | Cleanup and reproduction are easier |

The naming convention matters even more when AI coding agents inspect reports. Agents can parse a list of attachments and select relevant evidence if the names carry intent. Vague names force the agent to open everything, increasing token use and making the repair prompt noisier.

## Attach JSON that an agent can actually use

Raw JSON is not always useful. A full API payload can be large, volatile, and full of secrets. The best debugging JSON is curated. It includes identifiers, status, relevant fields, and a small amount of surrounding context. It omits tokens, cookies, raw passwords, and personal data unless your internal policy explicitly allows storing that data in CI artifacts.

Create a helper that redacts known keys and keeps artifact structure consistent:

\`\`\`ts
import type { TestInfo } from '@playwright/test';

type JsonValue = unknown;

const secretKeys = new Set([
  'authorization',
  'cookie',
  'password',
  'token',
  'accessToken',
  'refreshToken',
]);

function redact(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(source)) {
      result[key] = secretKeys.has(key) ? '[redacted]' : redact(item);
    }

    return result;
  }

  return value;
}

export async function attachJson(
  testInfo: TestInfo,
  name: string,
  value: JsonValue,
) {
  await testInfo.attach(name, {
    body: JSON.stringify(redact(value), null, 2),
    contentType: 'application/json',
  });
}
\`\`\`

Then use it at the boundary where evidence is created:

\`\`\`ts
import { test, expect } from '@playwright/test';
import { attachJson } from './support/attachments';

test('team member can accept an invite', async ({ request }, testInfo) => {
  const invite = await request.post('/api/test/invites', {
    data: { email: 'qa-member@example.test', role: 'member' },
  });

  const invitePayload = await invite.json();
  await attachJson(testInfo, 'invite-create-response.json', {
    status: invite.status(),
    payload: invitePayload,
  });

  expect(invite.ok()).toBeTruthy();
  expect(invitePayload.role).toBe('member');
});
\`\`\`

This style is specific enough for a reviewer to compare expected and actual state. It is also safe enough for routine CI usage, assuming your redaction list matches your application. Treat the redaction function as a guardrail, not as a legal or security boundary. If your payloads contain customer data, solve that at the test data layer by using synthetic users.

## Capture browser diagnostics without drowning the report

Console logs, page errors, request failures, and browser events are excellent attachments when a UI assertion fails. The trap is volume. Attaching every log line from every passing test punishes the report reader. Instead, collect diagnostics during the test and attach them when the test fails.

Playwright exposes \`testInfo.status\` and \`testInfo.expectedStatus\` after the test body and fixture cleanup begins. A fixture can collect browser diagnostics and attach them only when the actual status does not match the expected status.

\`\`\`ts
import { test as base, expect } from '@playwright/test';

type Diagnostics = {
  consoleMessages: string[];
  pageErrors: string[];
  requestFailures: string[];
};

export const test = base.extend<{ diagnostics: Diagnostics }>({
  diagnostics: async ({ page }, use, testInfo) => {
    const diagnostics: Diagnostics = {
      consoleMessages: [],
      pageErrors: [],
      requestFailures: [],
    };

    page.on('console', (message) => {
      diagnostics.consoleMessages.push(message.type() + ': ' + message.text());
    });

    page.on('pageerror', (error) => {
      diagnostics.pageErrors.push(error.message);
    });

    page.on('requestfailed', (request) => {
      const failure = request.failure();
      diagnostics.requestFailures.push(
        request.method() + ' ' + request.url() + ' ' + (failure?.errorText || '')
      );
    });

    await use(diagnostics);

    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('failure-browser-diagnostics.json', {
        body: JSON.stringify(diagnostics, null, 2),
        contentType: 'application/json',
      });
    }
  },
});

export { expect };
\`\`\`

This fixture keeps the normal report lean but makes failures richer. It also avoids relying only on Playwright traces. Traces are powerful, but a compact JSON summary can be easier to feed into an AI coding agent or paste into an issue.

## Combine attachments with Playwright steps

\`test.step\` gives the report a narrative. \`testInfo.attach\` gives it evidence. Together they create a report that reads like a reproducible investigation. Put attachments inside or near the step that produced the evidence so the sequence is obvious.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('discount code changes order total', async ({ page }, testInfo) => {
  await test.step('open checkout with a seeded cart', async () => {
    await page.goto('/checkout?cart=test-discount');
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  });

  await test.step('apply the discount code', async () => {
    await page.getByLabel('Discount code').fill('QA20');
    await page.getByRole('button', { name: 'Apply' }).click();

    const total = await page.getByTestId('order-total').textContent();
    await testInfo.attach('discounted-order-total.txt', {
      body: total || '',
      contentType: 'text/plain',
    });
  });

  await expect(page.getByText('Discount applied')).toBeVisible();
});
\`\`\`

Do not attach inside every tiny step by default. Attach at boundaries where state changes or where the next assertion depends on something not visible in the final error message. For example, attaching the order total after a discount is useful because a later assertion may only say that expected text was not visible.

## Decide what to attach always and what to attach only on failure

Some artifacts are useful even when a test passes. A seed manifest can help cleanup audits and flaky test investigations. A compact contract snapshot can show exactly which version of a mock was used. Most visual artifacts and logs, however, are better saved for failures.

Use this matrix for a balanced policy:

| Artifact | Attach on pass | Attach on fail | Typical size risk | Notes |
|---|---:|---:|---|---|
| Seed manifest | Yes | Yes | Low | Helps data cleanup and reproduction |
| API response summary | Sometimes | Yes | Medium | Summarize instead of storing full payloads |
| Screenshot | No | Yes | Medium | Prefer targeted screenshots over full page when possible |
| Console log collection | No | Yes | Medium to high | Filter noisy third-party logs |
| Trace archive | No | Yes | High | Use Playwright config for traces where possible |
| Accessibility violation list | Yes for audits | Yes | Medium | Attach exact selector and rule metadata |

The decision is partly economic. CI artifact retention costs money, but engineer attention costs more. A 4 KB JSON file that saves twenty minutes of reproduction is worth keeping. A 3 MB screenshot from every passing smoke test usually is not.

## Put artifact policy in a shared helper

Teams often start by calling \`testInfo.attach\` directly in each spec. That works for a few tests, then inconsistency creeps in. One test attaches raw payloads, another redacts, another uses a vague name, and another writes to a shared path. A helper gives reviewers one place to enforce naming, redaction, and content type defaults.

\`\`\`ts
import type { TestInfo } from '@playwright/test';

export async function attachText(
  testInfo: TestInfo,
  name: string,
  lines: string[],
) {
  await testInfo.attach(name, {
    body: lines.join(String.fromCharCode(10)),
    contentType: 'text/plain',
  });
}

export async function attachFailureNote(
  testInfo: TestInfo,
  name: string,
  details: Record<string, unknown>,
) {
  if (testInfo.status === testInfo.expectedStatus) {
    return;
  }

  await testInfo.attach(name, {
    body: JSON.stringify(details, null, 2),
    contentType: 'application/json',
  });
}
\`\`\`

Notice that the helper avoids a literal newline escape by using \`String.fromCharCode(10)\`. In your real test code, \`lines.join('\\n')\` is fine.

## Publish Playwright attachments from CI

\`testInfo.attach\` makes artifacts part of Playwright's test output, but your CI system still needs to preserve the report directory. In GitHub Actions, that usually means running tests and uploading the Playwright report or test results directory as an artifact. The exact directory depends on your Playwright configuration and reporter settings.

\`\`\`yaml
name: e2e

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report
\`\`\`

Do not assume the attachment is missing until you check both layers: did Playwright attach it to the test output, and did CI upload the directory that contains the report? Those are separate concerns.

## Diagnose the failure mode where attachments vanish

A realistic failure mode looks like this: locally, the HTML report shows \`profile-response.json\`, but the CI artifact does not. Or the report shows an attachment name, but opening it fails. The problem is usually one of four things.

First, the file was written outside the test output directory and deleted before the report copied it. Use \`testInfo.outputPath\` for generated files. Second, the test process ended before an async write finished. Always \`await\` the operation that creates the file and the \`testInfo.attach\` call. Third, CI uploaded the wrong directory. Confirm the configured reporter output and artifact path. Fourth, the artifact is too large or blocked by retention policy. Keep attachments small enough to survive routine report handling.

Use a tiny self-check when debugging attachment plumbing:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('attachment plumbing self-check', async ({}, testInfo) => {
  await testInfo.attach('attachment-self-check.json', {
    body: JSON.stringify({ workerIndex: testInfo.workerIndex, title: testInfo.title }, null, 2),
    contentType: 'application/json',
  });

  expect(true).toBe(true);
});
\`\`\`

Run that single test in CI and inspect the uploaded report. If this attachment appears, the plumbing works and the missing artifact is caused by timing, path, size, or conditional logic in the original test. If this attachment does not appear, fix reporter output and CI upload paths before touching application tests.

## What teams get wrong with custom artifacts

The most common mistake is attaching artifacts that describe the test implementation instead of the product behavior. A log that says \`clicked submit\` is less useful than the server response after submit. A screenshot of the entire page is less useful than a JSON summary showing the user role, feature flag state, and failed API status. Evidence should explain the behavior boundary that broke.

The second mistake is treating artifacts as a substitute for assertions. Attaching a response does not verify it. The test still needs clear expectations. The attachment should shorten diagnosis when the expectation fails.

The third mistake is storing secrets because it is convenient. Authorization headers, session cookies, reset tokens, and provider webhooks often appear in test payloads. Once they are in CI artifacts, they may be retained, downloaded, or pasted into issue trackers. Redaction belongs in the helper, and synthetic test data belongs in the environment.

## A compact artifact checklist for code review

Before merging a new attachment helper or a test that emits artifacts, review it against this checklist:

| Review item | Accept | Ask for changes |
|---|---|---|
| Name | Specific subject and format | Generic names like \`debug\`, \`output\`, or \`screenshot\` |
| Scope | Test-specific output path or body | Shared file names across workers |
| Size | Small summary or targeted file | Full dumps with no clear reader |
| Security | Redacted secrets and synthetic data | Raw tokens, cookies, passwords, or customer data |
| Timing | Awaited write and awaited attach | Fire-and-forget writes |
| Usefulness | Answers a likely triage question | Duplicates information already in the assertion |

This checklist is also useful when asking an AI coding agent to add artifacts. Give the agent the policy and require any new helper to pass it. The result is less likely to be a folder full of screenshots and more likely to be a report that helps a maintainer.

## Build failure bundles around known defect classes

After a suite has a basic attachment helper, the next step is to map artifacts to defect classes. This is where attachments become much more valuable than ad hoc debugging. A checkout failure, a permission failure, a localization failure, and a background job failure do not need the same evidence. If every failure gets the same generic bundle, the important signal is buried. If each defect class gets a focused bundle, triage becomes faster and the report starts to behave like a lightweight incident record.

For example, a checkout test should attach the cart summary, payment mock events, tax calculation response, and final browser diagnostics. A permissions test should attach the current role, feature flags, attempted action, and authorization API response. A localization test should attach locale, message key, rendered text, and maybe a screenshot of the affected component. The goal is not to attach more. The goal is to attach the smallest set of facts that answer the first five questions a reviewer will ask.

| Failure class | Attach first | Attach only if still unclear | Avoid |
|---|---|---|---|
| Checkout calculation | Cart, tax, discount, payment mock summary | Full request log for the checkout route | Raw card data or provider secrets |
| Permission denial | Role, resource owner, API status, visible error | Feature flag snapshot | Full auth token or session cookie |
| Localization mismatch | Locale, message key, rendered text | Targeted screenshot | Full translation catalog |
| Background job | Job ID, queued time, final status, polling attempts | Worker log excerpt | Entire CI log |
| Visual mismatch | Stable screenshot, viewport, browser project | DOM snippet near component | Full page HTML by default |

This mapping should live near the tests or in a QA platform note, not only in someone's memory. When a new test is added, the author can select the bundle that matches the risk. When an AI coding agent writes a test, the prompt can say "use the permission failure bundle" instead of asking for vague diagnostics. That single phrase gives the agent a concrete artifact policy.

Here is a simple bundle helper that stays small but structured:

\`\`\`ts
import type { TestInfo } from '@playwright/test';

type PermissionBundle = {
  role: string;
  resourceId: string;
  ownerId: string;
  action: string;
  apiStatus: number;
  visibleMessage: string | null;
};

export async function attachPermissionBundle(
  testInfo: TestInfo,
  bundle: PermissionBundle,
) {
  await testInfo.attach('permission-failure-bundle.json', {
    body: JSON.stringify(bundle, null, 2),
    contentType: 'application/json',
  });
}
\`\`\`

The helper does not know how to click the UI. It only standardizes evidence. That separation keeps artifact code reusable and keeps test behavior visible in the spec.

## Use attachments to compare expected and observed contracts

Many flaky-looking UI failures are really contract mismatches. The test expected a component to receive a field named \`displayName\`, but the API returned \`name\`. The test expected an empty state after deletion, but the API returned a soft-deleted record. A screenshot can show the symptom, but a contract attachment can show the mismatch directly.

When a test crosses a boundary between browser and server, attach a small expected-versus-observed object. Keep it focused on the fields used by the assertion. Do not attach the whole API response if the assertion depends on three fields.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('profile card renders the display name from the API', async ({ page, request }, testInfo) => {
  const response = await request.get('/api/profile-card');
  const observed = await response.json();

  await page.goto('/profile');

  const expected = {
    displayName: 'Avery QA',
    planLabel: 'Team',
    avatarState: 'initials',
  };

  await testInfo.attach('profile-card-contract.json', {
    body: JSON.stringify({ expected, observed }, null, 2),
    contentType: 'application/json',
  });

  await expect(page.getByRole('heading', { name: expected.displayName })).toBeVisible();
});
\`\`\`

This pattern is especially helpful during API migrations. If the UI fails, the attachment tells the reviewer whether the page ignored correct data or the service returned a different shape. Without it, the reviewer may waste time stepping through front-end code when the defect is upstream.

Do not turn every Playwright test into a contract test. Dedicated API and contract tests are still better for broad schema coverage. The attachment here is a diagnostic bridge for user-visible scenarios where a small amount of contract context explains the failure.

## Keep artifact retention aligned with investigation windows

Attachment strategy should include retention. A report that disappears before the team investigates failures is not useful. A report that keeps oversized artifacts forever is expensive and risky. Most teams need different retention expectations for pull requests, main branch, nightly runs, and release candidates.

| Run type | Suggested artifact posture | Reason |
|---|---|---|
| Pull request | Keep compact failure evidence and report | Fast review, short investigation window |
| Main branch | Keep reports for recent regressions | Helps bisect post-merge issues |
| Nightly | Keep richer failure bundles | More time for analysis and trend review |
| Release candidate | Keep all approved diagnostic artifacts | Supports release signoff and rollback analysis |

The exact retention period belongs to your CI and compliance policy. The Playwright part is making artifacts intentional enough that retention is a conscious tradeoff. If you cannot justify keeping an artifact for a week, reconsider whether the test should attach it at all.

One pragmatic approach is to keep custom JSON and text attachments always small, then rely on traces and screenshots for failure-only high-detail evidence. That gives maintainers a useful report even when large artifacts expire earlier than lightweight metadata.

## Frequently Asked Questions

### Should I use testInfo.attach or Playwright traces?

Use both for different jobs. Traces are best for reconstructing browser actions, network activity, and snapshots around a UI failure. \`testInfo.attach\` is best for curated evidence that the trace may not explain cleanly, such as seed records, API summaries, mock provider events, feature flag state, or AI prompt context. If storage is limited, keep traces failure-only and attach compact JSON summaries for the state that matters most.

### Can I attach artifacts after the test assertion fails?

Yes, if the attachment happens in fixture teardown or a \`try\` and \`finally\` path that still runs after the failure. Code placed after a failing assertion in the same linear test body will not run. For diagnostics that must exist on failure, collect data during the test, then attach it in fixture teardown when \`testInfo.status\` differs from \`testInfo.expectedStatus\`.

### What content type should I use for custom artifacts?

Use the real media type when you know it: \`application/json\` for JSON, \`text/plain\` for logs, \`image/png\` for PNG screenshots, and \`text/html\` only for sanitized HTML snippets. The content type helps reporters and tools display the attachment sensibly. If the content is a custom text format, prefer \`text/plain\` over inventing a type that your report viewer will not understand.

### How small should Playwright custom artifacts be?

Small enough that a reviewer can open them quickly and CI can retain them without special handling. A few kilobytes of JSON is ideal. Screenshots and traces are naturally larger, so attach them selectively. If an artifact grows because it contains repeated records, summarize it: include counts, IDs, failing fields, and the first few examples. Keep the full dump only when it is truly required for reproduction.
`,
};
