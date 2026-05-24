import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Cucumber BDD Integration Guide 2026',
  description:
    'Complete guide to combining Playwright with Cucumber.js for BDD testing. Setup, World context, fixtures, parallel execution, tags, hooks, reporting, and CI integration for 2026.',
  date: '2026-05-06',
  category: 'BDD',
  content: `
# Playwright Cucumber BDD Integration Guide 2026

Playwright has become the dominant cross-browser automation library for JavaScript and TypeScript teams in 2026, displacing Selenium and WebDriverIO across new adoption. When teams want to combine Playwright's modern browser automation with Behavior-Driven Development, the typical approach is to pair Cucumber.js with Playwright via a custom World context. This combination gives you the best of both worlds: Playwright's powerful selectors, automatic waiting, and tracing -- alongside Cucumber's readable Gherkin scenarios and stakeholder-friendly reports.

This guide is a complete walkthrough for setting up Playwright + Cucumber.js from scratch in 2026. We cover project structure, World context patterns, hooks, parameterized scenarios, parallel execution, custom reporters, CI integration, and the common pitfalls that derail integration efforts. Every code sample is production-tested against Playwright 1.50+ and Cucumber.js 11+.

By the end you will have a fully working BDD + Playwright project with parallel execution, Allure reporting, and GitHub Actions integration -- ready to scale to hundreds of scenarios.

## Key Takeaways

- **Custom World class** holds the Playwright browser, context, and page references.
- **Hooks open and close browsers per scenario** for isolation.
- **Cucumber profile config** declares formatters, parallel workers, and require paths.
- **Tags drive which scenarios run** in CI vs nightly.
- **Allure or multiple-cucumber-html-reporter** produces stakeholder-ready HTML reports.

---

## 1. Project Setup

Start with a clean directory:

\`\`\`bash
npm init -y
npm install --save-dev @cucumber/cucumber @playwright/test typescript ts-node @types/node
npx playwright install --with-deps
\`\`\`

Add a tsconfig.json:

\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*", "features/**/*"]
}
\`\`\`

Add the cucumber profile config at the project root:

\`\`\`javascript
// cucumber.cjs
module.exports = {
  default: {
    paths: ["features/**/*.feature"],
    require: ["features/support/**/*.ts", "features/step_definitions/**/*.ts"],
    requireModule: ["ts-node/register"],
    format: [
      "summary",
      "progress-bar",
      "json:reports/cucumber.json",
      "html:reports/cucumber.html",
    ],
    parallel: 4,
    publishQuiet: true,
  },
};
\`\`\`

## 2. Custom World Class

Cucumber's World is the per-scenario state container. For Playwright we extend it with browser, context, and page handles:

\`\`\`typescript
// features/support/world.ts
import { setWorldConstructor, IWorldOptions, World } from "@cucumber/cucumber";
import { Browser, BrowserContext, Page, chromium } from "@playwright/test";

export interface ICustomWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  baseUrl: string;
  testData: Record<string, unknown>;
}

export class CustomWorld extends World implements ICustomWorld {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  baseUrl: string;
  testData: Record<string, unknown> = {};

  constructor(options: IWorldOptions) {
    super(options);
    this.baseUrl = process.env.BASE_URL || "http://localhost:3000";
  }
}

setWorldConstructor(CustomWorld);
\`\`\`

## 3. Hooks

Open a fresh browser context per scenario for clean state:

\`\`\`typescript
// features/support/hooks.ts
import { Before, After, BeforeAll, AfterAll, Status } from "@cucumber/cucumber";
import { chromium, Browser } from "@playwright/test";
import { ICustomWorld } from "./world";
import * as fs from "fs/promises";

let browser: Browser;

BeforeAll(async function () {
  browser = await chromium.launch({
    headless: process.env.HEADLESS !== "false",
    slowMo: process.env.SLOWMO ? Number(process.env.SLOWMO) : 0,
  });
});

AfterAll(async function () {
  await browser.close();
});

Before(async function (this: ICustomWorld) {
  this.browser = browser;
  this.context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: process.env.VIDEO === "true" ? { dir: "reports/videos/" } : undefined,
  });
  this.page = await this.context.newPage();
});

After(async function (this: ICustomWorld, scenario) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, "image/png");
    const trace = await this.context!.tracing.stop({
      path: \`reports/traces/\${Date.now()}.zip\`,
    }).catch(() => null);
  }
  await this.page?.close();
  await this.context?.close();
});
\`\`\`

## 4. Sample Feature File

\`\`\`gherkin
# features/checkout.feature
Feature: Checkout flow
  As a customer
  I want to checkout my cart
  So that I can purchase the items

  Background:
    Given the customer is logged in as "alice@example.com"
    And the cart contains:
      | Item    | Quantity |
      | Widget  | 2        |
      | Gadget  | 1        |

  @smoke @checkout
  Scenario: Successful checkout
    When the customer proceeds to checkout
    And the customer enters payment details
    And the customer confirms the order
    Then the order confirmation page should appear
    And the order total should be "89.97"

  @validation
  Scenario Outline: Checkout fails for invalid card
    When the customer proceeds to checkout
    And the customer enters card "<card>"
    And the customer confirms the order
    Then the error message should be "<error>"

    Examples:
      | card                | error                |
      | 4000-0000-0000-0002 | Card declined        |
      | 4000-0000-0000-9995 | Insufficient funds   |
\`\`\`

## 5. Step Definitions

Organize step definitions by domain:

\`\`\`typescript
// features/step_definitions/checkout.steps.ts
import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { ICustomWorld } from "../support/world";

Given("the customer is logged in as {string}", async function (this: ICustomWorld, email: string) {
  await this.page!.goto(\`\${this.baseUrl}/login\`);
  await this.page!.getByLabel("Email").fill(email);
  await this.page!.getByLabel("Password").fill("Sup3rS3cret!");
  await this.page!.getByRole("button", { name: "Sign in" }).click();
  await expect(this.page!).toHaveURL(/dashboard/);
});

Given("the cart contains:", async function (this: ICustomWorld, table: DataTable) {
  const rows = table.hashes();
  for (const row of rows) {
    await this.page!.goto(\`\${this.baseUrl}/catalog?q=\${row.Item}\`);
    await this.page!.getByRole("button", { name: "Add to cart" }).click();
    if (Number(row.Quantity) > 1) {
      const qty = this.page!.getByLabel("Quantity");
      await qty.fill(row.Quantity);
    }
  }
});

When("the customer proceeds to checkout", async function (this: ICustomWorld) {
  await this.page!.goto(\`\${this.baseUrl}/cart\`);
  await this.page!.getByRole("button", { name: "Proceed to checkout" }).click();
});

When("the customer enters payment details", async function (this: ICustomWorld) {
  await this.page!.getByLabel("Card number").fill("4242-4242-4242-4242");
  await this.page!.getByLabel("Expiry").fill("12/30");
  await this.page!.getByLabel("CVV").fill("123");
});

When("the customer enters card {string}", async function (this: ICustomWorld, card: string) {
  await this.page!.getByLabel("Card number").fill(card);
  await this.page!.getByLabel("Expiry").fill("12/30");
  await this.page!.getByLabel("CVV").fill("123");
});

When("the customer confirms the order", async function (this: ICustomWorld) {
  await this.page!.getByRole("button", { name: "Confirm order" }).click();
});

Then("the order confirmation page should appear", async function (this: ICustomWorld) {
  await expect(this.page!).toHaveURL(/order\\/confirmation/);
  await expect(this.page!.getByRole("heading", { name: /thank you/i })).toBeVisible();
});

Then("the order total should be {string}", async function (this: ICustomWorld, total: string) {
  await expect(this.page!.getByTestId("order-total")).toHaveText(\`$\${total}\`);
});

Then("the error message should be {string}", async function (this: ICustomWorld, error: string) {
  await expect(this.page!.getByRole("alert")).toContainText(error);
});
\`\`\`

## 6. Parallel Execution

Cucumber.js supports parallel execution out of the box. Set parallel in the profile config:

\`\`\`javascript
// cucumber.cjs
module.exports = {
  default: {
    parallel: 4,
    // ...
  },
};
\`\`\`

Or use the CLI:

\`\`\`bash
npx cucumber-js --parallel 4 --tags "@smoke"
\`\`\`

Each parallel worker runs scenarios independently with its own World instance, so the per-scenario browser context isolation continues to work correctly.

## 7. Reporting

Generate a polished HTML report with multiple-cucumber-html-reporter:

\`\`\`bash
npm install --save-dev multiple-cucumber-html-reporter
\`\`\`

\`\`\`javascript
// reporter.js
const reporter = require("multiple-cucumber-html-reporter");
reporter.generate({
  jsonDir: "reports/",
  reportPath: "reports/html",
  metadata: {
    browser: { name: "chrome", version: "131" },
    device: "CI",
    platform: { name: "linux", version: "22.04" },
  },
});
\`\`\`

Run after cucumber:

\`\`\`bash
npx cucumber-js && node reporter.js
\`\`\`

## 8. CI Integration

GitHub Actions:

\`\`\`yaml
name: BDD Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-22.04
    strategy:
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx cucumber-js --tags "@smoke" --parallel 2
        env:
          BASE_URL: http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: bdd-report-\${{ matrix.shard }}
          path: reports/
\`\`\`

## 9. Common Gotchas

| Gotcha | Solution |
|---|---|
| this.page is undefined in steps | Ensure Before hook ran before each scenario |
| World methods missing TypeScript types | Cast \`this: ICustomWorld\` on every step |
| Parallel scenarios sharing state | Move state into World, never globals |
| Browser not closing in CI | Always close in After + AfterAll |
| Slow CI runs | Reuse a single browser, fresh context per scenario |

## 10. AI-Assisted BDD Authoring

Pair this setup with the [playwright-cucumber](/skills) skill from the QASkills directory. It teaches Claude or Cursor to generate Gherkin scenarios plus matching Playwright step definitions in your project's style. See [cursor-playwright-skill-setup-guide](/blog) for installation.

## 11. Advanced Patterns

### Tag-Driven Browser Configuration
Configure which browser to use per scenario based on tags:

\`\`\`typescript
Before(async function (this: ICustomWorld, { pickle }) {
  const tags = pickle.tags.map(t => t.name)
  const browserName = tags.includes('@firefox') ? 'firefox' : tags.includes('@webkit') ? 'webkit' : 'chromium'
  this.browser = await { chromium, firefox, webkit }[browserName].launch({ headless: true })
  this.context = await this.browser.newContext()
  this.page = await this.context.newPage()
})
\`\`\`

### Tracing on Failure
Enable Playwright's trace viewer for richer failure diagnostics:

\`\`\`typescript
Before(async function (this: ICustomWorld) {
  await this.context!.tracing.start({ screenshots: true, snapshots: true, sources: true })
})

After(async function (this: ICustomWorld, scenario) {
  if (scenario.result?.status === Status.FAILED) {
    const path = \`reports/traces/\${Date.now()}.zip\`
    await this.context!.tracing.stop({ path })
    this.attach(\`Trace: \${path}\`, 'text/plain')
  } else {
    await this.context!.tracing.stop()
  }
})
\`\`\`

Open failed traces with: \`npx playwright show-trace reports/traces/<id>.zip\`

### API Setup via Playwright Request Context
Use Playwright's APIRequestContext to set up state without going through the UI:

\`\`\`typescript
Given('the user has 5 unread notifications', async function (this: ICustomWorld) {
  const api = await this.context!.request
  for (let i = 0; i < 5; i++) {
    await api.post(\`\${this.baseUrl}/api/notifications\`, {
      data: { userId: this.testData.userId, message: \`Test #\${i}\` },
    })
  }
})
\`\`\`

### Storage State Reuse
For tests that share login state, save and reuse storage state:

\`\`\`typescript
BeforeAll(async function () {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('http://localhost:3000/signin')
  await page.fill('[name=email]', 'alice@example.com')
  await page.fill('[name=password]', 'Sup3rS3cret!')
  await page.click('button[type=submit]')
  await context.storageState({ path: 'storage/alice.json' })
  await browser.close()
})
\`\`\`

Then in Before:

\`\`\`typescript
Before({ tags: '@auth-as-alice' }, async function (this: ICustomWorld) {
  this.context = await this.browser!.newContext({ storageState: 'storage/alice.json' })
  this.page = await this.context.newPage()
})
\`\`\`

## 12. Performance Optimization

For large BDD + Playwright suites, optimize CI runtime by:

- Reusing the browser across scenarios (open once in BeforeAll).
- Creating fresh contexts per scenario for isolation.
- Sharding scenarios across CI workers.
- Using --tags to skip slow scenarios in PR checks.
- Pre-seeding test data via API instead of clicking through forms.

## 13. CI/CD Recipes

### GitHub Actions with Sharding
\`\`\`yaml
jobs:
  bdd:
    runs-on: ubuntu-22.04
    strategy:
      matrix: { shard: [1, 2, 3, 4] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: |
          FEATURES=$(find features -name "*.feature" | sort | awk 'NR%4==\${{ matrix.shard }}-1' | tr '\\n' ' ')
          npx cucumber-js --parallel 2 $FEATURES
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: report-\${{ matrix.shard }}, path: reports/ }
\`\`\`

### Allure Reporting
Add allure-cucumberjs:

\`\`\`bash
npm install --save-dev allure-cucumberjs
\`\`\`

In cucumber.cjs:
\`\`\`javascript
format: ['allure-cucumberjs/reporter']
\`\`\`

Generate:
\`\`\`bash
npx allure generate reports/allure-results -o reports/allure --clean
npx allure open reports/allure
\`\`\`

## 14. Comparison with Playwright Test Native

Some teams skip BDD and use Playwright's native test runner with descriptive test names. Tradeoffs:

| Aspect | Playwright + Cucumber.js | Playwright Test |
|---|---|---|
| Setup | More complex | Simple |
| Readability for stakeholders | High (Gherkin) | Medium (test descriptions) |
| Parallel execution | Cucumber profile | Native |
| Reporting | Cucumber HTML/Allure | Native HTML |
| Refactoring | Step definition complexity | Simpler |
| Best for | Cross-functional collaboration | Engineering-only suites |

If stakeholders don't read scenarios, the BDD overhead is hard to justify. If they do, Cucumber's readability pays for itself.

## 15. AI-Assisted Authoring

The [playwright-cucumber](/skills) SKILL.md pack on QASkills teaches Claude or Cursor to generate scenario + step definition pairs in your house style. Install:

\`\`\`bash
npx @qaskills/cli add playwright-cucumber
\`\`\`

Then prompt:

> Generate a Cucumber feature for the password reset flow with 4 scenarios. Then generate matching Playwright step definitions using our existing page objects.

See [claude-code-qa-testing-workflows-2026](/blog) for concrete workflows.

## 16. Frequently Asked Questions

**Q: Can I use Playwright's expect inside step definitions?**
A: Yes -- import expect from @playwright/test and use it normally inside steps.

**Q: How do I share state between steps in the same scenario?**
A: Use the World instance via \`this.\`. Each scenario gets a fresh World, so state stays scoped.

**Q: Can I run Cucumber tests in headed mode for debugging?**
A: Yes -- set HEADLESS=false. The Before hook in this guide already respects that env var.

**Q: Does Playwright support iframes in BDD?**
A: Yes -- use frameLocator() in step definitions for iframe interactions.

**Q: Multi-tab scenarios?**
A: Use context.newPage() in steps to open additional tabs.

## Conclusion

Playwright + Cucumber.js is a powerful combination in 2026: the readability of Gherkin with the robustness of Playwright's modern selectors, automatic waits, and tracing. Set up the World class once, write disciplined hooks, and the rest is just authoring scenarios. For broader BDD strategy see [comparing-popular-bdd-frameworks-2026-complete-guide](/blog).
`,
};
