import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright test.step() & Annotations Guide 2026',
  description:
    'Structure Playwright tests with test.step(), test.info(), annotations, and attachments. Learn test.slow/fixme/skip, soft assertions, and richer HTML reports.',
  date: '2026-06-02',
  category: 'Guide',
  content: `
# Playwright test.step() & Annotations Guide 2026

A passing test tells you nothing went wrong. A **well-structured** test tells you exactly what it did, in what order, and where it broke when it fails. The difference between those two outcomes is almost entirely about how you organize a test internally — and Playwright gives you a precise toolkit for that: \`test.step()\` to group actions into named, reportable phases; \`test.info()\` to read and enrich the live metadata of the running test; annotations like \`test.slow\`, \`test.fixme\`, and \`test.skip\` to communicate intent to the runner; attachments to pin evidence to the report; and soft assertions to gather multiple failures in a single run. This guide is a complete, practical walkthrough of all of them using the \`@playwright/test\` runner in TypeScript.

Why invest in any of this? Because the HTML report is where you live when a CI run goes red, and a flat wall of raw actions is painful to debug. When you wrap the meaningful phases of a test in \`test.step()\`, the report renders a collapsible tree: "Sign in", "Add item to cart", "Checkout", each with its own duration and its own error if it failed. A reviewer sees at a glance that login succeeded and checkout broke, without scrolling through twenty low-level locator calls. Annotations layer on top of that, marking tests as known-broken, slow, or conditionally skipped, so the suite communicates its own health. Together they turn your test file into living documentation. If you want the broader testing foundation first, the [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) and [Playwright best practices for 2026](/blog/playwright-best-practices-2026) set the stage; this article zooms in on structure and reporting.

We will move from \`test.step()\` and step return values, through \`test.info()\` and its rich metadata, into the full set of annotations and their conditional forms, then attachments (screenshots, JSON, logs), soft assertions for multi-check tests, and finally how all of this surfaces in the HTML, JUnit, and custom reporters. A troubleshooting table and an FAQ round it out.

## test.step(): Grouping Actions Into Reportable Phases

\`test.step(title, body)\` runs the async \`body\` callback and records it as a named group in the report. It does not change what your test does — the same actions run in the same order — but it changes how the run is **presented** and how failures are **located**. Steps nest, so you can build a hierarchy that mirrors the user journey.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('checkout flow with named steps', async ({ page }) => {
  await test.step('Sign in', async () => {
    await page.goto('https://shop.example.com/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('secret');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
  });

  await test.step('Add item to cart', async () => {
    await page.goto('https://shop.example.com/product/123');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });

  await test.step('Complete checkout', async () => {
    await page.getByRole('link', { name: 'Checkout' }).click();
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByText('Order confirmed')).toBeVisible();
  });
});
\`\`\`

In the HTML report this renders as three collapsible nodes. If "Complete checkout" throws, the report highlights that node and shows the error inline, while the first two stand green — instant triage. Steps also each carry their own duration, so you can spot a phase that is silently getting slower over time.

Steps can **return values**, which is handy when an early phase produces data later phases need. The callback's return value becomes the step's resolved value.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('a step can return data for later phases', async ({ page, request }) => {
  const orderId = await test.step('Create order via API', async () => {
    const res = await request.post('/api/orders', { data: { sku: 'ABC', qty: 1 } });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    return body.id as string;
  });

  await test.step('Verify order appears in the UI', async () => {
    await page.goto(\`https://shop.example.com/orders/\${orderId}\`);
    await expect(page.getByRole('heading', { name: \`Order \${orderId}\` })).toBeVisible();
  });
});
\`\`\`

You can also nest steps for deeper structure, and wrap reusable helpers in a step so that page-object methods show up as named groups. A widely used pattern is to give every page-object action its own step via a decorator or wrapper so the report reads like prose. For complex flows, factor steps into your [Page Object Model](/blog/page-object-model-complete-guide) so each method both encapsulates locators and reports itself.

| \`test.step\` aspect | Behavior |
|---|---|
| Signature | \`test.step(title: string, body: () => Promise<T>, options?)\` |
| Return value | Resolves to whatever \`body\` returns (typed as \`T\`) |
| Nesting | Steps can contain steps; report shows the tree |
| On failure | The failing step is marked; the test stops (unless soft) |
| \`options.box\` | When true, hides the step's internals, showing only its name |

## test.info(): Reading and Enriching the Running Test

\`test.info()\` returns a \`TestInfo\` object describing the currently running test: its title, file, the project it runs under, the current retry number, timeout, expected vs actual status, and methods to add annotations and attachments at runtime. It is your programmatic handle on the test from **inside** the test body or a fixture. You reach for it constantly once you start customizing reports.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('inspect live metadata with test.info()', async ({ page }, testInfo) => {
  // testInfo is also injected as the second argument to the test function
  console.log('Title:', testInfo.title);
  console.log('Project:', testInfo.project.name);
  console.log('Retry:', testInfo.retry);

  await page.goto('https://example.com');

  // Adjust behavior on retries — e.g. extra logging only when re-running
  if (testInfo.retry > 0) {
    testInfo.annotations.push({ type: 'flaky-retry', description: \`retry #\${testInfo.retry}\` });
  }

  // Read the timeout the runner assigned to this test
  expect(testInfo.timeout).toBeGreaterThan(0);
});
\`\`\`

A particularly useful field is \`testInfo.status\` versus \`testInfo.expectedStatus\`, available in teardown, which lets a fixture capture diagnostics **only when a test failed**. This is the canonical way to attach a screenshot or page HTML on failure without bloating passing runs:

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

// A fixture that captures a screenshot only when the test fails
const test = base.extend<{ autoCapture: void }>({
  autoCapture: [
    async ({ page }, use, testInfo) => {
      await use();
      if (testInfo.status !== testInfo.expectedStatus) {
        const shot = await page.screenshot();
        await testInfo.attach('failure-screenshot', { body: shot, contentType: 'image/png' });
        await testInfo.attach('page-html', {
          body: await page.content(),
          contentType: 'text/html',
        });
      }
    },
    { auto: true },
  ],
});

test('uses the auto-capture fixture', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});
\`\`\`

The \`auto: true\` flag makes the fixture run for every test in the file without being explicitly requested, so every test gets failure diagnostics for free. For more on the fixture system itself, see the [Playwright fixtures complete reference](/blog/playwright-fixtures-complete-reference-2026).

## Annotations: skip, fixme, slow, fail, and Conditionals

Annotations communicate intent to the runner and the report. There are five core modifiers, each available in an **unconditional** form and a **conditional** form that takes a boolean plus a description. They can be applied to a single test, to a \`describe\` block, or at the top of a file via \`test.beforeEach\` patterns.

| Annotation | Effect | Conditional form |
|---|---|---|
| \`test.skip()\` | Do not run; mark skipped | \`test.skip(condition, reason)\` |
| \`test.fixme()\` | Do not run; mark as known-broken to fix | \`test.fixme(condition, reason)\` |
| \`test.fail()\` | Expect the test to fail; pass if it does | \`test.fail(condition, reason)\` |
| \`test.slow()\` | Triple the timeout for slow tests | \`test.slow(condition, reason)\` |
| \`test.only()\` | Run only this test (local debugging) | n/a |

\`\`\`typescript
import { test, expect } from '@playwright/test';

// Skip on a specific browser project, with a reason in the report
test('feature not supported on WebKit', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Feature uses an API WebKit lacks');
  await page.goto('https://example.com/feature');
  await expect(page.getByText('Enabled')).toBeVisible();
});

// Mark a known-broken test so it is reported separately from real failures
test('broken: discount code applies twice', async ({ page }) => {
  test.fixme(true, 'Bug TICKET-4821: discount double-applies; fix pending');
  // body left in place for when the fix lands
});

// Give a genuinely slow test extra headroom instead of a flaky timeout
test('large data export', async ({ page }) => {
  test.slow();
  await page.goto('https://example.com/export');
  await page.getByRole('button', { name: 'Export all' }).click();
  await expect(page.getByText('Export ready')).toBeVisible({ timeout: 60_000 });
});
\`\`\`

The distinction between \`skip\` and \`fixme\` matters for reporting hygiene. Use \`skip\` for tests that legitimately do not apply in a context (a mobile-only test on a desktop project). Use \`fixme\` for tests that **should** pass but are broken by a known bug — they show up in a separate "fixme" bucket so they are not forgotten and are not confused with environmental skips. \`test.fail()\` is the inverse: it asserts that a test currently fails, so the suite goes red if someone accidentally fixes the underlying behavior without removing the annotation, prompting a cleanup.

You can also attach **free-form annotations** that carry no behavior but enrich the report with metadata — a JIRA ticket, an issue link, a category. These appear on the test in the HTML report and can be filtered.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('annotated with issue links', async ({ page }) => {
  test.info().annotations.push(
    { type: 'issue', description: 'https://github.com/org/repo/issues/123' },
    { type: 'suite', description: 'smoke' },
  );
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});
\`\`\`

## Attachments: Pinning Evidence to the Report

Attachments tie arbitrary files or buffers to a test in the report. Beyond the automatic screenshot/video/trace captures Playwright can take, you often want to attach **your own** evidence: a JSON snapshot of API state, a downloaded file, a generated CSV, or a custom log. Use \`testInfo.attach(name, options)\`.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('attach custom evidence to the report', async ({ page, request }, testInfo) => {
  await page.goto('https://example.com');

  // Attach a JSON snapshot of backend state
  const res = await request.get('/api/health');
  await testInfo.attach('health-snapshot.json', {
    body: JSON.stringify(await res.json(), null, 2),
    contentType: 'application/json',
  });

  // Attach a full-page screenshot under a descriptive name
  await testInfo.attach('landing-page.png', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  // Attach a file already written to disk by its path
  await testInfo.attach('report.csv', { path: testInfo.outputPath('report.csv') });
});
\`\`\`

A useful detail: \`testInfo.outputPath(name)\` returns a unique, per-test path inside the test's output directory, so multiple workers and retries never clobber each other's files. Pair it with attaching by \`path\` for anything you generate to disk. Attachments render as downloadable links (or inline previews for images) in the HTML report, making post-mortem debugging far quicker than re-running locally. For deeper artifact handling — traces, videos, and the trace viewer — see the [Playwright trace viewer complete guide](/blog/playwright-trace-viewer-complete-guide-2026).

## Soft Assertions: Collecting Multiple Failures

By default, the first failed \`expect\` throws and ends the test, so you only ever see one failure per run. Sometimes you want to verify several independent facts about a page and learn about **all** the failures at once — for example checking that ten fields on a form all have the right defaults. \`expect.soft()\` records a failure but lets the test continue; at the end of the test, if any soft assertion failed, the test is marked failed and every soft failure is reported.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('verify a whole panel with soft assertions', async ({ page }) => {
  await page.goto('https://example.com/profile');

  // None of these stop the test on failure; all failures surface together
  await expect.soft(page.getByLabel('First name')).toHaveValue('Ada');
  await expect.soft(page.getByLabel('Last name')).toHaveValue('Lovelace');
  await expect.soft(page.getByLabel('Email')).toHaveValue('ada@example.com');
  await expect.soft(page.getByRole('img', { name: 'Avatar' })).toBeVisible();

  // A hard assertion afterward still stops the test if it fails
  await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
});
\`\`\`

Use soft assertions deliberately. They are ideal for **verification-heavy** tests where each check is independent and you want a complete picture in one run. They are a poor fit for **flow** tests where a later step depends on an earlier one succeeding — there, a hard failure that stops immediately is correct, because continuing after a broken precondition just produces noise. Combine soft assertions with steps for the best report: wrap each logical group of soft checks in its own \`test.step\` so failures are attributed to the right phase.

## How It All Surfaces in Reports

The payoff for steps, annotations, and attachments is visible across every reporter, with the HTML reporter being the richest. In the HTML report, steps appear as a collapsible tree with per-step timing; annotations show as colored tags on each test and can be filtered; attachments appear as downloadable links or inline image previews; skipped and fixme tests sit in their own filterable buckets; and soft-assertion failures are listed together under the failing test.

| Reporter | Steps | Annotations | Attachments |
|---|---|---|---|
| \`html\` | Full collapsible tree with timings | Tags, filterable | Links + inline image previews |
| \`list\` (CLI) | Inline indented lines | Shown as suffixes | Path references |
| \`junit\` | Flattened into the test case | Mapped to properties | Referenced by path |
| \`json\` | Nested \`steps\` array | \`annotations\` array | \`attachments\` array |
| custom reporter | Via \`onStepBegin\`/\`onStepEnd\` hooks | Via \`TestCase.annotations\` | Via \`TestResult.attachments\` |

To enable the HTML reporter and open it after a run:

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['html', { open: 'on-failure' }], // auto-open the report when something fails
    ['list'], // also stream a readable list to the console
  ],
});
\`\`\`

A custom reporter can consume the structured data directly — \`onStepBegin\` and \`onStepEnd\` give you each step, while \`onTestEnd\` exposes the test's annotations and attachments — letting you forward results to a dashboard or test-management tool. For a tour of the reporter ecosystem including Allure and JUnit, read the [Playwright test reporters guide](/blog/playwright-test-reporters-html-allure-junit-guide).

## Troubleshooting Steps and Annotations

| Symptom | Cause | Fix |
|---|---|---|
| Annotation seems ignored | Called after the action, not at the top | Put \`test.skip/slow/fixme\` at the start of the test body |
| Steps not nesting in the report | Steps run sequentially, not nested in code | Nest \`await test.step()\` calls inside one another |
| Attachment missing from report | Reporter does not surface it, or attach failed | Use the HTML reporter; \`await\` the \`attach\` call |
| Soft failures not shown | Test threw earlier on a hard assertion | Move hard assertions after the soft block, or make them soft |
| \`test.only\` left in CI | Forgot to remove it after debugging | Set \`forbidOnly: true\` in config for CI |
| fixme test still runs | Used the conditional form with a false condition | Pass \`true\` or call the no-arg form |
| Screenshot-on-failure missing | Capture fixture not marked \`auto\` | Add \`{ auto: true }\` to the fixture tuple |

A frequent mistake is calling an annotation too late. \`test.skip(condition, reason)\` must run **before** the actions it should skip — ideally as the very first line of the test body or in a \`beforeEach\`. Placed after navigation, it still skips, but you have already done work that the report then confusingly shows under a "skipped" test. Treat annotations as declarations of intent at the top of the test.

## Frequently Asked Questions

### What does test.step() actually do?

\`test.step(title, body)\` runs the \`body\` callback and records it as a named, collapsible group in the report with its own duration and error attribution. It does not change what the test does — the same actions run in order — but it makes runs far easier to read and failures trivial to locate, since a failing step is highlighted while passing steps stay green. Steps can nest and can return values.

### What is the difference between test.skip and test.fixme?

\`test.skip\` marks a test as not applicable in the current context (for example, a mobile-only test on a desktop project) and reports it as skipped. \`test.fixme\` marks a test that should pass but is broken by a known bug; it lands in a separate "fixme" bucket so it is tracked and not confused with environmental skips. Both have conditional forms that take a boolean and a reason string.

### How do I attach a screenshot only when a test fails?

Use a fixture that calls \`use()\`, then after the test compares \`testInfo.status\` to \`testInfo.expectedStatus\`; if they differ, the test failed, so capture \`page.screenshot()\` and call \`testInfo.attach()\`. Mark the fixture with \`{ auto: true }\` so it runs for every test without being requested. This adds diagnostics only on failure, keeping passing runs lean.

### What are soft assertions in Playwright?

\`expect.soft()\` records an assertion failure but lets the test keep running, so multiple independent checks all report their failures in a single run instead of stopping at the first. At the end, if any soft assertion failed, the test is marked failed. Use them for verification-heavy tests where checks are independent; avoid them in flow tests where a later step depends on an earlier one.

### How do I read information about the currently running test?

Call \`test.info()\` (or use the \`testInfo\` second argument to the test function) to get a \`TestInfo\` object with the title, file, project, retry count, timeout, status, and methods to add annotations and attachments at runtime. It is the programmatic handle for customizing behavior on retries or capturing diagnostics in teardown based on the final status.

### Does test.slow() make my test run faster?

No — it triples the test's timeout to give a genuinely slow test enough headroom to finish, preventing false timeout failures. It does not change execution speed. Use it for legitimately long operations like large exports or data migrations, and prefer it over hardcoding huge timeouts everywhere, since it scopes the extra time to the tests that need it.

### How do annotations show up in CI reports?

In the HTML reporter, annotations render as filterable colored tags on each test; skipped and fixme tests sit in their own buckets. The JSON reporter exposes an \`annotations\` array per test, JUnit maps them to properties, and custom reporters read them via \`TestCase.annotations\`. Free-form annotations (issue links, suite labels) flow through the same channels, making them searchable in the report.

### Can a test.step return a value I use later?

Yes. The step's callback return value becomes the step's resolved value, so you can do \`const orderId = await test.step('Create order', async () => { ... return id; })\` and use \`orderId\` in subsequent steps. This is the clean way to let an early phase produce data (an ID, a token) that later phases consume, all while keeping the report well structured.

## Conclusion

Structure is what turns a brittle wall of actions into a test you can trust and debug at a glance. \`test.step()\` groups your journey into named, timed, individually attributable phases. \`test.info()\` gives you a live handle to enrich the run and capture diagnostics exactly when they matter. Annotations — \`skip\`, \`fixme\`, \`fail\`, \`slow\` — let the suite communicate its own health, and attachments pin the evidence you need for fast post-mortems. Soft assertions collect every failure in verification-heavy tests so one run tells the whole story. Used together, they make your HTML, JUnit, and custom reports genuinely useful instead of merely green or red.

To have your AI coding agent write tests that come pre-structured with steps, annotations, and failure capture, install a Playwright skill from the [QA Skills directory](/skills). Keep building on the [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide), the [fixtures reference](/blog/playwright-fixtures-complete-reference-2026), and the rest of the [QA Skills blog](/blog).
`,
};
