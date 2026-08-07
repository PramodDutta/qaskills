import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Retry Only Specific Error Types Without Hiding Real Failures',
  description: 'Learn playwright retry only specific error types with scoped helpers, error classifiers, trace evidence, and CI rules that expose real flakes.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Playwright Retry Only Specific Error Types Without Hiding Real Failures

Playwright can retry failed tests, but the built-in retry setting does not choose retries by exception class, HTTP status, selector category, or business error. If you need playwright retry only specific error types, the practical answer is to keep whole-test retries conservative and put selective retry logic around the exact operation that is allowed to be transient. That keeps deterministic product failures visible while still absorbing known infrastructure noise.

The pattern is simple: classify the error, retry only when the classifier says the error is allowed, attach evidence for every attempt, and fail immediately for everything else. Do this at the boundary where the transient condition happens, such as a third-party API call, a short-lived backend 503, or a temporary file lock in a test fixture. Do not wrap an entire checkout journey and hope the second run explains the first one.

This guide shows a TypeScript workflow QA engineers can drop into a Playwright suite. It covers when to use Playwright's own retries, when to use \`expect\` auto-waiting, when to build a scoped retry helper, how to diagnose the common failure modes, and how to keep AI-generated tests from adding broad retry blankets. For a wider runner comparison, see the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026), and for selector-driven flake reduction, pair this with [Playwright locator best practices](/blog/playwright-best-practices-locators-2026).

## Start with the Boundary Playwright Actually Retries

