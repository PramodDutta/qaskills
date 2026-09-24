import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright 1.63 New Features: Test Locks, Cross-Frame Locators, and Aria Traces',
  description: 'Playwright 1.63 new features explained for QA teams: test locks, frame locators, visible locators, richer traces, and reliable CI upgrade payoffs.',
  date: '2026-09-24',
  category: 'Guide',
  content: `
# Playwright 1.63 New Features: Test Locks, Cross-Frame Locators, and Aria Traces

Playwright 1.63 is a high-leverage release for QA teams that run large suites in parallel, debug accessibility-heavy failures, or maintain tests across embedded iframes. The headline Playwright 1.63 new features are named test locks, selectorless cross-frame \`frameLocator()\`, \`locator.visible()\`, structured step subtitles and params, aria and screen snapshots in traces, a built-in \`perfetto\` reporter, and browser updates to Chromium 153.0.8010.12, Firefox 155.0, and WebKit 26.6.

The practical payoff is not just new syntax. Test locks give teams a first-class way to serialize access to shared state without turning an entire project serial. Cross-frame locators reduce brittle iframe plumbing. Aria traces make failures easier to explain to accessibility reviewers and AI coding agents because the trace can show the rendered screenshot next to the accessibility snapshot. If your suite already uses parallel projects, shared tenant accounts, iframe-heavy widgets, or trace-first debugging, this release is worth planning rather than casually bumping.

The official sources for this guide are the Playwright release notes at https://playwright.dev/docs/release-notes and the GitHub release at https://github.com/microsoft/playwright/releases/tag/v1.63.0. The release was published on GitHub on September 4, 2026. Features below are attributed to 1.63 only when the 1.63 notes list them.

## Release Map for QA Leads

The fastest way to read Playwright 1.63 is as a coordination and observability release. It does not ask you to rewrite your suite, but it gives you cleaner primitives for the problems mature suites eventually hit: shared resources, iframe ambiguity, hidden duplicate elements, sparse trace context, and hard-to-read performance timelines.

| Area | New in 1.63 | Best first user | Upgrade risk |
|---|---|---|---|
| Parallel execution | Named \`lock\` on tests and describes | Suites that share accounts, queues, feature flags, or admin state | Medium if you overuse locks and flatten parallelism |
| Frames | \`page.frameLocator()\` and \`frame.frameLocator()\` without a selector | Apps with payment, auth, analytics, or embedded admin frames | Medium when the target appears in more than one frame |
| Locators | \`locator.visible()\` | Pages with hidden templates, menu portals, duplicated buttons | Low, but strict mode still matters |
| Reporting | \`test.step()\` accepts \`subtitle\` and \`params\` | Teams using custom reporters, trace review, or AI triage | Low, unless params include secrets |
| Tracing | \`snapshots: { dom, aria, screen }\` | Accessibility and design-system QA | Medium because traces can get larger |
| Runner output | \`--add-reporter\`, reporter \`omitTags\`, HTML step waterfall, \`perfetto\` reporter | CI owners and flake investigators | Low |
| Platform | Ubuntu 20.04 no longer supported | Docker and self-hosted runner owners | High if images are pinned to 20.04 |

If you recently adopted [Playwright 1.61 features](/blog/playwright-1-61-whats-new-adoption-guide), treat 1.63 as the next layer rather than a competing direction. Passkeys, storage, and video improvements from 1.61 make tests richer; 1.63 makes the suite easier to coordinate and inspect when that richness creates parallel pressure.

## Test Locks Replace Ad Hoc Serialization

Test locks are the most operationally important Playwright 1.63 new feature. A test can declare \`{ lock: "name" }\`, and tests with the same lock name never run concurrently across files, workers, and projects. Everything that does not hold the same lock remains parallel. \`test.describe()\` can also accept a \`lock\` for a whole group, and a test can hold multiple locks.

Before 1.63, teams often solved shared-resource conflicts by making a file serial, reducing workers, splitting projects by hand, or moving fragile tests into a nightly job. Those workarounds make one noisy test safer by slowing a much larger surface area. Locks let you serialize only the resource that is actually shared.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("admin can rotate the shared banner", { lock: "marketing-banner" }, async ({ page }) => {
  await page.goto("/admin/banner");
  await page.getByLabel("Message").fill("Maintenance window at 22:00 UTC");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("status")).toHaveText("Published");
});

test("support can update account limits", { lock: "tenant-42" }, async ({ page }) => {
  await page.goto("/admin/accounts/tenant-42");
  await page.getByLabel("Seat limit").fill("25");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Seat limit updated")).toBeVisible();
});
\`\`\`

A lock name should describe the resource, not the test. \`tenant-42\`, \`stripe-sandbox-account\`, \`global-feature-flags\`, and \`email-inbox-qa\` age better than \`billing-tests\` because unrelated tests can share a resource without pretending they belong to the same domain.

For describe-level coordination, use the smallest scope that owns the conflict:

\`\`\`ts
import { test, expect } from "@playwright/test";

test.describe("shared notification preferences", { lock: "notification-settings-user" }, () => {
  test("can enable product email", async ({ page }) => {
    await page.goto("/settings/notifications");
    await page.getByLabel("Product updates").check();
    await expect(page.getByRole("status")).toHaveText("Preferences saved");
  });

  test("can disable weekly digest", async ({ page }) => {
    await page.goto("/settings/notifications");
    await page.getByLabel("Weekly digest").uncheck();
    await expect(page.getByRole("status")).toHaveText("Preferences saved");
  });
});
\`\`\`

What people get wrong: they treat locks as a replacement for isolation. A lock prevents concurrent mutation, but it does not reset the resource. If a locked test changes an account setting and exits early, the next locked test can still inherit dirty state. The durable pattern is lock plus explicit setup and cleanup: put the resource into a known state through an API in \`beforeEach\`, and restore it in \`afterEach\` so an early exit cannot leak state to the next lock holder.

| Shared resource | Better than serial mode? | Add cleanup? | Notes |
|---|---:|---:|---|
| One test tenant | Yes | Yes | Lock tenant id, then reset users, flags, and limits |
| Global feature flag | Yes | Yes | Use one lock per flag family, not one suite-wide lock |
| Payment sandbox account | Yes | Yes | Keep idempotent API cleanup outside UI assertions |
| Email inbox | Usually | Usually | Better long-term fix is per-test inboxes |
| Local file path | Sometimes | Yes | If paths can be unique per worker, avoid the lock |

## Cross-Frame Locators Without Naming the Frame

Playwright 1.63 lets \`page.frameLocator()\` and \`frame.frameLocator()\` run without a selector. Called this way, Playwright searches in any frame of the subtree. You no longer need to identify the iframe element first.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("accepts the embedded fraud challenge", async ({ page }) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Pay now" }).click();

  await page.frameLocator().getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Payment complete" })).toBeVisible();
});
\`\`\`

This is especially useful when a provider changes iframe names, generates sandboxed iframes, or nests a challenge inside another frame. It also helps AI coding agents. When a human asks an agent to fix a test around an embedded widget, the agent often wastes time inspecting iframe selectors that are irrelevant to the user intent. A selectorless \`frameLocator()\` communicates the intent directly: find this accessible control in any frame under the page.

There is one important constraint. The rest of the locator resolves inside a single frame, like a regular locator, and Playwright throws when the match appears in several frames. That is good. Ambiguous cross-frame actions are exactly how payment tests click the wrong provider button.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("chooses the address inside the shipping iframe", async ({ page }) => {
  await page.goto("/checkout/shipping");

  const shippingForm = page.frameLocator().getByRole("form", { name: "Shipping address" });

  await shippingForm.getByLabel("Postal code").fill("94107");
  await shippingForm.getByRole("button", { name: "Use this address" }).click();

  await expect(page.getByText("Shipping address selected")).toBeVisible();
});
\`\`\`

Use the no-selector form for discovery and resilience, but keep role and text names precise. Anchoring on a named region such as the \`form\` above keeps the rest of the chain inside the right widget. If two embedded widgets both expose a \`Continue\` button, anchor on a region like that or give the controls more specific accessible names. Do not fall back to \`nth(0)\` unless the order is the behavior under test.

## Visible Locators Make Hidden Duplicates Less Painful

The new \`locator.visible()\` returns a locator that matches only visible elements. The release notes call it the recommended replacement for the \`:visible\` CSS pseudo-class.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("opens the active account menu", async ({ page }) => {
  await page.goto("/dashboard");

  const visibleMenuButton = page.getByRole("button", { name: "Account menu" }).visible();
  await visibleMenuButton.click();

  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
});
\`\`\`

This is a small API with outsized maintenance value. Design systems often keep hidden menu templates, off-canvas dialogs, inactive tabs, or responsive duplicate buttons in the DOM. A role locator can find both the hidden and visible versions. Previously, teams often mixed user-facing locators with CSS pseudo-classes, creating selectors that looked less like the accessibility tree the user actually interacts with. \`locator.visible()\` keeps the locator chain readable.

The failure mode to diagnose is strict mode ambiguity after filtering. If a locator still resolves to two visible buttons, the problem is not Playwright. Your page has two actionable controls with the same user-facing identity. Fix the accessible name, scope the locator to a region, or assert that only one is supposed to be visible.

| Pattern | 1.63 approach | Why it is safer |
|---|---|---|
| Hidden and visible duplicate buttons | \`getByRole(...).visible()\` | Keeps role semantics and visibility filtering separate |
| Responsive desktop/mobile nav | Scope to \`navigation\`, then \`.visible()\` | Avoids relying on DOM order |
| Portaled dialogs | \`getByRole("dialog").visible()\` | Matches what the user can perceive |
| Skeleton templates | Wait for stable user-facing content | Visibility alone is not a data-loaded assertion |

## Structured Steps Help Humans and Agents Read Runs

In Playwright 1.63, \`test.step()\` accepts \`subtitle\` and \`params\`. Reporters receive them through \`testStep.subtitle\` and \`testStep.params\`. Playwright API steps also report useful subtitles, such as the locator or navigation URL, and the HTML report and trace viewer render the step detail next to the title.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("refunds a settled order", async ({ page }) => {
  const orderId = "ORDER-1001";

  await test.step(
    "Open order",
    async () => {
      await page.goto(\`/admin/orders/\${orderId}\`);
      await expect(page.getByRole("heading", { name: orderId })).toBeVisible();
    },
    { subtitle: "admin order detail", params: { orderId } }
  );

  await test.step(
    "Issue refund",
    async () => {
      await page.getByRole("button", { name: "Refund" }).click();
      await page.getByRole("button", { name: "Confirm refund" }).click();
      await expect(page.getByText("Refund created")).toBeVisible();
    },
    { subtitle: "full amount", params: { orderId, amount: "full" } }
  );
});
\`\`\`

Structured params are not a dumping ground. Treat them like log fields in production. Include ids, feature flags, browser channel, tenant class, and scenario labels. Do not include passwords, bearer tokens, session cookies, raw addresses, or payment details. The trace viewer and reports are often uploaded as CI artifacts, and artifacts travel farther than local logs.

Custom reporters can use the new fields to send sharper events to dashboards:

\`\`\`ts
import type { Reporter, TestCase, TestResult, TestStep } from "@playwright/test/reporter";

class StepAuditReporter implements Reporter {
  onStepEnd(test: TestCase, result: TestResult, step: TestStep) {
    if (step.category !== "test.step") return;
    const event = {
      test: test.title,
      step: step.title,
      subtitle: step.subtitle,
      params: step.params,
      duration: step.duration
    };
    console.log(JSON.stringify(event));
  }
}

export default StepAuditReporter;
\`\`\`

For AI coding agents, structured steps reduce guesswork. A trace that says \`Issue refund\`, subtitle \`full amount\`, params \`orderId\`, and then shows a failing locator provides more context than a flat series of clicks. This is one of the places where ready-made QA skills installed from qaskills.sh with the qaskills CLI can help standardize how teams name steps and collect artifacts, but the underlying discipline still belongs in your test code.

## Aria and Screen Snapshots Change Trace Review

The \`snapshots\` option of \`tracing.start()\` and the \`trace\` fixture option can now accept an object that chooses what to capture on every action: \`dom\`, \`aria\`, and \`screen\`. With aria and screen snapshots recorded, the trace viewer's Display Aria mode shows the action screenshot alongside the aria snapshot, and hovering an aria node highlights it on the screenshot.

\`\`\`ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: {
    trace: {
      mode: "on-first-retry",
      snapshots: { dom: true, aria: true, screen: true }
    }
  }
});
\`\`\`

This matters for a class of failures that used to be awkward to debug. A screenshot might show a button that looks correct, while the accessibility snapshot reveals that the control has no name, is hidden from assistive technology, or is exposed as the wrong role. Before 1.63, QA engineers had to combine screenshots, DOM snapshots, and separate accessibility tooling to explain that gap. Now the trace can carry the visual and accessibility evidence together.

Use the heavier snapshot mode where it earns its storage cost. A practical setup is \`on-first-retry\` for PRs and \`on\` for nightly accessibility runs. For very large suites, measure artifact size before enabling all three snapshot types everywhere.

The same release adds \`locator.ariaSnapshotJSON()\` and \`page.ariaSnapshotJSON()\`, returning aria snapshots as JSON values instead of YAML markup, with \`mode\`, \`depth\`, and \`boxes\` options. JSON output is easier to post-process when you are building custom accessibility audits or feeding a focused artifact into an AI triage workflow.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("primary checkout actions remain accessible", async ({ page }) => {
  await page.goto("/checkout");

  const snapshot = await page.ariaSnapshotJSON({ depth: 4, boxes: true });
  const serialized = JSON.stringify(snapshot);

  expect(serialized).toContain("Pay now");
  expect(serialized).toContain("Order summary");
});
\`\`\`

That sample deliberately checks for presence before deeper structure. In real audit code, parse the JSON shape your app depends on and assert exact roles and names.

If your team is already trace-centric, pair this release with a deeper trace workflow such as the [Playwright trace viewer guide](/blog/playwright-trace-viewer-complete-guide-2026). 1.63 adds richer raw material; the review habit still determines whether it improves debugging time.

## Reporting, Perfetto, and CI Wiring

The new \`--add-reporter\` flag appends a reporter on top of the reporters in \`playwright.config\`. That is different from \`--reporter\`, which replaces configured reporters. This is useful in CI when a local config already produces HTML and list output, but a specific job needs GitHub annotations or a Perfetto timeline.

\`\`\`yaml
name: playwright-163

on:
  pull_request:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --add-reporter=github,perfetto
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: playwright-report-\${{ github.run_id }}
          path: playwright-report
\`\`\`

Artifact names cannot contain \`/\`, so keep report names flat. The example uses \`playwright-report-\${{ github.run_id }}\` rather than a branch path. Also note the runner image: Playwright 1.63 drops Ubuntu 20.04 support. If your CI uses old self-hosted runners or Docker images based on 20.04, upgrade the operating system before treating test failures as application regressions.

The built-in \`perfetto\` reporter writes a Trace Event Format file for Perfetto UI or \`chrome://tracing\`. Use it when your question is about scheduling and duration across workers, not just a single test failure. The HTML report also renders a duration waterfall next to test steps, which makes slow setup and teardown easier to spot.

The new reporter \`omitTags\` option for \`list\`, \`line\`, \`dot\`, \`github\`, and \`junit\` suppresses tags that Playwright automatically appends to test titles. This is useful when your test titles are already stable identifiers and appended tags create noisy test case names in external systems.

\`\`\`ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["list", { omitTags: true }],
    ["html", { open: "never" }],
    ["junit", { outputFile: "test-results/junit.xml", omitTags: true }]
  ],
  use: {
    trace: {
      mode: "retain-on-failure",
      snapshots: { dom: true, aria: true, screen: true }
    }
  }
});
\`\`\`

## Browser, Context, and CLI Details

Several 1.63 additions are smaller than locks or traces, but they remove real friction.

| Feature | Exact API or option | Practical use |
|---|---|---|
| Multiple HTTP credentials | \`httpCredentials\` accepts an array | Test several protected origins from one context |
| Origin private file system storage | \`browserContext.storageState({ opfs: true })\` | Persist and restore OPFS data for apps that store files in the browser |
| Dialog close events | \`page.on("dialogclosed")\`, \`browserContext.on("dialogclosed")\` | Assert a dialog was accepted, dismissed, or closed |
| Typed API response JSON | \`request.get<User>()\` and other methods | Reduce casts in TypeScript API setup |
| Standalone emulation options | \`reducedMotion\`, \`forcedColors\`, \`contrast\` | Move accessibility display settings out of broad device profiles |
| Browser install behavior | \`npx playwright install --no-remove\` | Keep browsers from other Playwright installs on shared machines |
| Codegen authentication | \`npx playwright codegen --http-credentials\` | Record behind HTTP basic authentication |

A typed API setup is straightforward:

\`\`\`ts
import { test, expect } from "@playwright/test";

type User = {
  id: string;
  status: "paid" | "settled";
};

test("loads a seeded paid user", async ({ request }) => {
  const response = await request.get<User>("/api/users/42");
  expect(response.ok()).toBe(true);

  const user = await response.json();
  expect(user.id).toBe("42");
  expect(user.status).toMatch(/^(paid|settled)$/);
});
\`\`\`

The type argument is compile-time only. It types what \`json()\` returns, but it does not validate the payload, so the runtime assertions still carry the weight. The regex is anchored for the same reason: a loose \`/paid|settled/\` would also accept a broken value such as \`unpaid\`.

## A Realistic Upgrade Failure Mode

The failure: after upgrading to 1.63, CI shows a burst of WebKit and Chromium install errors on older self-hosted Linux runners, followed by tests that never launch. The application did not change. Local macOS runs pass.

The likely diagnosis is platform drift. Playwright 1.63 no longer supports Ubuntu 20.04. If your runner is pinned to 20.04, or your Docker base image inherits old system libraries, browser installation and launch can fail before the test code is meaningful. Check the OS image first, then browser install logs, then app tests.

\`\`\`bash
node --version
npx playwright --version
npx playwright install --with-deps
npx playwright test --grep "@smoke" --project=chromium
\`\`\`

Once the runner is on a supported OS, run a small smoke subset (the \`--grep\` filter above) across projects, then enable trace capture on retry to inspect the first real behavior change.

## Adoption Checklist for Agent-Heavy Teams

AI coding agents can apply a Playwright upgrade quickly, but they need sharp constraints. Give the agent a checklist that distinguishes syntax migration from suite design.

1. Bump \`@playwright/test\` and \`playwright\` together.
2. Run \`npx playwright install --with-deps\` on the same OS image CI uses.
3. Replace broad serial suites with named locks only where a shared resource exists.
4. Convert \`:visible\` CSS locators to \`locator.visible()\` when the locator can remain role-based.
5. Use selectorless \`frameLocator()\` only when cross-frame search is intended, then make the inner locator specific.
6. Add \`subtitle\` and safe \`params\` to high-value \`test.step()\` blocks.
7. Enable aria and screen snapshots first on retry or on dedicated accessibility jobs.
8. Append CI-only reporters with \`--add-reporter\`, do not accidentally replace local reporters with \`--reporter\`.
9. Move runners off Ubuntu 20.04 before investigating browser-level failures.
10. Keep trace artifacts scrubbed of secrets and personal data.

## Frequently Asked Questions

### Is Playwright 1.63 mainly a flake-reduction release?

Partly, but not only. Test locks can reduce flakes caused by concurrent access to shared resources, and \`locator.visible()\` can reduce ambiguity from hidden duplicates. The trace and reporter changes are more about diagnosis than prevention. If a test is flaky because the app has unawaited async work, stale data, or a race in the product, 1.63 will not magically fix it. It can, however, make the race easier to isolate and keep unrelated tests parallel while one shared resource is protected.

### Should every shared account test get a lock?

Use locks when the shared account is genuinely unavoidable. A lock is the right short-term tool for global settings, third-party sandboxes, and legacy tenants that cannot be cloned per worker. It is not a substitute for per-test isolation. If you can create a user, inbox, tenant, or file namespace per test, do that instead. Locks serialize access, but they do not clean state, and too many broad locks quietly turn a fast parallel suite into a slow serial one.

### Are aria and screen snapshots safe to enable in all CI jobs?

They are safe functionally, but artifact size and data exposure need attention. Aria and screen snapshots can capture user-facing text, labels, and screenshots from the tested application. Enable them first on retry, failure, or accessibility-focused jobs, then measure storage and retention. Do not include secrets in step params, screenshots, or pages under test. For regulated products, review trace retention the same way you review logs and videos.

### Do I still need explicit iframe selectors after Playwright 1.63?

Often, yes. Selectorless \`frameLocator()\` is excellent when the frame host is unstable or nested, but it intentionally fails when the target appears in multiple frames. For repeated widgets, explicit scoping remains clearer. A good pattern is to use selectorless frame search for discovery, then anchor the frame with a heading, label, or known region. The goal is less iframe plumbing, not less precision.
`,
};
