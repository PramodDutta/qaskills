import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cucumber.js to Playwright Migration Guide for 2026',
  description:
    'Migrate Cucumber.js BDD suites to Playwright in 2026. Gherkin to test scripts, step definitions to fixtures, World to Page, hooks, reports, and rollout plan.',
  date: '2026-05-13',
  category: 'Migration',
  content: `
# Cucumber.js to Playwright Migration Guide for 2026

Cucumber.js brought Gherkin-style BDD to the JavaScript ecosystem in the mid-2010s. Teams adopted it for the readability of \`Given/When/Then\` scenarios, the collaboration affordance for non-engineers, and the structured separation between feature files and step definitions. By 2026 some teams still find Cucumber's collaboration story valuable; others have concluded that the abstraction is more overhead than insight, and that direct Playwright tests express intent just as clearly while running faster and being easier to debug.

This guide is the migration playbook for teams maintaining real Cucumber.js suites who want to move to Playwright's native runner. It covers the conceptual shift from Gherkin scenarios to descriptive test names, step definitions to fixtures, the World object to the Playwright \`page\`, hooks to fixtures, parameter types, and reporting.

For broader testing references, browse [the blog index](/blog). For BDD and Playwright skills, see the [QA Skills directory](/skills).

## Why migrate from Cucumber.js to Playwright

Three reasons. First, speed: Playwright's runner parallelizes by test file and runs tens of milliseconds per action; Cucumber.js plus a WebDriver client typically runs three to five times slower. Second, debugging: Playwright's trace viewer, codegen, and UI mode are best-in-class; Cucumber's failure output requires correlating step definitions to feature files. Third, ergonomics: writing a typed Playwright test is faster than writing a feature file plus a step definition plus a glue function for many tasks.

The single best reason to keep Cucumber is genuine cross-role collaboration. If product, design, and QA collectively write and read \`.feature\` files, Cucumber pays for itself. If only QA reads them, the abstraction is overhead.

## Conceptual model

Cucumber separates intent (the \`.feature\` file) from implementation (the step definition). Playwright collapses these into a single async test function.

Before:

\`\`\`gherkin
Feature: Login
  Scenario: Successful login
    Given I am on the login page
    When I enter "admin@example.com" and "secret"
    And I click "Sign in"
    Then I should see the dashboard
\`\`\`

After:

\`\`\`typescript
test('successful login from the login page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\\/dashboard/);
});
\`\`\`

The Playwright test reads almost as naturally as the Gherkin scenario, with the benefit that the assertion is precise and the editor offers autocomplete and refactoring.

## API mapping table

| Cucumber.js | Playwright |
|---|---|
| \`Feature\` block | \`test.describe(name, fn)\` |
| \`Scenario\` | \`test(name, async ({page}) => {...})\` |
| \`Given/When/Then\` step | Lines inside the test function |
| Step definitions | Page objects or fixtures |
| \`World\` object | \`page\` fixture or test.extend |
| \`Background\` | \`test.beforeEach(...)\` |
| \`Scenario Outline\` + \`Examples\` | \`for (const ex of examples) test(\`name \${ex.id}\`, ...)\` |
| Tags (\`@smoke\`) | \`test.describe.parallel\` + tag in name |
| Hooks (\`Before/After\`) | \`test.beforeEach/afterEach\` or fixtures |
| Parameter types | TypeScript types |
| Cucumber HTML report | Playwright HTML report |

## Step-by-step migration plan

1. **Day 1** - Install Playwright. Pick a single feature file; port it to one \`test()\` and run it.
2. **Days 2 to 4** - Port the smoke feature files. Establish the page object pattern.
3. **Days 5 to 10** - Bulk port. Reuse step-definition logic by extracting page methods.
4. **Day 11** - Wire CI. Decide whether to keep Cucumber for stakeholder readability.
5. **Day 12** - Cutover. Delete Cucumber, gherkin parser, and related dependencies.

## Before and after: a full feature

**Cucumber.js (before)**

\`feature/login.feature\`:

\`\`\`gherkin
Feature: Login
  Background:
    Given I am on the login page

  Scenario: Successful login
    When I enter "admin@example.com" and "secret"
    And I click "Sign in"
    Then I should see the dashboard

  Scenario: Failed login
    When I enter "wrong@example.com" and "wrong"
    And I click "Sign in"
    Then I should see an error message
\`\`\`

\`features/step_definitions/login.steps.ts\`:

\`\`\`typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ICustomWorld } from '../support/custom-world';

Given('I am on the login page', async function (this: ICustomWorld) {
  await this.page!.goto('/login');
});

When('I enter {string} and {string}', async function (this: ICustomWorld, email: string, password: string) {
  await this.page!.getByLabel('Email').fill(email);
  await this.page!.getByLabel('Password').fill(password);
});

When('I click {string}', async function (this: ICustomWorld, text: string) {
  await this.page!.getByRole('button', { name: text }).click();
});

Then('I should see the dashboard', async function (this: ICustomWorld) {
  await expect(this.page!).toHaveURL(/\\/dashboard/);
});

Then('I should see an error message', async function (this: ICustomWorld) {
  await expect(this.page!.getByRole('alert')).toBeVisible();
});
\`\`\`

**Playwright (after)**

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('successful login', async ({ page }) => {
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('secret');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\\/dashboard/);
  });

  test('failed login', async ({ page }) => {
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
\`\`\`

The Playwright version is a single file. The step definition glue disappears, the World object is just \`page\`, and the readability is comparable to the Gherkin.

## Hooks: Background to beforeEach

| Cucumber | Playwright |
|---|---|
| \`Background:\` | \`test.beforeEach(...)\` |
| \`Before({ tags: '@smoke' }, fn)\` | \`test.beforeEach(...)\` in a tagged \`describe\` |
| \`After(fn)\` | \`test.afterEach(...)\` |
| \`BeforeAll(fn)\` | \`test.beforeAll(...)\` or \`globalSetup\` |
| \`AfterAll(fn)\` | \`test.afterAll(...)\` or \`globalTeardown\` |

## Scenario Outline to parameterized tests

A Cucumber \`Scenario Outline\` with \`Examples\` table becomes a \`for\` loop in Playwright.

\`\`\`typescript
const cases = [
  { email: 'a@b.com', password: 'good', shouldSucceed: true },
  { email: 'a@b.com', password: 'bad', shouldSucceed: false },
];

for (const { email, password, shouldSucceed } of cases) {
  test(\`login with \${email} succeeds=\${shouldSucceed}\`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    if (shouldSucceed) {
      await expect(page).toHaveURL(/\\/dashboard/);
    } else {
      await expect(page.getByRole('alert')).toBeVisible();
    }
  });
}
\`\`\`

## Tags

Cucumber tags (\`@smoke\`, \`@critical\`) become tags in Playwright via test annotations.

\`\`\`typescript
test('smoke: login', { tag: '@smoke' }, async ({ page }) => {
  // ...
});
\`\`\`

Run only smoke: \`npx playwright test --grep @smoke\`.

## Page objects from step definitions

If your step definitions have grown rich, distill them into page objects.

\`\`\`typescript
export class LoginPage {
  constructor(public readonly page: Page) {}
  async goto() { await this.page.goto('/login'); }
  async loginAs(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}
\`\`\`

Then tests become:

\`\`\`typescript
test('logs in', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.loginAs('a@b.com', 'secret');
  await expect(page).toHaveURL(/\\/dashboard/);
});
\`\`\`

## Reports

Cucumber.js teams typically use \`cucumber-html-reporter\` or \`multiple-cucumber-html-reporter\`. Playwright ships with an excellent HTML reporter and supports Allure via \`allure-playwright\`.

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  reporter: [['html'], ['list'], ['allure-playwright']],
});
\`\`\`

## CI changes

Replace the Cucumber command with Playwright in package.json:

\`\`\`json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:smoke": "playwright test --grep @smoke"
  }
}
\`\`\`

## Gotchas and breaking changes

1. **Step definition reuse becomes page object methods.** Move logic to shared classes.
2. **Gherkin readability is gone.** Choose descriptive test names to compensate.
3. **Data tables become arrays of objects.** Plain JS, easier than Cucumber's DataTable.
4. **Scenario state shared via World** becomes shared via fixtures.
5. **\`@cucumber/cucumber\` glue (\`Given/When/Then\`) is unused.** Delete the dependency.
6. **Parameter types (\`{string}\`, \`{int}\`)** become TypeScript types.
7. **Cucumber tags become Playwright annotations.** Different syntax, same intent.
8. **Pretty formatter output disappears.** Playwright's reporter is different but at least as informative.
9. **\`AfterStep\` hooks become \`test.afterEach\` with conditional logic.** Same intent.
10. **Non-engineers may resist losing feature files.** Communicate the trade-off and address concerns.

## Migration checklist

- [ ] Audit current feature files; identify shared step definitions.
- [ ] Install Playwright in a sibling directory.
- [ ] Port the smoke feature first; establish the page object pattern.
- [ ] Translate Background to beforeEach.
- [ ] Translate Scenario Outline to parameterized tests.
- [ ] Translate tags to Playwright annotations.
- [ ] Translate hooks to fixtures or beforeEach/afterEach.
- [ ] Move step-definition logic into page objects.
- [ ] Decide on reporter strategy.
- [ ] Wire Playwright into CI; keep Cucumber green in parallel for one sprint.
- [ ] Delete Cucumber dependencies.
- [ ] Train team on the trace viewer.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

If your team genuinely uses Gherkin for cross-role collaboration with product and design, and \`.feature\` files are read by non-engineers, the migration is a net negative. Keep Cucumber. If only QA reads the feature files, migrate.

## Conclusion and next steps

The Cucumber.js-to-Playwright migration is mechanical for the bulk of code. Page objects absorb the step definitions; descriptive test names absorb the Gherkin; tags absorb the tag annotations. The result is a faster, simpler, more debuggable suite, at the cost of losing the natural-language layer.

Start with one feature file. Decide whether the natural-language layer is providing real value. If yes, stop and stay on Cucumber. If no, bulk port the rest.

Next read: explore the [QA Skills directory](/skills) for Playwright and BDD skills, and the [blog index](/blog) for more migration guides.
`,
};
