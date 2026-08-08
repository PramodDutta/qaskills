import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Test Info Retry Aware Logging: Diagnose Flakes Across Attempts',
  description: 'Use Playwright test info retry aware logging to tag each attempt, attach scoped artifacts, reset sticky state, and diagnose flakes without noisy CI logs.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Playwright Test Info Retry Aware Logging: Diagnose Flakes Across Attempts

Playwright test info retry aware logging is the practice of reading \`test.info()\` (or the \`testInfo\` fixture argument) on every attempt, then emitting logs, annotations, and attachments that are explicitly scoped to that attempt. Playwright numbers retries with \`testInfo.retry\`: the first run is \`0\`, the first retry is \`1\`, and so on. When a flaky test passes on retry, a plain \`console.log\` stream that ignores this number becomes a reconstruction puzzle. You cannot tell whether a token was created on attempt zero, whether a screenshot belongs to the failing run, or whether a cleanup hook ran after the successful retry.

Retry-aware logging is not optional polish for large CI matrices. It is how you separate "failed once, then self-healed" from "failed for a different reason each time." It is also how AI coding agents and humans share a common timeline when they open the HTML report. Attachments named \`network-attempt-0.json\` and \`network-attempt-1.json\` make that timeline machine-readable. Logs that include \`retry=1 worker=3 project=chromium\` make grepping a multi-shard pipeline possible without guessing.

This guide maps the \`TestInfo\` fields that matter for retries, shows structured logging helpers you can drop into fixtures, explains attempt-scoped attachments, covers sticky state that survives poorly designed retries, and walks through a realistic misdiagnosis. Official references: https://playwright.dev/docs/api/class-testinfo and https://playwright.dev/docs/test-retries. If you are choosing a runner stack for the wider suite, read the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). When a retry log points at an ambiguous selector, continue with [Playwright locator best practices](/blog/playwright-best-practices-locators-2026).

## Map every retry signal on TestInfo before you log

Before writing a custom logger, inventory the identity fields Playwright already gives you. Logging without them produces pretty lines that still cannot be correlated across workers.

| Field | Meaning during retries | Use in log lines |
|---|---|---|
| \`testInfo.retry\` | Zero-based attempt index after failure | Primary attempt tag |
| \`testInfo.repeatEachIndex\` | Index when using \`repeat-each\` | Distinguish forced repeats from retries |
| \`testInfo.workerIndex\` | Worker process id | Correlate parallel noise |
| \`testInfo.parallelIndex\` | Parallel worker slot | Useful for resource locks |
| \`testInfo.project.name\` | Project from config | Browser or env lane |
| \`testInfo.titlePath\` | File + describe + test titles | Human readable breadcrumb |
| \`testInfo.outputDir\` | Per-test output directory | Safe place for temp files |
| \`testInfo.status\` | Current known status while hooks run | After-hook decisions |

A minimal structured prefix is enough for most teams:

\`\`\`ts
// helpers/retry-log.ts
import type { TestInfo } from '@playwright/test';

export type LogFields = Record<string, string | number | boolean | null | undefined>;

export function attemptPrefix(testInfo: TestInfo): string {
  return [
    \`retry=\${testInfo.retry}\`,
    \`worker=\${testInfo.workerIndex}\`,
    \`project=\${testInfo.project.name}\`,
  ].join(' ');
}

export function logAttempt(
  testInfo: TestInfo,
  message: string,
  fields: LogFields = {},
): void {
  const extras = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => \`\${key}=\${String(value)}\`)
    .join(' ');
  const tail = extras.length > 0 ? \` \${extras}\` : '';
  // eslint-disable-next-line no-console
  console.log(\`[\${attemptPrefix(testInfo)}] \${message}\${tail}\`);
}
\`\`\`

Call \`logAttempt\` from tests, hooks, and fixtures. Prefer the \`testInfo\` fixture argument over \`test.info()\` inside hooks where the fixture is already available, and use \`test.info()\` inside helpers that should not thread the object through every signature.

Config that actually enables retries is required before any of this pays off:

\`\`\`ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
\`\`\`

\`trace: 'on-first-retry'\` is complementary, not a substitute. Traces explain browser actions. Retry-aware logs explain fixture setup, seed data, feature flags, and non-browser side effects that never appear in a trace.

## Prefix structured logs with attempt, worker, and project identity

Teams often log domain events (\`created order ORD-19\`) without attempt identity. In a four-worker CI job with two retries, five lines saying \`created order ORD-19\` can refer to different attempts of different tests that happened to reuse a factory. Always bind domain identifiers to \`testInfo.retry\` and, when useful, to a per-attempt run id.

\`\`\`ts
// tests/checkout/retry-aware-checkout.spec.ts
import { test, expect } from '@playwright/test';
import { logAttempt } from '../../helpers/retry-log';

test.describe('checkout confirmation', () => {
  test('shows paid status after card capture', async ({ page }, testInfo) => {
    const runId = \`\${testInfo.file}:\${testInfo.line}:r\${testInfo.retry}\`;
    logAttempt(testInfo, 'start checkout', { runId });

    await page.goto('/checkout/demo-cart');
    await page.getByLabel('Card number').fill('4242424242424242');
    await page.getByLabel('Expiry').fill('12/30');
    await page.getByLabel('CVC').fill('123');

    logAttempt(testInfo, 'submit payment form', { runId });
    await page.getByRole('button', { name: 'Pay now' }).click();

    await expect(page.getByRole('status')).toHaveText(/Payment confirmed/i);
    logAttempt(testInfo, 'payment confirmed', { runId });
  });
});
\`\`\`

Build a stable key from \`testInfo.file\`, \`testInfo.line\`, \`testInfo.title\`, and \`testInfo.retry\`. The exact composition matters less than consistency across the suite.

For AI agents that read CI logs, enforce a single pattern. Agents parse structured keys far more reliably than free-form prose. A small convention table helps onboarding:

| Event | Required keys | Optional keys |
|---|---|---|
| Test start | \`retry\`, \`project\`, \`runId\` | \`gitSha\`, \`shard\` |
| External API call | \`retry\`, \`runId\`, \`endpoint\` | \`status\`, \`latencyMs\` |
| Seed data create | \`retry\`, \`runId\`, \`entity\`, \`entityId\` | \`tenant\` |
| Assertion soft fail | \`retry\`, \`runId\`, \`expect\` | \`actual\` |
| Cleanup | \`retry\`, \`runId\`, \`entityId\` | \`keptForDebug\` |

Keep secrets out of these lines. Retry logs often land in long-lived CI artifacts. Mask tokens, session cookies, and raw PANs. Log last-four or server-side ids instead.

## Attach attempt-scoped artifacts without flooding CI storage

\`testInfo.attach\` puts files into the report for the current attempt. Naming attachments with the attempt index prevents reviewers from opening the wrong screenshot after a green retry. Use \`testInfo.outputPath\` for intermediate files so Playwright cleans the directory with the test output lifecycle.

\`\`\`ts
// helpers/attach-json.ts
import type { TestInfo } from '@playwright/test';
import fs from 'node:fs/promises';

export async function attachJson(
  testInfo: TestInfo,
  name: string,
  value: unknown,
): Promise<void> {
  const fileName = \`\${name}-attempt-\${testInfo.retry}.json\`;
  const filePath = testInfo.outputPath(fileName);
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
  await testInfo.attach(fileName, {
    path: filePath,
    contentType: 'application/json',
  });
}

export async function attachText(
  testInfo: TestInfo,
  name: string,
  body: string,
): Promise<void> {
  const fileName = \`\${name}-attempt-\${testInfo.retry}.txt\`;
  await testInfo.attach(fileName, {
    body,
    contentType: 'text/plain',
  });
}
\`\`\`

Use attachments for payloads that would drown the console: GraphQL responses, feature-flag snapshots, permission matrices, or the list of cookies after login. Prefer attach-on-failure for large blobs if storage is tight. Playwright still keeps failure artifacts useful when combined with \`screenshot: 'only-on-failure'\` and \`trace: 'on-first-retry'\`.

\`\`\`ts
// tests/admin/permissions-snapshot.spec.ts
import { test, expect } from '@playwright/test';
import { attachJson, attachText } from '../../helpers/attach-json';
import { logAttempt } from '../../helpers/retry-log';

test('admin can open refund tools', async ({ page, request }, testInfo) => {
  logAttempt(testInfo, 'fetch session flags');
  const flags = await request.get('/api/session/flags');
  expect(flags.ok()).toBeTruthy();
  const flagJson = await flags.json();
  await attachJson(testInfo, 'session-flags', flagJson);

  await page.goto('/admin/refunds');
  if (testInfo.retry > 0) {
    await attachText(
      testInfo,
      'retry-note',
      \`Retrying admin refunds UI after failure. flags.refundTools=\${String(flagJson.refundTools)}\`,
    );
  }

  await expect(page.getByRole('heading', { name: 'Refund tools' })).toBeVisible();
});
\`\`\`

Annotations are the lighter sibling of attachments. Push short key/value notes that the HTML report surfaces without opening a file:

\`\`\`ts
test.beforeEach(async ({}, testInfo) => {
  testInfo.annotations.push({
    type: 'attempt',
    description: String(testInfo.retry),
  });
  testInfo.annotations.push({
    type: 'worker',
    description: String(testInfo.workerIndex),
  });
});
\`\`\`

Do not treat annotations as a dumping ground for multi-kilobyte JSON. They are labels, not log sinks.

## Reset sticky state when retry leaves zero

The most expensive retry bugs are not flaky locators. They are sticky side effects: a user left half-created, a unique email reserved, a feature flag flipped in a shared environment, a rate-limit counter incremented. On attempt \`1\`, the test assumes a clean world that no longer exists.

Retry-aware logging should make that residue visible, and fixtures should neutralize it.

| Sticky residue | Symptom on retry | Mitigation |
|---|---|---|
| Unique email already registered | "Email taken" validation | Derive email from \`retry\` or delete on retry |
| Cart id stored in \`storageState\` | Wrong total | Build auth state per attempt |
| Row lock in shared DB | Timeouts | Per-attempt tenant or serial project |
| Feature flag toggled in beforeAll | Unexpected UI branch | Prefer test-scoped overrides |
| Kafka consumer lag from prior run | Missing event | Wait on deterministic offsets or purge |

Example fixture that rebuilds identity on every attempt and logs the choice:

\`\`\`ts
// fixtures/shopper.ts
import { test as base } from '@playwright/test';
import { logAttempt } from '../helpers/retry-log';

type ShopperFixtures = {
  shopperEmail: string;
};

export const test = base.extend<ShopperFixtures>({
  shopperEmail: async ({}, use, testInfo) => {
    const email = \`shopper.\${testInfo.parallelIndex}.r\${testInfo.retry}@example.test\`;
    logAttempt(testInfo, 'allocate shopper email', { email });
    await use(email);
    logAttempt(testInfo, 'release shopper email', { email });
  },
});

export { expect } from '@playwright/test';
\`\`\`

When you must clean shared data only after a retry begins, gate on \`testInfo.retry\`:

\`\`\`ts
// tests/hooks/retry-cleanup.ts
import { test } from '@playwright/test';
import { logAttempt } from '../../helpers/retry-log';
import { deleteShopperByEmailPrefix } from '../../helpers/db';

test.beforeEach(async ({}, testInfo) => {
  if (testInfo.retry === 0) {
    return;
  }
  const prefix = \`shopper.\${testInfo.parallelIndex}.r\`;
  logAttempt(testInfo, 'cleanup sticky shoppers before retry', { prefix });
  await deleteShopperByEmailPrefix(prefix);
});
\`\`\`

People sometimes put cleanup only in \`afterEach\`. That fails when the worker crashes hard enough that the hook does not run, or when the next attempt needs a clean slate *before* the page opens. Prefer before-retry cleanup for shared environments, and keep after-hooks for best-effort artifact capture.

## Diagnose the silent wrong-attempt log stream

### Failure mode

A payments suite fails in CI with:

\`\`\`text
Error: expect(locator).toHaveText(expected)
Expected pattern: /Payment confirmed/i
Received string:  "Payment processing"
\`\`\`

The console shows:

\`\`\`text
created payment intent pi_123
polling status
created payment intent pi_123
polling status
payment confirmed
\`\`\`

The HTML report marks the test flaky (failed once, passed on retry). A developer assumes the UI was slow and increases the timeout. A week later the flake rate rises. Nobody notices that both attempts logged the same payment intent id, which is impossible if the factory created a new intent each time. The logger never printed \`retry=\`, so the duplicate id looked like a single slow run rather than two attempts sharing a process-level variable.

### Diagnosis workflow

1. Enable retries locally with \`npx playwright test payments --retries=1\` and fail the first attempt on purpose (temporary \`test.fail\` is the wrong tool here; inject a controlled fault or use a mock that fails once).
2. Confirm logs include \`retry=0\` then \`retry=1\`. If both attempts print without the field, fix logging first.
3. Search the log for entity ids. If \`pi_123\` appears on both attempts, inspect module-level caches, \`globalSetup\` state, and fixtures that close over mutable variables.
4. Open attempt-scoped attachments. If only one \`session-flags-attempt-*.json\` exists, the attach helper is not retry-aware.
5. With \`trace: 'on-first-retry'\` you only get the retry trace, not attempt 0, so there is nothing to compare against. Use \`trace: 'on'\` (or a retain-on-failure setting that also keeps retries) when you need both attempts side by side. Look for different network orders, not just slower timing.

### Fix

Move the payment intent id into attempt-local scope and log it with the retry prefix:

\`\`\`ts
// tests/payments/intent-per-attempt.spec.ts
import { test, expect } from '@playwright/test';
import { logAttempt } from '../../helpers/retry-log';
import { attachJson } from '../../helpers/attach-json';
import { createPaymentIntent } from '../../helpers/payments-api';

test('checkout waits for terminal payment state', async ({ page }, testInfo) => {
  const intent = await createPaymentIntent({
    amountCents: 2599,
    currency: 'usd',
    // Include retry so support tooling can find orphaned intents later.
    statementSuffix: \`r\${testInfo.retry}\`,
  });

  logAttempt(testInfo, 'created payment intent', { intentId: intent.id });
  await attachJson(testInfo, 'payment-intent', intent);

  await page.goto(\`/checkout/recover?intent=\${intent.id}\`);
  await expect(page.getByRole('status')).toHaveText(/Payment confirmed/i, {
    timeout: 15_000,
  });
});
\`\`\`

After this change, a shared cache bug surfaces as identical intent ids *with different retry tags*, which is enough for an agent or human to open the factory code instead of blaming the UI timeout.

## What people get wrong about console.log during retries

The common mistake is treating the console as a chronological single-run diary. In Playwright, workers interleave output, retries reprint setup, and reporters may group or fold lines differently than your terminal. Another mistake is logging only in the test body while fixtures silently create the real preconditions. When the flake is in auth setup, the test body never runs far enough to print anything useful on the failing attempt.

A third mistake is conditional logging that fires only on failure inside \`afterEach\` without checking whether the failure was from attempt 0 or a later attempt you already understand. Capture failure context on every failed attempt, and keep success logs thin.

Better pattern: fixtures log entry/exit with retry tags; tests log domain milestones; \`afterEach\` attaches a compact dump when \`testInfo.status !== testInfo.expectedStatus\`.

\`\`\`ts
// fixtures/logging-context.ts
import { test as base } from '@playwright/test';
import { logAttempt } from '../helpers/retry-log';
import { attachJson } from '../helpers/attach-json';

type LoggingFixtures = {
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  attemptLogs: void;
};

export const test = base.extend<LoggingFixtures>({
  attemptLogs: [
    async ({}, use, testInfo) => {
      const milestones: Array<{ t: number; msg: string }> = [];
      const started = Date.now();
      logAttempt(testInfo, 'fixture start');
      await use();
      logAttempt(testInfo, 'fixture end', {
        durationMs: Date.now() - started,
        status: testInfo.status ?? 'unknown',
      });
      if (testInfo.status !== testInfo.expectedStatus) {
        milestones.push({ t: Date.now() - started, msg: 'test ended unexpected status' });
        await attachJson(testInfo, 'milestones', {
          retry: testInfo.retry,
          status: testInfo.status,
          errors: testInfo.errors.map((error) => error.message),
          milestones,
        });
      }
    },
    { auto: true },
  ],
});
\`\`\`

Auto fixtures guarantee the wrapper runs even when individual tests forget to import a helper. That consistency is what makes log search across a monorepo viable.

## Wire fixtures so page helpers inherit retry context

Page objects should not import a global mutable "current retry" variable. Pass \`TestInfo\` into the helper factory, or bind a logger once in a fixture and inject it.

\`\`\`ts
// fixtures/app.ts
import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import { logAttempt } from '../helpers/retry-log';

class CheckoutPage {
  constructor(
    private readonly page: Page,
    private readonly testInfo: TestInfo,
  ) {}

  async payWithTestCard(): Promise<void> {
    logAttempt(this.testInfo, 'checkout.payWithTestCard');
    await this.page.getByLabel('Card number').fill('4242424242424242');
    await this.page.getByLabel('Expiry').fill('12/30');
    await this.page.getByLabel('CVC').fill('123');
    await this.page.getByRole('button', { name: 'Pay now' }).click();
  }
}

type AppFixtures = {
  checkoutPage: CheckoutPage;
};

export const test = base.extend<AppFixtures>({
  checkoutPage: async ({ page }, use, testInfo) => {
    await use(new CheckoutPage(page, testInfo));
  },
});

export { expect };
\`\`\`

This keeps retry identity available deep in helper stacks without static globals. When an agent refactors page objects, the constructor dependency is an explicit reminder to keep logging attempt-aware.

For multi-project runs (chromium vs mobile), the \`project\` field in the prefix prevents false aggregation. A flake that only happens on a mobile project will show \`project=mobile-chrome\` even if the test title is identical.

## Pair logging with traces, screenshots, and CI shards

Retry-aware logging is one lane of a diagnosis highway. Configure the others so they agree on attempt boundaries.

| Signal | Recommended mode | Attempt awareness |
|---|---|---|
| Console logs | Always structured with \`retry=\` | Manual via \`testInfo\` |
| Screenshots | \`only-on-failure\` | Playwright stores per attempt |
| Trace | \`on-first-retry\` or \`retain-on-failure\` | Viewer separates attempts |
| Video | \`retain-on-failure\` | Per attempt when retained |
| Custom attachments | Explicit names with attempt suffix | Your naming scheme |
| Annotations | Short attempt labels | \`testInfo.annotations\` |

In sharded CI, include the shard id from the environment in the log prefix when available. Playwright documents shard configuration in the test runner CLI; your pipeline usually exposes an index through an env var you choose. Example pattern:

\`\`\`ts
export function attemptPrefix(testInfo: TestInfo): string {
  const shard = process.env.SHARD_INDEX ?? 'na';
  return [
    \`retry=\${testInfo.retry}\`,
    \`worker=\${testInfo.workerIndex}\`,
    \`project=\${testInfo.project.name}\`,
    \`shard=\${shard}\`,
  ].join(' ');
}
\`\`\`

When you install ready-made QA skills from qaskills.sh with the qaskills CLI, prefer skills that emit the same \`retry=\` / \`worker=\` conventions so agent-generated tests do not invent a second logging dialect.

## Practical checklist for a retry-aware suite

Use this as a PR review checklist when someone adds retries to a project:

1. \`retries\` is set intentionally for CI, not copied blindly to local unless debugging flakes.
2. Every custom log line can answer "which attempt?" without opening the HTML report.
3. Seed data uniqueness includes \`testInfo.retry\` or is deleted in \`beforeEach\` when \`retry > 0\`.
4. Attachments that dump large state include the attempt index in the name.
5. Fixtures that mutate shared environments log entry and exit with the retry prefix.
6. \`trace\` / \`screenshot\` / \`video\` modes match storage budget and still cover failed attempts.
7. Flaky-test quarantine processes read attempt-tagged logs before raising timeouts.
8. Agents and humans share one log schema documented in the repo README.

## Putting it together in one flow

A realistic end-to-end pattern for a flaky admin settings page:

\`\`\`ts
// tests/admin/settings-retry-aware.spec.ts
import { test, expect } from '../fixtures/app';
import { logAttempt } from '../../helpers/retry-log';
import { attachJson } from '../../helpers/attach-json';

test.describe('admin settings', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    logAttempt(testInfo, 'open admin settings');
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('toggles outbound webhooks and persists', async ({ page }, testInfo) => {
    const toggle = page.getByRole('switch', { name: 'Outbound webhooks' });
    const before = await toggle.isChecked();
    logAttempt(testInfo, 'read webhook toggle', { before });

    await toggle.click();
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByRole('status')).toHaveText(/Saved/i);

    const after = await toggle.isChecked();
    logAttempt(testInfo, 'write webhook toggle', { after });
    await attachJson(testInfo, 'webhook-toggle', {
      retry: testInfo.retry,
      before,
      after,
    });

    expect(after).toBe(!before);
  });
});
\`\`\`

When this test flakes, the report gives you: attempt-tagged console lines, a JSON attachment per attempt, a screenshot of the failed attempt, and a trace on the first retry. That package is usually enough to distinguish a slow save API from a toggle that never flipped because a permissions flag was off.

## Operational metrics without fake industry stats

Track suite health with numbers you measure yourself, not blog benchmarks. Useful internal metrics include: share of tests that pass only on retry, median attempts until green for a given project, count of retries where seed cleanup logs fired, and count of failures with missing \`retry=\` tags (should trend to zero). Mark any dashboard targets as team policy, not universal truth. Illustrative policy example: investigate any test that is retry-only-green more than three times in seven days of CI history. Your thresholds should match your release risk.

## Frequently Asked Questions

### How do I read the retry number inside a Playwright test?

Use the \`testInfo\` fixture argument or call \`test.info()\` during the test. The property is \`testInfo.retry\`. It is \`0\` on the first run, \`1\` on the first retry, and increments for each additional retry. You can read it in \`beforeEach\`, \`afterEach\`, fixtures, and the test body. It is not available outside the test lifecycle; calling \`test.info()\` from a random module at import time throws.

### Should every log line include the retry index?

Every line that might be interleaved with other workers or attempts should include it. Short local debugging sessions can be looser. For CI, prefer a shared helper so the field cannot be forgotten. Domain-only messages without attempt tags create the silent wrong-attempt failure mode described above, especially when entity ids are reused by accident.

### How is retry-aware logging different from enabling traces?

Traces record browser-side activity and some Playwright API calls for an attempt. Retry-aware logging records your process-side story: seed data, feature flags, API helpers, and custom milestones. You usually want both. Configure traces for failures or first retry to control size, and keep structured logs always on with aggressive secret redaction.

### Can AI coding agents use testInfo.retry correctly without extra help?

Agents can call the API if your project shows clear examples, but they often invent parallel patterns (global counters, timestamps only, Mocha-style hooks). Keep a short helper module and reference it in agent instructions so generated tests import \`logAttempt\` instead of free-form \`console.log\`. Skills and snippets that already encode \`retry=\` prefixes reduce review churn.
`,
};
