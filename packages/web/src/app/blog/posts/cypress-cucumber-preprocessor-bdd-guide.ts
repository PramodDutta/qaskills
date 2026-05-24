import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Cucumber Preprocessor BDD Guide 2026',
  description:
    'Complete guide to BDD with Cypress using the cypress-cucumber-preprocessor plugin. Setup, feature files, step definitions, tags, hooks, reporting, parallel CI, and best practices for 2026.',
  date: '2026-05-05',
  category: 'BDD',
  content: `
# Cypress Cucumber Preprocessor BDD Guide 2026

Cypress is the dominant end-to-end testing framework for JavaScript front-end teams in 2026, and many of them want to combine its developer-friendly API with Behavior-Driven Development. The cypress-cucumber-preprocessor plugin makes this possible: write Gherkin feature files, bind them to step definitions in TypeScript, and run them through Cypress just like any other spec. The result is the readability of BDD with the runtime power of Cypress -- network stubbing, time-travel debugging, automatic retries, and parallel execution.

This guide is the most complete walkthrough you will find for cypress-cucumber-preprocessor in 2026. We cover installation, configuration, feature file structure, step definitions in TypeScript, tags and hooks, parallel execution, reporting, common gotchas, and integration with CI/CD pipelines. Everything is tested against the current 20.x line of the plugin running on Cypress 14.x.

By the end you will have a production-ready BDD setup with Cypress that scales to hundreds of scenarios, integrates with GitHub Actions and Cypress Cloud, and produces stakeholder-friendly reports. Snippets are all in TypeScript because that is what 2026 Cypress teams use; the same patterns work in plain JavaScript with minor tweaks.

## Key Takeaways

- **cypress-cucumber-preprocessor** is the official-style BDD plugin for Cypress.
- **Feature files live in cypress/e2e/** alongside ordinary specs.
- **Step definitions are loaded automatically** via the preprocessor's file convention.
- **Tags integrate with Cypress's grep capability** to filter scenarios.
- **Parallel execution works through Cypress Cloud** or sharded GitHub Actions matrix.

---

## 1. Installation

For a fresh Cypress project, install the preprocessor and esbuild integration:

\`\`\`bash
npm install --save-dev cypress @badeball/cypress-cucumber-preprocessor @bahmutov/cypress-esbuild-preprocessor esbuild
\`\`\`

Configure cypress.config.ts to use the preprocessor:

\`\`\`typescript
import { defineConfig } from "cypress";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import createEsbuildPlugin from "@badeball/cypress-cucumber-preprocessor/esbuild";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.feature",
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on(
        "file:preprocessor",
        createBundler({ plugins: [createEsbuildPlugin(config)] })
      );
      return config;
    },
  },
});
\`\`\`

Add a .cucumberrc.json at project root:

\`\`\`json
{
  "stepDefinitions": [
    "cypress/e2e/[filepath]/**/*.{js,ts}",
    "cypress/support/step_definitions/**/*.{js,ts}"
  ],
  "filterSpecs": true,
  "omitFiltered": true
}
\`\`\`

## 2. Feature File Structure

Place feature files in cypress/e2e/. The convention is to colocate step definitions next to the feature file or in cypress/support/step_definitions/.

\`\`\`gherkin
# cypress/e2e/auth/signup.feature
Feature: User signup

  Background:
    Given the user opens the signup page

  @smoke @signup
  Scenario: New user creates an account
    When the user fills the signup form with:
      | field    | value                |
      | name     | Alice                |
      | email    | alice@example.com    |
      | password | Sup3rS3cret!         |
    And the user submits the form
    Then the user should be redirected to the dashboard
    And the welcome message should contain "Alice"

  @validation
  Scenario Outline: Signup fails for invalid input
    When the user fills the email field with "<email>"
    And the user fills the password field with "<password>"
    And the user submits the form
    Then the error message should contain "<error>"

    Examples:
      | email             | password    | error                |
      | not-an-email      | Sup3rS3cret!| Invalid email        |
      | valid@example.com | short       | Password too short   |
      | duplicate@x.com   | Sup3rS3cret!| Email already in use |
\`\`\`

## 3. Step Definitions in TypeScript

The corresponding step definitions live in cypress/e2e/auth/signup.ts (colocated) or cypress/support/step_definitions/auth.ts (shared):

\`\`\`typescript
// cypress/e2e/auth/signup.ts
import { Given, When, Then, DataTable } from "@badeball/cypress-cucumber-preprocessor";

Given("the user opens the signup page", () => {
  cy.visit("/signup");
  cy.findByRole("heading", { name: /create account/i }).should("be.visible");
});

When("the user fills the signup form with:", (table: DataTable) => {
  const rows = table.rowsHash();
  if (rows.name) cy.findByLabelText(/name/i).type(rows.name);
  if (rows.email) cy.findByLabelText(/email/i).type(rows.email);
  if (rows.password) cy.findByLabelText(/password/i).type(rows.password);
});

When("the user fills the email field with {string}", (email: string) => {
  cy.findByLabelText(/email/i).clear().type(email);
});

When("the user fills the password field with {string}", (password: string) => {
  cy.findByLabelText(/password/i).clear().type(password);
});

When("the user submits the form", () => {
  cy.findByRole("button", { name: /sign up/i }).click();
});

Then("the user should be redirected to the dashboard", () => {
  cy.location("pathname").should("eq", "/dashboard");
});

Then("the welcome message should contain {string}", (name: string) => {
  cy.findByTestId("welcome").should("contain.text", name);
});

Then("the error message should contain {string}", (text: string) => {
  cy.findByRole("alert").should("contain.text", text);
});
\`\`\`

## 4. Hooks: Before, After, BeforeAll, AfterAll

Hooks work via cypress/support/e2e.ts plus the cucumber-preprocessor hook API:

\`\`\`typescript
// cypress/support/e2e.ts
import { Before, After, BeforeAll, AfterAll } from "@badeball/cypress-cucumber-preprocessor";

BeforeAll(() => {
  cy.task("db:seed");
});

Before({ tags: "@smoke" }, () => {
  cy.intercept("POST", "/api/track", { statusCode: 200, body: {} });
});

After(function () {
  const { name, result } = this.currentTest!;
  if (result === "failed") {
    cy.screenshot(\`failure-\${name}\`, { capture: "fullPage" });
  }
});

AfterAll(() => {
  cy.task("db:cleanup");
});
\`\`\`

The corresponding tasks in cypress.config.ts:

\`\`\`typescript
e2e: {
  setupNodeEvents(on, config) {
    on("task", {
      "db:seed": async () => {
        await require("./scripts/seed-db").seed();
        return null;
      },
      "db:cleanup": async () => {
        await require("./scripts/seed-db").cleanup();
        return null;
      },
    });
  },
}
\`\`\`

## 5. Tags and Filtering

Tags annotate scenarios and let you run a subset:

\`\`\`bash
npx cypress run --env tags="@smoke and not @wip"
\`\`\`

The .cucumberrc.json's \`filterSpecs: true\` and \`omitFiltered: true\` ensure that Cypress only loads spec files containing matching scenarios. Without these flags, Cypress will load every .feature file even if you filter at the scenario level, which wastes startup time.

Common tag conventions:

| Tag | Meaning |
|---|---|
| @smoke | Quick critical-path checks (runs on every commit) |
| @regression | Full suite (runs nightly) |
| @wip | Work-in-progress, excluded from CI |
| @flaky | Known-flaky scenarios under investigation |
| @api | Pure API tests, no UI |
| @visual | Visual regression checks |

## 6. Data Tables and Doc Strings

Cypress-cucumber-preprocessor exposes the standard DataTable and DocString primitives:

\`\`\`gherkin
Scenario: Profile update preserves audit fields
  Given the user is logged in
  When the user updates their profile with:
    """
    {
      "name": "Alice Smith",
      "phone": "+1-555-0100"
    }
    """
  Then the profile should be updated
\`\`\`

The step definition:

\`\`\`typescript
When("the user updates their profile with:", (docString: string) => {
  const payload = JSON.parse(docString);
  cy.intercept("PATCH", "/api/profile").as("update");
  cy.findByLabelText(/name/i).clear().type(payload.name);
  cy.findByLabelText(/phone/i).clear().type(payload.phone);
  cy.findByRole("button", { name: /save/i }).click();
  cy.wait("@update").its("response.statusCode").should("eq", 200);
});
\`\`\`

## 7. Parallel Execution

Cypress Cloud handles parallel execution natively. In CI, run with the --parallel flag and a record key:

\`\`\`yaml
# .github/workflows/cypress.yml
jobs:
  cypress-run:
    runs-on: ubuntu-22.04
    strategy:
      matrix:
        machines: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: cypress-io/github-action@v6
        with:
          record: true
          parallel: true
          group: bdd
        env:
          CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
\`\`\`

Without Cypress Cloud, shard the feature files manually:

\`\`\`yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: npx cypress run --env tags="@smoke" --spec "cypress/e2e/group\${{matrix.shard}}/**/*.feature"
\`\`\`

## 8. Reporting

The preprocessor emits Cucumber JSON; pair it with multiple-cucumber-html-reporter for branded HTML:

\`\`\`json
{
  "scripts": {
    "report:html": "node scripts/generate-report.js"
  }
}
\`\`\`

\`\`\`javascript
// scripts/generate-report.js
const reporter = require("multiple-cucumber-html-reporter");
reporter.generate({
  jsonDir: "cypress/results/cucumber-json",
  reportPath: "cypress/results/html",
  metadata: {
    browser: { name: "chrome", version: "131" },
    device: "CI",
    platform: { name: "linux", version: "22.04" },
  },
});
\`\`\`

## 9. Common Gotchas

| Gotcha | Solution |
|---|---|
| Step definitions not found | Check .cucumberrc.json stepDefinitions glob and ensure files import the cucumber-preprocessor hooks |
| TypeScript errors in feature files | Add cypress/e2e to tsconfig include and install @types for cucumber-preprocessor |
| Slow test discovery | Set filterSpecs and omitFiltered to true |
| Tag expressions not working | Use single quotes for tags in CLI: --env tags='@smoke and not @wip' |
| Hooks executing in wrong order | BeforeAll/AfterAll run once per spec file, not per feature |

## 10. AI-Assisted Scenario Authoring

In 2026, AI agents help author scenarios consistently. The [QASkills directory](/skills) has a cypress-cucumber-preprocessor SKILL.md pack that teaches Claude or Cursor to generate feature files plus matching step definitions in your codebase's style. See [cursor-skills-md-best-practices](/blog) for setup.

## 11. Migration from cypress-cucumber-preprocessor v4

The plugin moved from @testing-library/cypress-cucumber-preprocessor (old) to @badeball/cypress-cucumber-preprocessor (current). The migration is mostly find-and-replace:

\`\`\`bash
npm uninstall cypress-cucumber-preprocessor
npm install --save-dev @badeball/cypress-cucumber-preprocessor
\`\`\`

Update imports from \`cypress-cucumber-preprocessor/steps\` to \`@badeball/cypress-cucumber-preprocessor\`. The step API is identical.

## 12. Best Practices

1. **One feature file per user story** - keeps suites navigable.
2. **Background should be short** - 3-5 steps max.
3. **Reuse steps aggressively** - avoid copy-paste of similar steps.
4. **Use data-testid attributes** - cucumber-preprocessor steps rely on CSS selectors; data-testid is the most stable.
5. **Tag every scenario** - @smoke, @regression, or domain tags.

## 13. Advanced Patterns

### Shared Step Libraries
For large teams, create a shared step library at cypress/support/step_definitions/shared/. Common steps (login, navigation, generic assertions) live there and get imported across feature files. This reduces duplication and centralizes maintenance.

### Page Object Plus Step Definitions
The cleanest pattern combines Cypress's command chains with page objects and step definitions. Page objects encapsulate selectors and complex actions; step definitions call the page objects with parameters from the Gherkin steps. This three-layer architecture scales well to hundreds of scenarios.

\`\`\`typescript
// cypress/support/pages/CheckoutPage.ts
export class CheckoutPage {
  visit() { cy.visit('/checkout') }
  fillCard({ number, expiry, cvv }: { number: string; expiry: string; cvv: string }) {
    cy.findByLabelText(/card number/i).type(number)
    cy.findByLabelText(/expiry/i).type(expiry)
    cy.findByLabelText(/cvv/i).type(cvv)
  }
  confirm() { cy.findByRole('button', { name: /confirm order/i }).click() }
}

// cypress/e2e/checkout/steps.ts
import { CheckoutPage } from '../../support/pages/CheckoutPage'
const checkout = new CheckoutPage()
When('the customer fills card details', () => {
  checkout.fillCard({ number: '4242424242424242', expiry: '12/30', cvv: '123' })
})
\`\`\`

### Custom Cypress Commands
Cypress commands extend the cy.* API. Combine them with step definitions for highly readable code:

\`\`\`typescript
Cypress.Commands.add('signIn', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/signin')
    cy.findByLabelText(/email/i).type(email)
    cy.findByLabelText(/password/i).type(password)
    cy.findByRole('button', { name: /sign in/i }).click()
    cy.location('pathname').should('eq', '/dashboard')
  })
})

Given('the user is signed in as {string}', (email: string) => {
  cy.signIn(email, 'Sup3rS3cret!')
})
\`\`\`

### Cypress Component Testing with BDD
The same preprocessor works for component tests. Create cypress/component/ specs in Gherkin and bind them to component step definitions. This is rarely seen but works well for design systems.

### Network Stubbing in Hooks
\`\`\`typescript
Before({ tags: '@stub-payments' }, () => {
  cy.intercept('POST', '/api/charges', { fixture: 'charge-success.json' }).as('charge')
})
\`\`\`

## 14. Performance Optimization

Cypress runs tests in a real browser context, which is slower than headless API testing. Optimization patterns:

- **cy.session()**: cache login state across scenarios.
- **cy.intercept()**: stub slow APIs to keep tests fast.
- **--browser electron**: faster than Chrome for CI.
- **Cypress Cloud parallel**: distribute scenarios across multiple machines.
- **Feature file sharding**: with the matrix pattern shown earlier.

## 15. Stakeholder-Friendly Reporting

The multiple-cucumber-html-reporter output includes:
- Per-feature pass/fail summary
- Per-scenario step-by-step status
- Embedded screenshots and videos
- Failure traces
- Tag filtering

For stakeholders, the HTML report becomes a living spec they can browse without engineering knowledge. Publish it to GitHub Pages or an internal docs site for permanent access.

## 16. Multi-Browser Strategy

Cypress historically focused on Chromium; in 2026 it supports Chromium, Firefox, Edge, and WebKit. Run the same Gherkin scenarios across browsers via Cypress's --browser flag:

\`\`\`bash
npx cypress run --browser chrome --env tags="@smoke"
npx cypress run --browser firefox --env tags="@smoke"
npx cypress run --browser webkit --env tags="@smoke"
\`\`\`

For comprehensive coverage, matrix-run all three in CI.

## 17. Comparison with Playwright + Cucumber

| Aspect | Cypress + cucumber-preprocessor | Playwright + Cucumber.js |
|---|---|---|
| Setup complexity | Low | Medium |
| Browser engine | Real browser via wrapper | Native browser drivers |
| Parallel execution | Cypress Cloud or matrix | Native via Cucumber profile |
| Network stubbing | cy.intercept (excellent) | route() (excellent) |
| Iframes | Limited | Full support |
| Multi-tab | Limited | Full support |
| Tracing | Limited | Native trace viewer |

For modern apps using iframes or multiple tabs, Playwright's BDD setup is more capable. For simpler apps, Cypress's developer ergonomics often win.

## 18. AI-Assisted Authoring

In 2026, AI agents like Claude and Cursor can author cypress-cucumber-preprocessor scenarios and step definitions in your house style. Install the cypress-cucumber-preprocessor SKILL.md from the [QASkills directory](/skills):

\`\`\`bash
npx @qaskills/cli add cypress-cucumber-preprocessor
\`\`\`

Then prompt:

> Generate a Cypress BDD scenario for the password reset flow. Use our existing custom commands and page objects.

See [claude-code-qa-testing-workflows-2026](/blog) for concrete workflows.

## 19. Frequently Asked Questions

**Q: Can I run Cypress BDD tests in headless mode?**
A: Yes -- npx cypress run is headless by default. Use --headed only when debugging.

**Q: Does the preprocessor support data tables?**
A: Yes -- DataTable is fully supported and works exactly like other Cucumber implementations.

**Q: How do I share step definitions across multiple feature files?**
A: Place them in cypress/support/step_definitions/. The .cucumberrc.json stepDefinitions glob picks them up.

**Q: Cypress Cloud vs sharded GitHub Actions?**
A: Cypress Cloud is more polished and provides better analytics. Sharded GitHub Actions is free. Most teams start with sharding and move to Cypress Cloud as they grow.

**Q: How do I migrate from cypress-cucumber-preprocessor v4 to v20?**
A: The migration is mostly find-and-replace of imports. Step definition signatures haven't changed materially.

## Conclusion

cypress-cucumber-preprocessor in 2026 is a mature, production-ready way to add BDD to Cypress. The combination of Cypress's debugging story and BDD's stakeholder readability is powerful. Pair it with a SKILL.md pack from the [QASkills directory](/skills) to keep your team's scenario style consistent.
`,
};