Playwright Test retries at the test case level. You can configure retries in \`playwright.config.ts\`, pass \`--retries\` on the command line, or configure a group with \`test.describe.configure({ retries: 2 })\`. When a test fails and then passes on a retry, Playwright reports it as flaky. That behavior is useful for suite-level reporting, but it is deliberately broad. Playwright does not inspect the thrown error and say, "Retry only network timeouts, but never assertion failures."

That distinction matters because whole-test retries replay everything: login, data setup, navigation, actions, assertions, cleanup, and any side effects the first attempt already produced. If the first attempt created an order and failed before asserting the confirmation page, the second attempt might fail because the cart is empty, pass because the order already exists, or create duplicate data. None of those outcomes tells you whether the application was correct.

Selective retry is different. It says one narrow operation is allowed to be attempted again because the failure is known to be outside the behavior under test. The retry helper owns the policy, records the attempts, and gives up quickly when the error is not on the allowlist. The test still fails on a bad locator, wrong text, visual mismatch, unhandled exception, or business rule regression.

| Retry mechanism | Scope | Good use | Main risk |
| --- | --- | --- | --- |
| Playwright \`retries\` config | Entire failed test | CI noise dampening and flaky reporting | Masks which step was transient |
| \`test.describe.configure\` retries | Tests in one file or describe block | Temporary quarantine for a known area | Can normalize a bad suite boundary |
| Locator assertions and actionability | One UI expectation or action | Waiting for expected UI readiness | Misused as a sleep replacement |
| Custom operation retry helper | One explicit async operation | Known transient network, lock, or service fault | Poor classifiers can retry real defects |
| Job-level CI rerun | Whole command | Recovering from runner outage | Destroys diagnostic precision |

The rule I use is strict: use built-in retries to measure suite health, not to define product correctness. Use operation-level retries only when the operation has a documented transient failure mode and a short retry budget.

## Configure Whole-Test Retries as a Safety Net, Not the Main Strategy

Keep global retries low. Many teams use zero retries locally so developers see first-run failures, then one retry in CI to classify intermittent failures. That gives you Playwright's flaky reporting without teaching engineers to ignore failed first attempts. The exact number should be a team decision, but avoid multiple retries unless you are temporarily isolating an external dependency.

\`\`\`ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html']],
  use: {
    trace: 'on-first-retry',
  },
});
\`\`\`

This configuration does not solve selective retry. It only gives you evidence when a test fails once and passes later. The trace from the first retry helps diagnose timing, locator, and environment issues. If you see a test repeatedly marked flaky, treat that as a defect in the test, environment, or product. Do not increase retries and move on.

For a known unstable area, you can configure retries inside a describe block. Use this as a labeled, temporary containment mechanism. Put an owner, expiration date, or issue ID in a comment or tag so it does not become invisible maintenance debt.

\`\`\`ts
// tests/checkout-third-party.spec.ts
import { test, expect } from '@playwright/test';

test.describe('checkout with payment sandbox', () => {
  test.describe.configure({ retries: 1 });

  test('shows a receipt after a sandbox authorization', async ({ page }) => {
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Pay now' }).click();
    await expect(page.getByRole('heading', { name: 'Receipt' })).toBeVisible();
  });
});
\`\`\`

That file-level or group-level setting still retries every error. It is appropriate only when the entire scenario depends on a dependency you cannot fully control. If the actual need is "retry the payment authorization request when the sandbox returns 503," put retry logic around that request instead of replaying the whole browser journey.

## Build a Typed Error Classifier

Selective retry starts with a boring classifier. The classifier should return a structured decision, not a boolean, because you want logs and attachments to explain why an attempt was retried. Keep the input broad enough to accept unknown thrown values, then normalize the details you trust.

\`\`\`ts
// tests/support/retry-classifier.ts
export type RetryDecision = {
  retryable: boolean;
  reason: string;
};

export type RetryContext = {
  operation: string;
  attempt: number;
};

export function classifyRetryableError(error: unknown, context: RetryContext): RetryDecision {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('econnreset') || message.includes('socket hang up')) {
      return {
        retryable: true,
        reason: 'transport connection reset during ' + context.operation,
      };
    }

    if (message.includes('service unavailable') || message.includes('http 503')) {
      return {
        retryable: true,
        reason: 'temporary service unavailability during ' + context.operation,
      };
    }

    if (message.includes('timeout') && context.operation.startsWith('external-api:')) {
      return {
        retryable: true,
        reason: 'timeout allowed only for external API boundary',
      };
    }
  }

  return {
    retryable: false,
    reason: 'error is not on the retry allowlist',
  };
}
\`\`\`

The classifier is intentionally conservative. It does not retry every timeout. Playwright timeout errors can mean many things: a locator never appeared, an actionability check never passed, a navigation waited for a URL that never loaded, or an assertion expected text that the application never produced. Retrying those errors can hide genuine product or selector problems. The example allows timeout only for operations whose name starts with \`external-api:\`, which forces the caller to state the boundary.

What people get wrong: they classify by message substring alone and forget the operation. A message containing "timeout" inside a UI assertion is not the same as a timeout from a sandbox API. A reliable retry policy needs both the error and the context.

## Retry One Operation, Attach Every Attempt

The helper below retries one async function. It accepts a maximum attempt count, a delay, the classifier, and an optional evidence hook. It fails immediately when the classifier rejects the error. It also rethrows the final error instead of wrapping it in a generic retry failure, because the original stack trace is usually more useful.

\`\`\`ts
// tests/support/retry-on.ts
import type { TestInfo } from '@playwright/test';
import { classifyRetryableError } from './retry-classifier';

type RetryOptions = {
  operation: string;
  attempts: number;
  delayMs: number;
  testInfo?: TestInfo;
};

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryOnAllowedError<T>(
  options: RetryOptions,
  run: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const decision = classifyRetryableError(error, {
        operation: options.operation,
        attempt,
      });

      await options.testInfo?.attach('retry-attempt-' + attempt, {
        body: JSON.stringify({
          operation: options.operation,
          attempt,
          retryable: decision.retryable,
          reason: decision.reason,
          error: error instanceof Error ? error.message : String(error),
        }, null, 2),
        contentType: 'application/json',
      });

      if (!decision.retryable || attempt === options.attempts) {
        throw error;
      }

      await wait(options.delayMs);
    }
  }

  throw lastError;
}
\`\`\`

This helper has one important property: it cannot turn an assertion failure into a pass unless the classifier explicitly allows that failure. A failed \`expect(locator).toHaveText('Paid')\` will throw a Playwright assertion error, the classifier will reject it, and the test will fail on the first attempt. That is what you want.

The attachment is deliberately JSON. It can be read in Playwright's HTML report, collected by CI, or summarized by an AI coding agent without scraping terminal noise. If an agent modifies a test and adds a retry, reviewers can inspect the attachment contract and ask whether the new operation belongs on the allowlist.

## Apply It to an External API Setup Step

Use the helper around setup work that is outside the UI behavior under test. In the example below, the test creates a payment sandbox authorization before opening the application. The sandbox is allowed to return occasional transport failures. The actual browser assertions are not retried by the helper.

\`\`\`ts
// tests/checkout.spec.ts
import { test, expect, request } from '@playwright/test';
import { retryOnAllowedError } from './support/retry-on';

test('customer can view receipt for an authorized payment', async ({ page }, testInfo) => {
  const api = await request.newContext({
    baseURL: process.env.PAYMENT_SANDBOX_URL,
  });

  const authorization = await retryOnAllowedError(
    {
      operation: 'external-api:create-payment-authorization',
      attempts: 3,
      delayMs: 500,
      testInfo,
    },
    async () => {
      const response = await api.post('/authorizations', {
        data: {
          amountMinor: 2599,
          currency: 'USD',
          scenario: testInfo.title,
        },
      });

      if (response.status() === 503) {
        throw new Error('HTTP 503 from payment sandbox');
      }

      if (!response.ok()) {
        throw new Error('Unexpected payment sandbox status ' + response.status());
      }

      return response.json() as Promise<{ id: string }>;
    },
  );

  await page.goto('/receipts/' + authorization.id);
  await expect(page.getByRole('heading', { name: 'Receipt' })).toBeVisible();
  await expect(page.getByText('USD 25.99')).toBeVisible();
});
\`\`\`

Notice the status handling. A 503 is retryable because the sandbox contract says it can be temporary. A 400, 401, 403, 404, or 422 is not retried here because those usually indicate invalid setup, broken credentials, a wrong route, or a contract mismatch. The point is not to create a universal HTTP retry library. The point is to state which failures are allowed at this test boundary.

You can make the classifier stricter by using custom error classes instead of message checks. That is often better when the code throwing the error is yours.

\`\`\`ts
// tests/support/errors.ts
export class TransientDependencyError extends Error {
  constructor(message: string, readonly dependency: string) {
    super(message);
    this.name = 'TransientDependencyError';
  }
}

export class ContractViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractViolationError';
  }
}
\`\`\`

Then the API wrapper can throw \`TransientDependencyError\` for documented transient failures and \`ContractViolationError\` for response shapes that should stop the test immediately. That approach is easier to review than a growing list of message substrings.

## Do Not Retry Locator Problems, Fix the Locator

Many requests for selective retry are actually locator problems wearing a retry costume. Playwright already auto-waits before actions and retries locator assertions until their timeout. If a button is not visible because the selector matches the wrong element, adding another layer of retries just repeats the same mistake.

Use semantic locators first, then add precise assertions around the state that should change. For example, when a save button triggers a toast, wait for the accessible toast text or status region. Do not retry the entire save flow because a CSS selector was brittle.

\`\`\`ts
// Better: assert the user-visible state through locators.
await page.getByRole('button', { name: 'Save profile' }).click();
await expect(page.getByRole('status')).toContainText('Profile saved');

// Risky: hides whether the click, selector, network call, or toast is wrong.
await retryOnAllowedError(
  { operation: 'ui:save-profile-flow', attempts: 3, delayMs: 500 },
  async () => {
    await page.locator('.save').click();
    await expect(page.locator('.toast')).toContainText('saved');
  },
);
\`\`\`

The second example is intentionally marked risky. It mixes UI action, selector choice, backend behavior, and assertion into one retry unit. If it passes on the third attempt, you still do not know what was unstable. If it fails, you have three noisy attempts to inspect. A good retry unit is small enough that its failure reason is meaningful.

| Failure symptom | Likely cause | Retry decision | Better diagnostic |
| --- | --- | --- | --- |
| \`getByRole\` never finds a button | Name changed or element inaccessible | Do not retry | Inspect accessibility tree and product copy |
| Click times out because element is covered | UI overlay, animation, or layout bug | Do not retry by default | Capture trace and screenshot before action |
| Sandbox POST returns 503 | Known dependency instability | Retry if documented | Attach status, body, and dependency name |
| Assertion sees old text after save | Missing wait, delayed event, or product bug | Prefer assertion timeout | Trace network and DOM update timing |
| Worker fixture cannot acquire test account | Shared resource contention | Retry fixture acquisition only | Log account ID and lock owner |

This is where a broad Playwright retry policy becomes dangerous. It treats all five rows the same. A selective policy forces you to name the row you are handling.

## Keep Retry Budgets Small and Observable

Retry budgets should be boring: a small number of attempts, short delays, and evidence in the report. Do not use long exponential backoff inside a UI test unless the suite is explicitly testing recovery after a long outage. A browser test that waits 90 seconds for a dependency to calm down is usually stealing feedback time from every engineer.

Use a table like this in your test strategy or suite README:

| Operation class | Allowed attempts | Delay guidance | Evidence required |
| --- | ---: | --- | --- |
| Third-party sandbox setup | 3 | 250 to 1000 ms | Status code, response body excerpt, dependency name |
| Test account lock acquisition | 2 | 500 ms | Account key and lock holder if known |
| Local container health check | 3 | 1000 ms | Container name and health endpoint |
| UI locator or assertion | 1 | Use Playwright assertion timeout | Trace, screenshot, locator |
| Contract validation | 1 | None | Actual payload and schema error |

The evidence requirement is not bureaucracy. It prevents silent retry creep. If a retry cannot produce useful evidence, it probably does not belong in the suite. When a flaky test appears in CI, the first question should be: "Which operation retried, and why was it allowed?"

You can add a tiny helper for structured attachments to avoid repeating JSON boilerplate.

\`\`\`ts
// tests/support/attach-json.ts
import type { TestInfo } from '@playwright/test';

export async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, {
    body: JSON.stringify(value, null, 2),
    contentType: 'application/json',
  });
}
\`\`\`

If your CI publishes the Playwright HTML report, those attachments are available to reviewers. If your team exports additional logs, keep the schema stable so you can aggregate retry reasons over time.

## Diagnose the Failure Mode Where Retries Create Duplicate State

A realistic failure mode: the first attempt reaches the backend and creates a resource, but the client times out before receiving the response. The retry sends the same create request again. If the API is not idempotent, the test now has duplicate data. The browser might show two rows, the cleanup might delete only one, or a later test might fail because a supposedly unique email already exists.

You diagnose this by correlating three records: retry attachments, backend request logs, and the resource identifier in test data. If attempt one and attempt two share the same logical operation but create different server IDs, the retry helper is amplifying the problem.

The fix is not "stop retrying everything." The fix is to make the retried operation idempotent or move the retry to a safe read boundary. For setup APIs, pass a deterministic scenario key or idempotency key when the provider supports it. If the provider does not support idempotency, restrict retries to cases where the request definitely did not reach the server, which is harder to prove from the client alone.

\`\`\`ts
const scenarioKey = 'receipt-' + testInfo.project.name + '-' + testInfo.retry;

const response = await api.post('/authorizations', {
  headers: {
    'Idempotency-Key': scenarioKey,
  },
  data: {
    amountMinor: 2599,
    currency: 'USD',
  },
});
\`\`\`

Do not invent idempotency semantics for an API that lacks them. The header above is only correct when your API or sandbox documents that it honors the key. If it does not, use your own test fixture service to create stable state before the browser test starts.

## Separate Retryable Infrastructure from Product Assertions

The cleanest Playwright files read like a sequence of boundaries. Fixture setup can have its own retry policy. Navigation and actions rely on Playwright's actionability checks. Assertions use locator assertions with meaningful timeouts. Product errors fail once.

\`\`\`ts
test('admin can approve a pending refund', async ({ page }, testInfo) => {
  const refund = await retryOnAllowedError(
    {
      operation: 'external-api:create-pending-refund',
      attempts: 3,
      delayMs: 500,
      testInfo,
    },
    () => createPendingRefund(testInfo.title),
  );

  await page.goto('/admin/refunds/' + refund.id);
  await page.getByRole('button', { name: 'Approve refund' }).click();

  await expect(page.getByRole('status')).toContainText('Refund approved');
  await expect(page.getByRole('row', { name: refund.id })).toContainText('Approved');
});
\`\`\`

The UI portion has no custom retry. That is intentional. If the approval button is disabled, if the status message says "Approval failed," or if the row remains pending, the test should fail directly. A selective retry policy is valuable precisely because it protects this signal.

When AI coding agents generate Playwright tests, ask them to name every retry boundary and include the classifier rule. This avoids the common generated-code habit of wrapping whole tests in homegrown loops. Ready-made QA skills install from qaskills.sh with the qaskills CLI, but even with those skills you still need team-specific allowlists for your own dependencies.

## Review Retry Changes Like Production Code

Retry policy changes deserve code review because they alter what failures reach the team. A reviewer should ask four questions. First, what exact operation is being retried? Second, which error types are allowed? Third, what evidence is attached? Fourth, what prevents duplicate side effects?

Use a small checklist in pull requests:

| Review question | Acceptable answer | Red flag |
| --- | --- | --- |
| Is the retried operation named? | Yes, with a domain boundary | Generic name like \`run flow\` |
| Are retryable errors narrow? | Specific class, status, or dependency condition | Any timeout, any error, or all failures |
| Is evidence attached? | Attempt number, reason, original error, operation | Only console logs |
| Is side effect safety handled? | Idempotency, safe read, or fixture cleanup | Retried create/update without a key |
| Are product assertions outside the helper? | Yes | Assertions hidden inside the retry block |

This review style is especially important when a flaky build is blocking a release. Pressure pushes teams toward broad retries. The short-term build turns green, but the suite becomes less useful. A narrow retry helper lets you reduce false noise without muting the alarm that matters.

## Measure Retry Reasons in CI

After selective retries are in place, aggregate the reasons. If "payment sandbox 503" appears twice a month, the helper is doing useful work. If it appears 200 times a week, the dependency or suite boundary needs attention. If "timeout allowed only for external API boundary" becomes the most common reason, check whether engineers are labeling too many operations as external.

A minimal local collector can read JSON attachments if you export them, but many teams start with a simpler convention: the helper also logs one structured line per retry. Keep that line stable.

\`\`\`ts
console.log(JSON.stringify({
  event: 'playwright_retry_attempt',
  operation: options.operation,
  attempt,
  retryable: decision.retryable,
  reason: decision.reason,
}));
\`\`\`

Then CI can count retry events from the job log. This is less rich than attachments, but it gives you a trend. Track retry count per suite, per dependency, and per test owner. If a retry reason grows for two consecutive weeks, open a stabilization issue. If a retry reason disappears for a month, remove the special case and let the suite fail normally if it returns.

## Frequently Asked Questions

### Can Playwright retry only one exception type with a config setting?

No. Playwright's documented retry setting applies to failed tests, not to selected exception classes. You can configure retries globally, by command line, or with \`test.describe.configure\`, but those retries rerun the test case. To retry only specific error types, implement a small helper around the operation that may throw that error, classify the thrown value, and fail immediately for anything outside the allowlist.

### Should I retry Playwright timeout errors?

Only after you know which timeout you are seeing. A timeout from a third-party setup request can be a valid transient dependency failure. A timeout from a locator assertion often means the application did not reach the expected state, the accessible name changed, or the selector is wrong. Classify by operation context, not by the word "timeout" alone, and keep traces for the first failed attempt.

### How many attempts should a selective retry use?

Use the smallest budget that absorbs the documented transient condition, commonly two or three attempts with short delays. Long retry loops make browser feedback slow and can multiply side effects. If a dependency needs many attempts to pass, the issue belongs in environment reliability work, not hidden inside every test. Track retry reasons in CI so the budget stays honest.

### Where should retry helpers live in a Playwright repo?

Put them under a shared test support directory, next to fixtures and test-data helpers, not inside individual spec files. Centralizing the helper makes the classifier reviewable and prevents every engineer or AI agent from inventing a different retry policy. Keep the API explicit: operation name, attempts, delay, classifier, and test evidence. Avoid helpers that accept a whole test body or hide assertions inside broad callbacks.
`,
};
