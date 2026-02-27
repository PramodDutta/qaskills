import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'BDD Testing with Cucumber — Gherkin, Step Definitions, and Automation',
  description:
    'Complete guide to BDD testing with Cucumber. Covers Gherkin syntax, step definitions in TypeScript, Playwright integration, living documentation, and AI agent automation.',
  date: '2026-02-22',
  category: 'Tutorial',
  content: `
Behavior-driven development is a collaboration methodology first and a testing technique second. BDD testing bridges the gap between business stakeholders who define what the software should do and the engineers who build it -- using a shared language that both sides can read, write, and validate. If your team treats BDD as "Cucumber testing with Gherkin syntax," you are missing the most valuable part: the conversations that happen before a single line of code is written.

This guide covers everything you need to practice BDD effectively -- from the collaborative discovery process through Gherkin syntax, step definitions in TypeScript, integration with Playwright and Cypress, living documentation, anti-patterns to avoid, and how AI agents can accelerate the entire workflow.

## Key Takeaways

- **BDD is a discovery process, not a test framework.** The real value comes from Three Amigos conversations that surface misunderstandings before development starts.
- **Gherkin is a specification language.** Feature files written in Given/When/Then syntax serve as executable documentation that stays in sync with your codebase.
- **Step definitions connect language to automation.** TypeScript step definitions map Gherkin lines to real browser actions via Playwright or Cypress.
- **Living documentation replaces stale wikis.** Cucumber reports generated from your test suite become the single source of truth for system behavior.
- **BDD anti-patterns are common and costly.** Imperative scenarios, scenario bloat, and QA writing all features alone defeat the purpose of behavior driven development.
- **AI agents can generate and maintain BDD artifacts.** QA skills teach agents to produce well-structured feature files, step definitions, and automation code.

---

## What Is Behavior-Driven Development?

Behavior-driven development (BDD) was introduced by Dan North in 2006 as an evolution of test-driven development. Where TDD focuses on the developer's unit-level design, BDD shifts the focus outward to the behavior of the system as experienced by its users. The key insight is that software teams waste enormous amounts of time building the wrong thing -- not because they cannot code, but because they misunderstand requirements.

### The Three Amigos

At the heart of BDD is a structured conversation called the **Three Amigos session**. Before any feature is implemented, three perspectives come together:

1. **Business** (product owner, business analyst) -- defines what the feature should accomplish and why it matters
2. **Development** (engineer) -- identifies technical constraints, edge cases, and implementation considerations
3. **QA** (tester) -- asks "what could go wrong?" and surfaces scenarios the other two miss

These conversations produce **concrete examples** of how the system should behave. Those examples, written in Gherkin syntax, become both the specification and the automated test.

### Specification by Example

BDD uses a technique called **specification by example**. Instead of writing abstract requirements like "the system should validate user credentials," you write concrete scenarios:

- Given a registered user with email "alice@example.com" and password "SecurePass1!"
- When she logs in with those credentials
- Then she should see her dashboard

This concrete example eliminates ambiguity. Everyone in the room agrees on exactly what "validate user credentials" means for this scenario.

### The Common Misconception

**BDD is not Cucumber.** Cucumber is a tool that executes Gherkin feature files. BDD is the practice of discovering requirements through collaborative examples. You can practice BDD without Cucumber (using plain text examples on a whiteboard), and you can use Cucumber without practicing BDD (if QA writes feature files alone after development). The tool without the practice delivers a fraction of the value.

---

## Gherkin Syntax Deep Dive

Gherkin is a structured, plain-text language for describing software behavior. It is designed to be readable by non-technical stakeholders while remaining precise enough for automated execution. Every Gherkin file follows a consistent structure using specific keywords.

### Core Keywords

- **Feature** -- describes the feature being specified, includes a title and optional description
- **Scenario** -- a single concrete example of behavior
- **Given** -- establishes the precondition or context
- **When** -- describes the action or event being tested
- **Then** -- states the expected outcome
- **And / But** -- continues the previous Given, When, or Then for readability
- **Background** -- shared Given steps that run before every scenario in the feature
- **Scenario Outline** -- a parameterized scenario template with an Examples table
- **Tags** -- metadata labels like \`@smoke\`, \`@regression\`, \`@wip\` for filtering test runs

### Complete Feature File Example

Here is a complete feature file for a login feature demonstrating all major Gherkin keywords:

\`\`\`gherkin
@authentication
Feature: User Login
  As a registered user
  I want to log in to my account
  So that I can access personalized features

  Background:
    Given the login page is open
    And the following users exist:
      | email              | password      | status   |
      | alice@example.com  | SecurePass1!  | active   |
      | bob@example.com    | BobSecure2!   | locked   |

  @smoke @critical
  Scenario: Successful login with valid credentials
    Given the user enters "alice@example.com" in the email field
    And the user enters "SecurePass1!" in the password field
    When the user clicks the login button
    Then the user should be redirected to the dashboard
    And the welcome message should display "Welcome, Alice"

  @regression
  Scenario: Failed login with incorrect password
    Given the user enters "alice@example.com" in the email field
    And the user enters "WrongPassword" in the password field
    When the user clicks the login button
    Then an error message should display "Invalid email or password"
    But the user should remain on the login page

  @regression
  Scenario: Locked account prevents login
    Given the user enters "bob@example.com" in the email field
    And the user enters "BobSecure2!" in the password field
    When the user clicks the login button
    Then an error message should display "Account is locked"

  @smoke
  Scenario Outline: Login validation for empty fields
    Given the user enters "<email>" in the email field
    And the user enters "<password>" in the password field
    When the user clicks the login button
    Then an error message should display "<error>"

    Examples:
      | email              | password      | error                    |
      |                    | SecurePass1!  | Email is required        |
      | alice@example.com  |               | Password is required     |
      |                    |               | Email is required        |
\`\`\`

The **Background** block runs before every scenario, establishing the shared context. The **Scenario Outline** with **Examples** table generates one test per row, substituting the angle-bracket placeholders. **Tags** let you run subsets -- \`@smoke\` for quick CI checks, \`@regression\` for full test suites.

---

## Writing Step Definitions

Step definitions are the glue between Gherkin's human-readable language and your automation code. Each Given, When, or Then line in a feature file maps to a TypeScript function that performs the actual work.

### Basic Step Definitions in TypeScript

Install Cucumber for JavaScript/TypeScript:

\`\`\`bash
npm install --save-dev @cucumber/cucumber ts-node typescript
\`\`\`

Create step definitions that match the Gherkin lines:

\`\`\`typescript
// features/step-definitions/login.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('the login page is open', async function () {
  await this.page.goto('/login');
});

Given(
  'the user enters {string} in the email field',
  async function (email: string) {
    await this.page.fill('[data-testid="email-input"]', email);
  }
);

Given(
  'the user enters {string} in the password field',
  async function (password: string) {
    await this.page.fill('[data-testid="password-input"]', password);
  }
);

When('the user clicks the login button', async function () {
  await this.page.click('[data-testid="login-button"]');
});

Then(
  'the user should be redirected to the dashboard',
  async function () {
    await this.page.waitForURL('**/dashboard');
    expect(this.page.url()).to.include('/dashboard');
  }
);

Then(
  'the welcome message should display {string}',
  async function (expectedMessage: string) {
    const message = await this.page.textContent('[data-testid="welcome-msg"]');
    expect(message).to.equal(expectedMessage);
  }
);

Then(
  'an error message should display {string}',
  async function (expectedError: string) {
    const error = await this.page.textContent('[data-testid="error-message"]');
    expect(error).to.equal(expectedError);
  }
);

Then('the user should remain on the login page', async function () {
  expect(this.page.url()).to.include('/login');
});
\`\`\`

### Parameter Types

Cucumber provides built-in parameter types and lets you define custom ones:

- **\`{string}\`** -- matches text in double or single quotes
- **\`{int}\`** -- matches an integer
- **\`{float}\`** -- matches a decimal number
- **\`{word}\`** -- matches a single word without spaces

You can define custom parameter types for domain-specific concepts:

\`\`\`typescript
import { defineParameterType } from '@cucumber/cucumber';

defineParameterType({
  name: 'status',
  regexp: /active|locked|pending/,
  transformer: (s: string) => s as 'active' | 'locked' | 'pending',
});

// Now use it in steps:
Given('a user with status {status}', async function (status: string) {
  await this.createUserWithStatus(status);
});
\`\`\`

### Data Tables in Steps

When a Gherkin step includes a data table, it arrives as a \`DataTable\` object in your step definition:

\`\`\`typescript
import { Given } from '@cucumber/cucumber';
import type { DataTable } from '@cucumber/cucumber';

Given('the following users exist:', async function (dataTable: DataTable) {
  const users = dataTable.hashes(); // Array of objects keyed by header row
  for (const user of users) {
    await this.createUser(user.email, user.password, user.status);
  }
});
\`\`\`

Each row in the Gherkin table becomes an object with column headers as keys. This pattern keeps your feature files expressive while your step definitions handle the implementation details.

---

## Cucumber with Playwright

Playwright is the most popular choice for BDD browser automation in 2026. Combining Cucumber's natural-language specifications with Playwright's reliable browser control gives you readable tests that run fast and rarely flake.

### Project Setup

\`\`\`bash
npm install --save-dev @cucumber/cucumber playwright @playwright/test ts-node
npx playwright install
\`\`\`

Create a Cucumber configuration file:

\`\`\`javascript
// cucumber.js
module.exports = {
  default: {
    require: ['features/step-definitions/**/*.ts', 'features/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    paths: ['features/**/*.feature'],
    publishQuiet: true,
  },
};
\`\`\`

### The World Class

Cucumber's **World** is the shared context object available as \`this\` inside every step definition. Extend it to manage Playwright's browser lifecycle:

\`\`\`typescript
// features/support/world.ts
import { World, setWorldConstructor, IWorldOptions } from '@cucumber/cucumber';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

export class PlaywrightWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async init() {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async cleanup() {
    await this.page.close();
    await this.context.close();
    await this.browser.close();
  }
}

setWorldConstructor(PlaywrightWorld);
\`\`\`

### Hooks for Browser Lifecycle

Use Cucumber hooks to initialize and tear down the browser for each scenario:

\`\`\`typescript
// features/support/hooks.ts
import { Before, After, Status } from '@cucumber/cucumber';
import { PlaywrightWorld } from './world';

Before(async function (this: PlaywrightWorld) {
  await this.init();
});

After(async function (this: PlaywrightWorld, scenario) {
  if (scenario.result?.status === Status.FAILED) {
    const screenshot = await this.page.screenshot();
    this.attach(screenshot, 'image/png');
  }
  await this.cleanup();
});
\`\`\`

The After hook captures a screenshot on failure and attaches it to the Cucumber report -- invaluable for debugging CI failures.

### Running the Tests

Add a script to your \`package.json\`:

\`\`\`json
{
  "scripts": {
    "test:bdd": "cucumber-js",
    "test:bdd:smoke": "cucumber-js --tags @smoke",
    "test:bdd:regression": "cucumber-js --tags @regression"
  }
}
\`\`\`

Run tagged subsets for fast feedback during development (\`@smoke\`) and comprehensive coverage before release (\`@regression\`).

---

## Cucumber with Cypress

Cypress offers a different model for BDD automation. The **cypress-cucumber-preprocessor** plugin lets you write the same Gherkin feature files while using Cypress commands instead of Playwright actions.

### Setup

\`\`\`bash
npm install --save-dev cypress @badeball/cypress-cucumber-preprocessor
\`\`\`

Configure the preprocessor in \`cypress.config.ts\`:

\`\`\`typescript
import { defineConfig } from 'cypress';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';

export default defineConfig({
  e2e: {
    specPattern: 'cypress/e2e/**/*.feature',
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on(
        'file:preprocessor',
        createBundler({ plugins: [createEsbuildPlugin(config)] })
      );
      return config;
    },
  },
});
\`\`\`

### Cypress Step Definitions

The same login feature file works with Cypress step definitions:

\`\`\`typescript
// cypress/e2e/login/login.ts
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

Given('the login page is open', () => {
  cy.visit('/login');
});

Given('the user enters {string} in the email field', (email: string) => {
  cy.get('[data-testid="email-input"]').clear().type(email);
});

Given('the user enters {string} in the password field', (password: string) => {
  cy.get('[data-testid="password-input"]').clear().type(password);
});

When('the user clicks the login button', () => {
  cy.get('[data-testid="login-button"]').click();
});

Then('the user should be redirected to the dashboard', () => {
  cy.url().should('include', '/dashboard');
});

Then('an error message should display {string}', (message: string) => {
  cy.get('[data-testid="error-message"]').should('have.text', message);
});
\`\`\`

### Playwright vs Cypress for BDD

| Aspect | Playwright + Cucumber | Cypress + Cucumber |
|---|---|---|
| **Architecture** | Out-of-process, multi-browser | In-browser, Chromium-focused |
| **Multi-tab/window** | Native support | Not supported |
| **Parallel execution** | Built-in sharding | Requires Cypress Cloud |
| **API testing** | Full request context | \`cy.request()\` only |
| **Community plugins** | Growing ecosystem | Mature preprocessor |
| **Debugging** | Trace viewer, screenshots | Time-travel debugger |
| **Best for** | Complex cross-browser BDD | Teams already using Cypress |

For new BDD projects in 2026, Playwright is the stronger choice due to its multi-browser support and native parallelism. For teams already invested in Cypress, the preprocessor is a solid option. Read our full comparison in [Cypress vs Playwright 2026](/blog/cypress-vs-playwright-2026).

---

## Living Documentation

One of BDD's most underrated benefits is **living documentation** -- test reports generated directly from your feature files that always reflect the current state of the system. Unlike wikis and specification documents that go stale within weeks of being written, living documentation is verified on every test run.

### Cucumber HTML Reporter

Cucumber's built-in HTML formatter produces a navigable report:

\`\`\`bash
npx cucumber-js --format html:reports/cucumber-report.html
\`\`\`

The report shows every feature, scenario, and step with pass/fail status, execution time, and attached screenshots for failures.

### Cucumber Reports Service

For team-wide visibility, publish reports to **Cucumber Reports** (reports.cucumber.io):

\`\`\`bash
npx cucumber-js --publish
\`\`\`

This generates a shareable URL that product owners and stakeholders can bookmark. They see a real-time view of which behaviors are implemented, passing, and failing -- without attending standups or reading Jira tickets.

### Allure Integration

For richer reporting with historical trends, integrate with **Allure**:

\`\`\`bash
npm install --save-dev allure-cucumberjs
npx cucumber-js --format allure-cucumberjs/reporter
npx allure serve reports/allure-results
\`\`\`

Allure provides trend charts, failure categorization, and timeline views that help teams identify flaky tests and track quality over time.

### Why Living Documentation Matters

Traditional documentation requires manual effort to keep current. Living documentation is updated automatically every time your CI pipeline runs. When a product manager asks "does the system support SSO login?", you do not search Confluence -- you search the feature files. If the scenario exists and is green, the behavior is implemented and verified. If it is red or missing, you have your answer.

---

## BDD Anti-Patterns

BDD delivers enormous value when practiced correctly and enormous waste when practiced poorly. Here are the most common anti-patterns and how to avoid them.

### Imperative Scenarios

**Bad** -- too many low-level UI steps:

\`\`\`gherkin
Scenario: User logs in
  Given the user navigates to "https://app.example.com/login"
  And the user clicks on the email input field
  And the user types "alice@example.com"
  And the user clicks on the password input field
  And the user types "SecurePass1!"
  And the user clicks the submit button
  Then the page title should be "Dashboard"
\`\`\`

**Good** -- declarative behavior:

\`\`\`gherkin
Scenario: Successful login
  Given Alice is a registered user
  When she logs in with valid credentials
  Then she should see her dashboard
\`\`\`

Declarative scenarios describe **what** happens, not **how**. The "how" lives in step definitions. Imperative scenarios are brittle, hard to read, and miss the point of BDD.

### Scenario Bloat

Features with 30+ scenarios are a sign that the feature is too large or that scenarios overlap. Break large features into smaller, focused feature files. Each file should describe one coherent aspect of behavior.

### Testing UI Instead of Behavior

BDD scenarios should describe business behavior, not UI implementation. "The user clicks the green button in the top-right corner" is a UI test. "The user submits her order" is a behavior test. When the UI changes, behavior tests survive. UI tests break.

### QA Writing All Scenarios Alone

If only QA writes feature files, you have lost the collaboration benefit. Scenarios written without business input often test technical implementation details instead of business value. Without developer input, they miss edge cases that only someone familiar with the code would consider. The Three Amigos session is not optional.

### Unused Feature Files

Feature files that exist in the repository but are not executed in CI are worse than no feature files. They create a false sense of documentation and diverge from reality over time. Every feature file must be wired to step definitions and run in your pipeline.

### Tag Overload

When every scenario has five or more tags (\`@smoke @regression @sprint-42 @jira-1234 @login @critical\`), tags lose their utility. Keep your tagging strategy simple: one or two execution-level tags (\`@smoke\`, \`@regression\`) and optionally a domain tag (\`@authentication\`, \`@checkout\`).

---

## BDD vs TDD vs ATDD

BDD, TDD, and ATDD are complementary practices, not competitors. Understanding when to use each helps you build a comprehensive testing strategy.

| Aspect | BDD | TDD | ATDD |
|---|---|---|---|
| **Focus** | System behavior from user perspective | Code design at the unit level | Acceptance criteria from requirements |
| **Written by** | Business, Dev, QA collaboratively | Developer | Business, Dev, QA collaboratively |
| **Language** | Gherkin (Given/When/Then) | Code (assertions) | Varies (often FitNesse, tables) |
| **Primary tool** | Cucumber, SpecFlow, Behave | Jest, Vitest, pytest, JUnit | FitNesse, Robot Framework |
| **When to use** | Features with business logic worth specifying | All production code at the unit level | Complex acceptance criteria with many data combinations |
| **Output** | Living documentation + automated tests | Unit tests + well-designed code | Acceptance test suite |

The most effective teams combine all three. **TDD** drives unit-level code design. **BDD** specifies and verifies business behavior at the integration or E2E level. **ATDD** fills the gap for data-heavy acceptance criteria. For a deep dive into TDD with AI agents, see our [TDD guide](/blog/tdd-ai-agents-best-practices).

---

## Automate BDD Testing with AI Agents

AI coding agents can dramatically accelerate BDD workflows -- from generating feature files based on user stories to writing step definitions and wiring up automation frameworks. The key is giving your agent specialized BDD knowledge so it produces well-structured, idiomatic Cucumber code instead of generic test scripts.

### Install BDD Skills

[QASkills](/) provides purpose-built skills that teach AI agents BDD best practices:

\`\`\`bash
# Core BDD/Cucumber skill -- Gherkin syntax, step definitions, best practices
npx @qaskills/cli add bdd-cucumber

# Generate test cases from user stories -- perfect for Three Amigos prep
npx @qaskills/cli add test-case-generator-user-stories
\`\`\`

These skills embed expert BDD knowledge directly into your agent's context. When you ask your agent to "write a feature file for the checkout flow," it will produce properly structured Gherkin with declarative scenarios, appropriate tags, and reusable step patterns.

### Complementary Skills

Combine the BDD skill with framework-specific automation skills for end-to-end coverage:

\`\`\`bash
# Playwright automation for step definitions
npx @qaskills/cli add playwright-e2e

# Cypress automation for step definitions
npx @qaskills/cli add cypress-e2e

# Generate exploratory test charters from feature files
npx @qaskills/cli add exploratory-test-charter-generator
\`\`\`

### What the Agent Produces

With BDD skills installed, your AI agent will:

- **Generate feature files** from user stories or requirements with proper Given/When/Then structure
- **Write step definitions** in TypeScript that follow parameter type conventions and avoid duplication
- **Create the World class** and hooks for Playwright or Cypress integration
- **Produce declarative scenarios** instead of imperative UI scripts
- **Add appropriate tags** for smoke, regression, and domain categorization

Browse all available QA skills at [qaskills.sh/skills](/skills) or read the [getting started guide](/getting-started) to install your first skill in under 30 seconds.

For related guides, see our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) and [Cypress vs Playwright comparison](/blog/cypress-vs-playwright-2026).

---

## Frequently Asked Questions

### Is BDD worth the overhead?

BDD introduces overhead in the form of Three Amigos sessions, feature file maintenance, and step definition code. For teams building products with complex business logic and multiple stakeholders, this overhead pays for itself many times over by reducing misunderstandings, rework, and bugs that reach production. For small teams building internal tools with clear requirements, the ceremony may not be justified. Start with your highest-value user-facing features and expand from there.

### Who should write Gherkin scenarios?

Everyone -- and no one person alone. The Three Amigos process means scenarios are **co-authored** by business, development, and QA. In practice, the QA engineer or business analyst often types the first draft, but the scenarios must be reviewed and refined by all three perspectives. If your QA team is writing all scenarios in isolation, you are using Cucumber as a test framework, not practicing BDD.

### Should I use Cucumber or Playwright Test Runner directly?

Use Cucumber when you need **living documentation** that non-technical stakeholders will read, when multiple teams share feature files as a communication tool, or when your organization has invested in BDD as a practice. Use Playwright's built-in test runner when your tests are primarily for developers, when you want simpler tooling, or when your scenarios do not need to be readable by non-engineers. The two are not mutually exclusive -- some teams use Cucumber for critical user journeys and Playwright Test for lower-level integration tests.

### Is BDD only for end-to-end tests?

No. While BDD is most commonly associated with E2E browser tests, Gherkin scenarios can drive any level of testing. You can write step definitions that call API endpoints directly (integration-level BDD), invoke service methods (component-level BDD), or even test business logic functions (unit-level BDD). The deciding factor is whether the behavior being specified benefits from a shared, human-readable format. Use E2E steps for user-facing journeys and API-level steps for backend behavior that stakeholders care about.

### What are the best BDD frameworks for JavaScript and TypeScript?

**@cucumber/cucumber** (Cucumber.js) is the official JavaScript implementation and the most widely used. It supports TypeScript via ts-node, has robust parameter types, data tables, hooks, and a large plugin ecosystem. **cypress-cucumber-preprocessor** (by Badeball) integrates Gherkin into Cypress workflows. **Playwright with Cucumber** is the recommended combination for new projects in 2026 -- you get Cucumber's specification language with Playwright's reliable, fast browser automation. For API-level BDD, **PactumJS** with Cucumber provides a clean integration for testing HTTP services with Gherkin scenarios.
`,
};
