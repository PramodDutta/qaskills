import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright 1.62 Release: New Features and Upgrade Notes',
  description: 'Playwright 1.62 release guide for QA teams: component stories, AbortSignal cancellation, WebP screenshots, isolated retries, and practical CI steps.',
  date: '2026-09-24',
  category: 'Guide',
  content: `
# Playwright 1.62 Release: New Features and Upgrade Notes

The Playwright 1.62 release is most important for teams that maintain component tests, visual baselines, long-running waits, retry-heavy CI, or agent-assisted test workflows. The official 1.62 notes list a new stories and galleries component testing model, \`AbortSignal\` support for most operations and web-first assertions, WebP screenshot support, \`Reporter.preprocess()\`, \`retryStrategy: "isolated"\`, passkey persistence through the \`credentials\` storage option, action-level \`scroll\`, \`apiResponse.timing()\`, \`locator.waitForFunction()\`, bundled \`npx playwright mcp\` and \`npx playwright cli\`, and the HTML reporter \`mergeFiles\` option.

For a QA lead, the release is less about one shiny feature and more about control. You can model component scenarios as stable stories instead of test-only component wiring. You can cancel work deliberately instead of waiting for a global timeout. You can shrink visual artifacts with WebP. You can move retries away from the main worker pool when a failed test might poison shared state. You can also start treating Playwright's MCP and CLI entry points as first-class tools for AI coding agents, while still keeping CI reproducible.

This guide is based on the official Playwright release notes at https://playwright.dev/docs/release-notes and the GitHub release at https://github.com/microsoft/playwright/releases/tag/v1.62.0. The GitHub release was published on July 24, 2026, followed by 1.62.1 bug fixes on July 30, 2026. The browser versions in 1.62.0 are Chromium 151.0.7922.34, Firefox 153.0, and WebKit 26.5, with stable-channel testing against Chrome 151 and Microsoft Edge 151.

## What Changed in the 1.62 Release

Playwright 1.62 has several features that look unrelated until you map them to mature-suite problems. Component tests need reusable scenarios. Visual tests need manageable baselines. Unbounded waits need local cancellation. Retries need to avoid interfering with clean first attempts. Reporters need a way to make decisions after configuration resolution but before execution.

| Release area | Exact feature | Primary payoff |
|---|---|---|
| Component testing | Stories and galleries with \`fixtures.mount()\` | Component scenarios become explicit ids with controlled props and providers |
| Cancellation | \`signal\` option using \`AbortSignal\` | Fail or abandon a specific operation without disabling normal timeouts |
| Visual testing | \`.webp\` snapshots and screenshot \`type: "webp"\` | Smaller image artifacts and baselines |
| Filtering | \`Reporter.preprocess()\` and \`TestRun\` | Custom skip, exclude, fixed, or failing decisions before the run starts |
| Retries | \`retryStrategy: "isolated"\` | Failed tests retry later, one by one, in a single worker |
| Browser context | \`credentials\` storage option | Persist virtual WebAuthn passkeys in storage state |
| Actions | \`scroll: "auto" | "none"\` | Prevent automatic scroll-into-view when scroll position is the behavior |
| Network | \`apiResponse.timing()\` | Inspect API resource timing without browser-side response plumbing |
| Evaluation | \`locator.waitForFunction()\` | Wait on element-derived state with a locator-aware API |
| Tooling | \`npx playwright mcp\`, \`npx playwright cli\` | Built-in tooling entry points for agents and automation |
| HTML report | \`mergeFiles: true\` | Enable merge-files grouping from config |

If you are catching up from earlier releases, read this alongside the [Playwright 1.60 release guide](/blog/playwright-1-60-release-guide-2026). Version 1.60 changed tracing and drag-and-drop testing in ways that pair naturally with 1.62's component and reporting updates.

## Component Stories Replace Test-Only Mount Wiring

The largest structural change in the Playwright 1.62 release is the new component testing model. Component testing moves to stories and galleries. A story wraps a component in one scenario: props, mocked data, providers, routing context, and any state needed to make the component meaningful. A gallery page that you serve renders those stories on demand. The \`fixtures.mount()\` fixture navigates to the gallery, mounts a story by id, and returns a \`Locator\` scoped to the story's root element.

That matters because many component test suites become miniature app bootstrappers. Every test creates providers, mocks network calls, invents props, and guesses how much of the application shell a component needs. The story model moves that setup into named scenarios that design, QA, and development can discuss.

\`\`\`tsx
import { test, expect } from "@playwright/test";

test("expanded invoice row exposes actions", async ({ mount }) => {
  const component = await mount("billing/InvoiceRow/ExpandedPaid");

  await expect(component.getByRole("heading", { name: "Invoice INV-1001" })).toBeVisible();
  await component.getByRole("button", { name: "More actions" }).click();
  await expect(component.getByRole("menuitem", { name: "Download PDF" })).toBeVisible();
});
\`\`\`

The returned locator can be updated and unmounted. Pass the story type (\`typeof\` the exported story) as a template argument to type-check props, then use \`update(props)\` or \`unmount()\` on the returned locator to re-render or tear down within a test. Story ids come from the file path under \`src/\` plus the export name, so \`settings/EmailToggle/Default\` is the \`Default\` export of \`src/settings/EmailToggle.story.tsx\`. Use this for state transitions that belong to the same scenario, not as a way to cram unrelated stories into one test.

\`\`\`tsx
import { test, expect } from "@playwright/test";
import type { Default as EmailToggleDefault } from "../src/settings/EmailToggle.story";

test("toggle story can be re-rendered with disabled state", async ({ mount }) => {
  const component = await mount<typeof EmailToggleDefault>("settings/EmailToggle/Default", {
    disabled: false,
    label: "Product updates"
  });

  await expect(component.getByRole("switch", { name: "Product updates" })).toBeEnabled();

  await component.update({ disabled: true, label: "Product updates" });
  await expect(component.getByRole("switch", { name: "Product updates" })).toBeDisabled();

  await component.unmount();
});
\`\`\`

What people get wrong: they mistake stories for snapshots. A story is not just a visual fixture. It should encode the meaningful state that a user or business rule cares about. \`EmptyCart\`, \`ThreeItemsWithCoupon\`, and \`PaymentDeclined\` are useful. \`BlueButtonLarge\` is only useful if the product actually has a supported variant by that name.

| Old component-test habit | 1.62 story-model replacement | Better review question |
|---|---|---|
| Inline props in every test | Named story id with typed updates | Is this a scenario the product supports? |
| Rebuilding providers in test files | Gallery owns providers and mocks | Which environment does this story represent? |
| Testing implementation classes | Locators scoped to the mounted root | What can the user perceive or operate? |
| One huge component fixture | Multiple story ids | Which state failed? |

## AbortSignal Gives Local Escape Hatches

Most operations and web-first assertions now accept a \`signal\` option that takes an \`AbortSignal\`. This lets you cancel long-running actions, navigations, waits, and assertions. The release notes are precise on one subtle point: providing a signal does not disable the default timeout. If you need no Playwright timeout, pass \`timeout: 0\` deliberately.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("cancels a slow export without waiting for the project timeout", async ({ page }) => {
  await page.goto("/reports");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1_000);

  try {
    await page.getByRole("button", { name: "Generate export" }).click({
      signal: controller.signal
    });
    await expect(page.getByText("Export queued")).toBeVisible({
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
});
\`\`\`

This is not a replacement for good timeouts. It is a precise cancellation tool for branches where the test has learned enough to stop waiting. For example, a health-check helper can race a product-specific ready signal against a deployment gate. A debug fixture can cancel optional log collection when the main assertion has already failed. An AI agent can add a bounded wait around a suspected hang without changing global config.

A common failure mode after adopting signals is swallowing the abort and pretending the test passed. An aborted operation is still evidence. Let the abort error fail the test unless cancellation is the behavior under test. When it is, abort after the product has started the work (for example, once the export job exists), then assert the product-side outcome through the UI or API: the job is marked cancelled, no file appears. Aborting before the click proves nothing, because the product never saw the request.

## WebP Screenshots Change Artifact Economics

Playwright 1.62 allows \`expect(page).toHaveScreenshot()\` and \`expect(locator).toHaveScreenshot()\` to store snapshots in WebP format by naming the snapshot with a \`.webp\` extension. The standalone \`page.screenshot()\` and \`locator.screenshot()\` APIs also accept \`webp\` as a type. Quality \`100\` is lossless by default, and lower values use lossy compression.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("pricing page visual baseline", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page).toHaveScreenshot("pricing-page.webp");
});

test("captures a compact card preview", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByTestId("team-plan").screenshot({
    path: "artifacts/team-plan.webp",
    type: "webp",
    quality: 80
  });
});
\`\`\`

The upgrade decision is not simply "convert everything to WebP." For visual comparisons, lossless WebP baselines can reduce storage while preserving pixel-level intent. For diagnostic screenshots, lossy WebP can be acceptable if the image is used for human triage and not exact comparison. Do not mix formats casually in one baseline directory unless your review tooling makes the format obvious.

| Screenshot use case | Recommended format | Quality guidance | Review concern |
|---|---|---|---|
| Visual regression baseline | Lossless WebP via \`.webp\` snapshot | Keep default quality \`100\` | Baseline churn during migration |
| Failure screenshot artifact | WebP or PNG | Use WebP if artifact size matters | Text legibility |
| Marketing-page comparison | Lossless WebP | Default first, tune later | Fonts and anti-aliasing |
| Long dashboard capture | WebP diagnostic image | Try a lower quality such as \`80\`, for artifacts only | Small chart labels |

When migrating, change one project or one baseline folder first. Run the visual suite twice on the same commit to prove deterministic baselines. Then compare artifact sizes. Any number you calculate here is environment-specific, so treat it as your data, not a universal benchmark.

## Reporter.preprocess Lets Policy Run Before Tests

\`Reporter.preprocess()\` is a new hook that runs after configuration is resolved and before \`reporter.onBegin()\`. It lets a reporter mark tests as skipped, excluded, fixed, or failing through a \`TestRun\` object. That is a powerful spot for suite policy because it has full suite visibility before workers start.

\`\`\`ts
import type { Reporter, Suite } from "@playwright/test/reporter";

type PreprocessArgs = {
  suite: Suite;
  testRun: {
    skip(test: unknown, reason?: string): void;
  };
};

class QuarantineReporter implements Reporter {
  async preprocess({ suite, testRun }: PreprocessArgs) {
    for (const test of suite.allTests()) {
      const hasQuarantineTag = test.tags.includes("@quarantined");
      if (hasQuarantineTag) {
        testRun.skip(test, "Quarantined by reporter policy");
      }
    }
  }
}

export default QuarantineReporter;
\`\`\`

Use this when the decision belongs to the run, not the test author. Examples include skipping tests linked to a known production incident, excluding a browser project during a vendor outage, or marking tests as expected failures during a controlled migration. Keep the policy observable. If a reporter silently removes tests, the team will lose trust in CI.

For plain title filtering you do not need a reporter at all. Playwright filters test titles with \`--grep\` or \`-g\`, and inverts with \`--grep-invert\` (shortened to \`-G\` in 1.61).

\`\`\`bash
npx playwright test --grep "@checkout"
npx playwright test -g "refund flow"
npx playwright test --grep-invert "@quarantined"
\`\`\`

## Isolated Retries Reduce Interference

The new \`testConfig.retryStrategy\` controls when failed tests are retried. The default \`"immediate"\` retries as soon as a worker is free. The new \`"isolated"\` strategy runs all retries at the end, one by one, in a single worker, to minimize interference with the rest of the suite.

\`\`\`ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 2,
  retryStrategy: "isolated",
  reporter: [["html", { mergeFiles: true }]]
});
\`\`\`

This is a good fit when a failed attempt may leave browser, account, or backend state dirty. Immediate retries are faster for independent tests. Isolated retries are calmer for suites where the retry itself must not compete with clean first attempts. The tradeoff is run duration. If many tests fail, retries at the end can make feedback feel delayed.

| Retry strategy | Behavior | Good fit | Watch out |
|---|---|---|---|
| \`"immediate"\` | Retry as soon as a worker is available | Mostly isolated tests, fast signal | Retry may run while related tests mutate shared state |
| \`"isolated"\` | Retry all failures at the end in one worker | Shared resources, suspected interference, noisy browsers | Longer tail when many failures happen |

Do not use retries to hide nondeterminism. A reliable retry policy still needs trace, video, server logs, and clear assertions. If a test passes only on retry, the suite is telling you something. The goal is to collect the signal without letting the retry contaminate the rest of the run.

## Storage, Actions, Network, and Evaluation APIs

Several 1.62 APIs are targeted, but each removes a workaround that QA engineers have probably written by hand.

The new \`credentials\` option includes the context's virtual WebAuthn credentials in storage state, so passkeys can be persisted and seeded into later contexts. It builds on the virtual authenticator that 1.61 exposed as \`browserContext.credentials\`: a setup test lets the app register a passkey once, and 1.62 saves it alongside cookies and storage.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("saves a registered passkey into storage state", async ({ page, context }) => {
  // Answer navigator.credentials.create() with Playwright's virtual authenticator.
  await context.credentials.install();

  await page.goto("/account/security");
  await page.getByRole("button", { name: "Add a passkey" }).click();
  await expect(page.getByText("Passkey added")).toBeVisible();

  await context.storageState({
    path: "playwright/.auth/passkey-user.json",
    credentials: true
  });
});
\`\`\`

The new action \`scroll\` option accepts \`"auto"\` or \`"none"\`. Use \`scroll: "none"\` when the scroll position is part of the behavior under test. For example, a sticky header bug can be hidden if Playwright automatically scrolls the target into view before clicking.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("sticky header does not cover the save button", async ({ page }) => {
  await page.goto("/settings/profile");
  await page.mouse.wheel(0, 900);

  await page.getByRole("button", { name: "Save profile" }).click({ scroll: "none" });
  await expect(page.getByRole("status")).toHaveText("Profile saved");
});
\`\`\`

\`apiResponse.timing()\` returns resource timing information for an API response. This is useful in setup code and API tests where you do not have a browser-side \`Response\` object but still want timing evidence.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("catalog API responds with timing metadata", async ({ request }) => {
  const response = await request.get("/api/catalog");
  expect(response.ok()).toBe(true);

  const timing = response.timing();
  // startTime is epoch milliseconds; responseEnd is milliseconds relative to startTime.
  expect(timing.startTime).toBeGreaterThan(0);
  expect(timing.responseEnd).toBeGreaterThanOrEqual(0);
  expect(timing.responseEnd).toBeLessThan(2_000);
});
\`\`\`

Read the units carefully: only \`startTime\` is an absolute timestamp. Every other field is an offset from it, and each one is \`-1\` when unavailable, which is always the case for responses replayed from a HAR file. The 2,000 ms budget above is a placeholder; set it from your own baseline.

\`locator.waitForFunction()\` waits until a function called with the matching element returns a truthy value. This can replace repeated \`evaluate\` loops when the condition belongs to one element.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("progress meter reaches complete state", async ({ page }) => {
  await page.goto("/imports/latest");

  const meter = page.getByRole("progressbar", { name: "Import progress" });
  await meter.waitForFunction(element => element.getAttribute("aria-valuenow") === "100");

  await expect(page.getByText("Import complete")).toBeVisible();
});
\`\`\`

The release also says \`page.evaluate()\` and related methods now accept functions as evaluate arguments, and \`page.addInitScript()\` plus \`browserContext.addInitScript()\` now accept functions as init-script arguments. For test code, that reduces stringly setup and makes TypeScript review easier.

## Bundled MCP and CLI for Agent Workflows

Playwright 1.62 bundles the Playwright MCP server and \`playwright-cli\`, runnable with \`npx playwright mcp\` and \`npx playwright cli\`. For teams using Claude Code, Cursor, Copilot, or other AI coding agents, this is a signal that browser automation is becoming a normal tool surface for agents rather than an external add-on.

Keep one boundary clear: an agent can use Playwright tools to inspect, generate, and debug, but CI remains the source of truth. Pin dependencies, keep browser installation in the workflow, and run the same project matrix that humans depend on.

\`\`\`yaml
name: playwright-162

on:
  pull_request:
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-24.04
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --project=\${{ matrix.browser }} --grep-invert "@quarantined"
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: playwright-\${{ matrix.browser }}-\${{ github.run_id }}
          path: playwright-report
\`\`\`

The artifact name avoids slashes, which \`upload-artifact\` rejects, and the matrix keeps one report per browser so a WebKit-only failure is easy to find.

## CI Upgrade Checklist

A Playwright 1.62 upgrade should be small if your suite is already current, but CI is where minor release work becomes visible. Use a checklist that separates dependency work from behavioral verification.

1. Upgrade \`@playwright/test\` and any direct \`playwright\` package together.
2. Run \`npx playwright install --with-deps\` on the target CI image.
3. Confirm the CI OS is not Debian 11, because 1.62 no longer supports Debian 11.
4. Run one smoke project without retries to detect immediate launch or fixture failures.
5. Run the full suite with current retries, then test \`retryStrategy: "isolated"\` on a branch if shared-state flakes dominate.
6. Convert one visual baseline area to WebP, then compare deterministic reruns before broad migration.
7. Move component tests toward story ids when touching them, rather than rewriting every component test in one pull request.
8. Add \`mergeFiles: true\` to HTML reporter config if your reviewers rely on merged file grouping.
9. Audit custom reporters for compatibility with \`preprocess()\` only if you actually need pre-run policy.
10. Update agent prompts and docs to mention \`npx playwright mcp\` and \`npx playwright cli\`, so agents use the bundled tools instead of installing separate copies.

If your organization already has a GitHub Actions setup, compare it with a full CI pattern such as the [Playwright CI GitHub Actions guide](/blog/playwright-ci-github-actions-complete-guide-2026). 1.62 does not require a new CI architecture, but it rewards clean artifacts, explicit browser projects, and accurate retry policy.

## Realistic Failure Mode: Component Tests Pass Locally but Fail in CI

The failure: after upgrading, a component test that mounts a story passes on a developer machine but fails in CI with missing provider state. The screenshot shows the component shell but not the loaded data. The team suspects Playwright, then retries the test until it sometimes passes.

The diagnosis path should start with the gallery, not the assertion. The new model depends on the served gallery page rendering stories on demand. If CI serves a stale build, misses mock files, or starts the gallery before generated story metadata exists, \`mount()\` can navigate correctly while the story itself is incomplete. Verify the build step that creates or serves the gallery, then inspect whether the story id exists in CI. Only after that should you tune waits.

\`\`\`bash
npm ci
npm run build
npx playwright test tests/components --project=chromium --grep "invoice row"
\`\`\`

If the test still fails, add a direct assertion that the story root rendered before interacting. Do not rely on a later click to prove setup. This is especially important when an AI agent generated the test from a visible component state. Agents are good at producing the happy interaction; they often under-specify the environment that made the story valid.

## What to Avoid During the Upgrade

Do not mix feature adoption with broad refactors. A 1.62 bump, component story migration, WebP baseline conversion, and retry policy change can each be safe alone. Together, they make failures hard to assign.

Do not convert all screenshots to lossy WebP because artifact size looks attractive. Visual comparisons should preserve the signal you review. Start lossless, then make a conscious decision for diagnostic-only images.

Do not move every flaky test to isolated retries and call the suite fixed. Isolated retries reduce interference, but they also make flake cost less visible. Keep a flake report that counts first-attempt failures.

Do not let \`Reporter.preprocess()\` become a hidden test router. If policy excludes or skips tests, publish the reason in reporter output, CI summaries, or both. Invisible filtering is how teams accidentally ship with a false sense of coverage.

Do not disable timeouts because \`AbortSignal\` exists. Signals and timeouts solve different problems. Timeouts protect the whole operation. Signals let the test cancel with its own local intent. Use both deliberately.

## Frequently Asked Questions

### Is Playwright 1.62 a required upgrade for component testing?

It is not mandatory if your current component tests are stable, but it is the direction new Playwright component testing work should follow. The stories and galleries model gives component states names, centralizes providers, and returns a locator scoped to the mounted story. That makes tests easier to review and easier for AI coding agents to repair. For large suites, migrate touched components first instead of freezing delivery for a full rewrite.

### Should I switch visual baselines to WebP immediately?

Start with a pilot. Use lossless WebP for a small baseline group, run it twice on the same commit, and confirm the review workflow is comfortable with the new format. WebP can reduce artifact pressure, but visual testing is only useful if reviewers trust what changed. Keep diagnostic screenshots and comparison baselines conceptually separate. Lossy WebP can be fine for human triage artifacts, but exact visual assertions should preserve comparison intent.

### When is retryStrategy isolated better than immediate?

\`retryStrategy: "isolated"\` is better when failed attempts may disturb shared state or when retry noise makes the rest of the suite harder to interpret. It runs retries at the end, one by one, in a single worker. Keep \`"immediate"\` for mostly independent tests where fast feedback matters more. If many tests fail, isolated retries can lengthen the tail of the run, so use failure volume and shared-resource risk to decide.

### Does AbortSignal replace Playwright timeouts?

No. The release notes explicitly state that providing a signal does not disable the default timeout. Use \`AbortSignal\` when the test has a local reason to cancel an operation, such as a bounded optional wait or a branch that should stop early. Use Playwright timeouts to protect actions and assertions from hanging. If you pass \`timeout: 0\`, do it intentionally and explain why in the helper or test.
`,
};
