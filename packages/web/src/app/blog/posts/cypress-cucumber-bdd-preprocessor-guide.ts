import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Cucumber BDD Preprocessor: Complete Guide 2026',
  description:
    'Complete guide to running Cucumber BDD in Cypress with badeball/cypress-cucumber-preprocessor in 2026. Feature files, step definitions, hooks, reports, CI.',
  date: '2026-05-19',
  category: 'Guide',
  content: `
# Cypress Cucumber BDD Preprocessor: Complete Guide 2026

The original \`cypress-cucumber-preprocessor\` from TheBrainFamily was widely used until the maintainer archived it in 2021. The community-maintained fork by Mikael Salihov (\`@badeball/cypress-cucumber-preprocessor\`) picked up where it left off and has been the de-facto choice since 2022. By 2026 it is the standard way to run Cucumber-style BDD inside Cypress.

This guide is the complete 2026 reference for the \`@badeball/cypress-cucumber-preprocessor\`. We cover installation, feature file structure, step definitions, hooks, scenario outlines, tags, custom parameter types, fixtures inside Cucumber, the JSON and HTML reporter setup, CI configuration, and best practices distilled from running real Cucumber + Cypress suites.

For broader Cypress references, browse [the blog index](/blog). For Cypress skills you can install into Claude Code, see the [QA Skills directory](/skills).

## When to use Cucumber in Cypress

Cucumber adds an abstraction layer between business intent (the \`.feature\` file) and test implementation (step definitions). Use it when:

1. **Product and QA collaborate on scenarios.** \`.feature\` files become shared artifacts.
2. **Stakeholders read tests.** Gherkin is closer to natural language than JavaScript.
3. **The same steps appear in many scenarios.** Step definitions encourage reuse.

Skip Cucumber when:

1. **Only QA reads the tests.** The abstraction is overhead.
2. **Scenarios change often.** Maintaining feature files and step definitions doubles the churn.
3. **Tests are simple.** A plain Cypress spec is just as readable.

## Installation

\`\`\`bash
npm install --save-dev @badeball/cypress-cucumber-preprocessor \\
  @bahmutov/cypress-esbuild-preprocessor \\
  esbuild
\`\`\`

## Setup

\`cypress.config.ts\`:

\`\`\`typescript
import { defineConfig } from 'cypress';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import createEsbuildPlugin from '@badeball/cypress-cucumber-preprocessor/esbuild';

export default defineConfig({
  e2e: {
    specPattern: '**/*.feature',
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on('file:preprocessor', createBundler({
        plugins: [createEsbuildPlugin(config)],
      }));
      return config;
    },
  },
});
\`\`\`

\`package.json\`:

\`\`\`json
{
  "cypress-cucumber-preprocessor": {
    "stepDefinitions": [
      "cypress/e2e/[filepath]/**/*.{js,ts}",
      "cypress/e2e/[filepath].{js,ts}",
      "cypress/support/step_definitions/**/*.{js,ts}"
    ]
  }
}
\`\`\`

This tells the preprocessor where to find step definitions. The \`[filepath]\` token expands to the path of the matching feature file.

## Feature file structure

\`cypress/e2e/login.feature\`:

\`\`\`gherkin
Feature: Login

  Background:
    Given I am on the login page

  Scenario: Successful login
    When I enter "admin@example.com" and "secret"
    And I click "Sign in"
    Then I should see the dashboard

  Scenario Outline: Failed login attempts
    When I enter "<email>" and "<password>"
    And I click "Sign in"
    Then I should see "<error>"

    Examples:
      | email           | password | error            |
      | wrong@email.com | secret   | Invalid email    |
      | admin@email.com | wrong    | Invalid password |
\`\`\`

## Step definitions

\`cypress/e2e/login/login.ts\`:

\`\`\`typescript
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

Given('I am on the login page', () => {
  cy.visit('/login');
});

When('I enter {string} and {string}', (email: string, password: string) => {
  cy.get('[data-testid=email]').type(email);
  cy.get('[data-testid=password]').type(password);
});

When('I click {string}', (text: string) => {
  cy.contains('button', text).click();
});

Then('I should see the dashboard', () => {
  cy.url().should('include', '/dashboard');
});

Then('I should see {string}', (text: string) => {
  cy.contains(text).should('be.visible');
});
\`\`\`

## Hooks

\`@badeball/cypress-cucumber-preprocessor\` exposes Before/After hooks:

\`\`\`typescript
import { Before, After, BeforeAll, AfterAll } from '@badeball/cypress-cucumber-preprocessor';

BeforeAll(() => {
  cy.task('db:reset');
});

Before({ tags: '@smoke' }, () => {
  cy.task('db:seedSmoke');
});

After(() => {
  cy.task('cleanup');
});
\`\`\`

## Tags

Tags filter which scenarios run.

\`\`\`gherkin
@smoke
Feature: Login
  @critical
  Scenario: Successful login
    ...
\`\`\`

Run only smoke tests:

\`\`\`bash
cypress run --env tags='@smoke'
\`\`\`

Combine tags with boolean expressions:

\`\`\`bash
cypress run --env tags='@smoke and not @wip'
\`\`\`

In \`cypress.config.ts\`:

\`\`\`typescript
env: {
  tags: process.env.TAGS || 'not @ignore',
}
\`\`\`

## Custom parameter types

The standard \`{string}\`, \`{int}\`, \`{float}\`, \`{word}\` parameters cover most cases. For domain-specific types, register custom parameters.

\`\`\`typescript
import { defineParameterType } from '@badeball/cypress-cucumber-preprocessor';

defineParameterType({
  name: 'role',
  regexp: /(admin|editor|viewer)/,
  transformer: (s) => s as 'admin' | 'editor' | 'viewer',
});

// Now usable in step definitions:
Given('I am logged in as an {role}', (role: 'admin' | 'editor' | 'viewer') => {
  cy.login(role);
});
\`\`\`

## Data tables

Gherkin tables become arrays of objects in step definitions.

\`\`\`gherkin
Scenario: Bulk user creation
  Given the following users exist:
    | name  | email             | role   |
    | Alice | alice@example.com | admin  |
    | Bob   | bob@example.com   | viewer |
\`\`\`

\`\`\`typescript
import { Given } from '@badeball/cypress-cucumber-preprocessor';
import { DataTable } from '@cucumber/cucumber';

Given('the following users exist:', (table: DataTable) => {
  const users = table.hashes();
  users.forEach((user) => {
    cy.request('POST', '/api/users', user);
  });
});
\`\`\`

## Fixtures

Fixtures work as in plain Cypress. Step definitions are just JavaScript, so call \`cy.fixture\` or import fixtures directly.

\`\`\`typescript
Given('I have a sample user', () => {
  cy.fixture('users.json').as('user');
});
\`\`\`

## Reporters

The preprocessor produces Cucumber-format JSON output. Convert to HTML reports with the \`multiple-cucumber-html-reporter\`.

\`\`\`json
// package.json
{
  "cypress-cucumber-preprocessor": {
    "json": {
      "enabled": true,
      "output": "cypress/reports/cucumber-report.json"
    },
    "html": {
      "enabled": true,
      "output": "cypress/reports/cucumber-report.html"
    }
  }
}
\`\`\`

For richer reports, use \`multiple-cucumber-html-reporter\` to merge JSON files:

\`\`\`typescript
// scripts/generate-report.ts
import report from 'multiple-cucumber-html-reporter';

report.generate({
  jsonDir: 'cypress/reports',
  reportPath: 'cypress/reports/html',
  metadata: { browser: { name: 'chrome', version: '120' } },
});
\`\`\`

## CI configuration

\`\`\`yaml
- uses: cypress-io/github-action@v6
  with:
    start: npm run dev
    command: npx cypress run --env tags='not @wip'
- name: Generate HTML report
  if: always()
  run: node scripts/generate-report.ts
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: cucumber-report
    path: cypress/reports/html
\`\`\`

## Best practices

1. **One feature per file.** Keep features focused.
2. **Backgrounds for shared setup.** Avoid repeating \`Given\` across scenarios.
3. **Reuse step definitions ruthlessly.** Three uses then extract; same rule as custom commands.
4. **Parameter types for domain concepts.** \`{role}\`, \`{currency}\`, \`{date}\`.
5. **Data tables for bulk setup.** Cleaner than repeating Given clauses.
6. **Tags for environment filtering.** \`@smoke\`, \`@regression\`, \`@ignore\`.
7. **Step definitions are imperative.** Action-oriented language.
8. **\`Then\` clauses assert.** Do not perform side effects.
9. **Avoid implementation details in features.** \`I click the sign-in button\`, not \`I click \`#login-btn\`\`.
10. **Review feature files with product.** That is the point of Cucumber.

## Anti-patterns

### Implementation details in features

\`\`\`gherkin
# BAD
When I click "#login-btn"
Then the element with class ".dashboard-header" should be visible
\`\`\`

\`\`\`gherkin
# GOOD
When I click "Sign in"
Then I should see the dashboard header
\`\`\`

### Overly specific step definitions

\`\`\`typescript
// BAD: one-off step
When('I click the blue button in the top right corner', () => {...});

// GOOD: parameterized
When('I click {string}', (text: string) => {...});
\`\`\`

### God scenarios

\`\`\`gherkin
# BAD: tests too much
Scenario: Full user journey
  Given I am on the home page
  When I log in, click around, edit my profile, change settings, ...
\`\`\`

\`\`\`gherkin
# GOOD: focused scenarios
Scenario: Login redirects to dashboard
Scenario: Profile edit saves
Scenario: Settings change persists
\`\`\`

## Gotchas

1. **Step definitions must be plain JS/TS.** No JSX, no React-specific helpers.
2. **\`cy.task\` works.** But the task must be defined in \`setupNodeEvents\`.
3. **\`Before\` and \`After\` are scoped to scenarios.** Not Cypress's \`beforeEach\`.
4. **\`BeforeAll\` and \`AfterAll\` run once per spec file.** Not once per suite.
5. **Tags use Cucumber syntax.** \`@tag1 and not @tag2\`, not Mocha grep.
6. **Step definitions are found by glob.** Misconfigured globs cause silent failures.
7. **Errors in step definitions show as failures in the scenario.** Less specific than direct stack traces.
8. **Reporter setup is opt-in.** JSON output requires explicit config.
9. **Maintainer of the original \`cypress-cucumber-preprocessor\` archived the repo.** Use \`@badeball/cypress-cucumber-preprocessor\` instead.
10. **TypeScript types may need declaration.** Some helpers require explicit imports.

## Conclusion and next steps

Running Cucumber inside Cypress with \`@badeball/cypress-cucumber-preprocessor\` gives you BDD readability and Cypress reliability. Use it when product and QA genuinely collaborate on feature files; skip it when only QA reads the tests. The setup is a one-time cost; the daily UX is similar to writing plain Cypress with slightly more ceremony.

Start with one feature file and a handful of step definitions. Add tags for environment filtering. Layer in custom parameter types as domain concepts emerge. Review feature files with product to validate that the collaboration is paying off.

Next read: explore the [QA Skills directory](/skills) for Cypress skills, and the [blog index](/blog) for fixtures, custom commands, and CI guides.
`,
};
