import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Gauge Testing Framework: Markdown-Based BDD Guide',
  description:
    'Learn Gauge testing framework with markdown specifications, concepts, data tables, tags, parallel execution, plugins, IDE support, and CI/CD integration for BDD.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
## Introduction to Gauge

Gauge is a free, open-source test automation framework created by ThoughtWorks, the same company behind Selenium. What sets Gauge apart from other BDD frameworks is its use of Markdown for writing specifications. Instead of learning a domain-specific language like Gherkin, teams write test specifications in plain Markdown that renders beautifully in any text editor, IDE, or documentation tool.

Gauge supports multiple programming languages for step implementations including JavaScript/TypeScript, Python, Java, C#, Ruby, and Go. This polyglot approach means teams can write test logic in whatever language their application uses.

Key advantages of Gauge include its Markdown-first approach, first-class support for data-driven testing, built-in parallel execution, a rich plugin ecosystem, and excellent IDE support through official extensions for VS Code and IntelliJ.

---

## Installing and Setting Up Gauge

### Installing the Gauge CLI

Install Gauge using the platform-appropriate method:

\`\`\`bash
# macOS
brew install gauge

# Windows (Chocolatey)
choco install gauge

# Linux (curl)
curl -SsL https://downloads.gauge.org/stable | sh

# Verify installation
gauge version
\`\`\`

### Installing Language Runners

Gauge needs a language runner (plugin) for your chosen implementation language:

\`\`\`bash
# JavaScript/TypeScript
gauge install js

# Python
gauge install python

# Java
gauge install java

# C#
gauge install csharp
\`\`\`

### Creating a New Gauge Project

Initialize a new project with the built-in templates:

\`\`\`bash
# Create a JavaScript project
gauge init js

# Create a TypeScript project
gauge init ts

# Create a Python project
gauge init python

# Create a Java Maven project
gauge init java_maven
\`\`\`

### Project Structure

A typical Gauge project follows this structure:

\`\`\`
my-gauge-project/
  specs/
    users/
      login.spec
      registration.spec
    products/
      search.spec
      checkout.spec
  tests/
    step_implementation.js
    users/
      login_steps.js
    products/
      search_steps.js
  env/
    default/
      default.properties
    staging/
      staging.properties
  manifest.json
\`\`\`

The \`specs/\` directory contains Markdown specification files, \`tests/\` (or \`step_implementations/\` depending on language) contains the step implementations, and \`env/\` holds environment-specific configuration.

---

## Writing Gauge Specifications in Markdown

### Basic Specification Structure

Gauge specs are Markdown files with the \`.spec\` extension. The heading structure defines the specification hierarchy:

\`\`\`markdown
# User Authentication

This specification covers the user authentication workflows
including login, logout, and session management.

## Successful Login

* Navigate to the login page
* Enter "alice@example.com" in the email field
* Enter "SecurePass123" in the password field
* Click the login button
* Verify the dashboard is displayed
* Verify the welcome message shows "Welcome, Alice"

## Failed Login with Invalid Password

* Navigate to the login page
* Enter "alice@example.com" in the email field
* Enter "WrongPassword" in the password field
* Click the login button
* Verify the error message "Invalid credentials" is displayed
* Verify the user remains on the login page
\`\`\`

In Gauge, the \`#\` heading is the specification name, \`##\` headings are scenario names, and bulleted items (\`*\`) are the executable steps.

### Step Implementations

Each step in the spec maps to a function in your implementation code:

\`\`\`javascript
const { Step, BeforeSuite, AfterSuite } = require('gauge-ts');
const { expect } = require('chai');
const { page } = require('./browser');

step('Navigate to the login page', async () => {
  await page.goto('/login');
  await page.waitForSelector('#login-form');
});

step(
  'Enter <value> in the email field',
  async (value) => {
    await page.fill('#email', value);
  }
);

step(
  'Enter <value> in the password field',
  async (value) => {
    await page.fill('#password', value);
  }
);

step('Click the login button', async () => {
  await page.click('#login-button');
  await page.waitForNavigation();
});

step('Verify the dashboard is displayed', async () => {
  const url = page.url();
  expect(url).to.include('/dashboard');
});

step(
  'Verify the welcome message shows <message>',
  async (message) => {
    const text = await page.textContent('.welcome-msg');
    expect(text).to.equal(message);
  }
);

step(
  'Verify the error message <message> is displayed',
  async (message) => {
    const error = await page.textContent('.error-message');
    expect(error).to.equal(message);
  }
);
\`\`\`

### Parameterized Steps

Steps with parameters use angle brackets in specs and receive arguments in implementations:

\`\`\`markdown
## Add Products to Cart

* Add "Wireless Mouse" with quantity "2" to the cart
* Add "USB-C Hub" with quantity "1" to the cart
* Verify cart total is "3" items
* Verify cart amount is "\$89.97"
\`\`\`

\`\`\`javascript
step(
  'Add <product> with quantity <qty> to the cart',
  async (product, qty) => {
    await catalog.search(product);
    await catalog.setQuantity(parseInt(qty));
    await catalog.addToCart();
  }
);
\`\`\`

---

## Concepts: Reusable Step Groups

Concepts are one of Gauge's most powerful features. They let you create reusable groups of steps that can be called as a single step in specifications. Concepts are defined in \`.cpt\` files.

### Defining a Concept

Create a file \`specs/concepts/auth.cpt\`:

\`\`\`markdown
# Login as <username> with password <password>

* Navigate to the login page
* Enter <username> in the email field
* Enter <password> in the password field
* Click the login button
* Verify the dashboard is displayed

# Login as admin

* Login as "admin@example.com" with password "AdminPass123!"

# Logout the current user

* Click the user menu
* Click the logout button
* Verify the login page is displayed
\`\`\`

### Using Concepts in Specifications

\`\`\`markdown
# Shopping Workflow

## Purchase as a regular user

* Login as "shopper@example.com" with password "ShopPass1!"
* Search for product "Mechanical Keyboard"
* Add the first result to the cart
* Complete the checkout process
* Verify order confirmation is displayed
* Logout the current user

## Admin manages inventory

* Login as admin
* Navigate to the inventory dashboard
* Update stock for "Mechanical Keyboard" to "50"
* Verify the stock update confirmation
* Logout the current user
\`\`\`

Concepts can reference other concepts, allowing you to build a hierarchy of reusable test building blocks. This dramatically reduces duplication and makes specs easier to maintain.

---

## Data-Driven Testing with Tables

Gauge supports data-driven testing through Markdown tables, both inline and from external sources.

### Inline Data Tables

\`\`\`markdown
# Registration Validation

## Validate required fields

   | field      | value | error_message              |
   |------------|-------|----------------------------|
   | email      |       | Email is required          |
   | password   |       | Password is required       |
   | first_name |       | First name is required     |

* Open the registration page
* Leave the <field> empty and submit
* Verify error <error_message> is shown for <field>
\`\`\`

The table header row defines parameter names, and each subsequent row creates a separate test iteration. This makes it easy to test multiple input combinations.

### External CSV Data Sources

For larger data sets, reference external CSV files:

\`\`\`markdown
# Bulk User Import

## Import users from CSV

table: resources/test-users.csv

* Navigate to the admin panel
* Import user with email <email> and role <role>
* Verify user <email> appears in the user list
* Verify user <email> has role <role>
\`\`\`

The CSV file \`resources/test-users.csv\`:

\`\`\`csv
email,role
alice@example.com,admin
bob@example.com,editor
carol@example.com,viewer
dave@example.com,editor
\`\`\`

### Special Parameters

Gauge supports special parameter types beyond simple strings:

\`\`\`markdown
## File upload test

* Upload the file <file:resources/sample.pdf>
* Verify the upload succeeds

## Dynamic parameter test

* Create a user with name <prefix>_user_<timestamp>
\`\`\`

File parameters reference files relative to the project root, and dynamic parameters can generate unique values at runtime.

---

## Tags for Organization and Filtering

Tags in Gauge help organize specifications and control which tests run in different environments.

### Applying Tags

\`\`\`markdown
# User Management

Tags: authentication, smoke

## Create new user

Tags: regression, happy-path

* Navigate to the admin panel
* Click "Create User"
* Fill in the user details
* Verify the user is created

## Delete existing user

Tags: regression, destructive

* Navigate to the admin panel
* Select user "test@example.com"
* Click "Delete User"
* Confirm the deletion
* Verify the user is removed
\`\`\`

### Running Tagged Specifications

\`\`\`bash
# Run only smoke tests
gauge run --tags "smoke" specs/

# Run regression but not destructive tests
gauge run --tags "regression & !destructive" specs/

# Run either smoke or critical tests
gauge run --tags "smoke | critical" specs/

# Complex tag expressions
gauge run --tags "(smoke | regression) & !slow" specs/
\`\`\`

Tags support boolean operators: \`&\` (AND), \`|\` (OR), and \`!\` (NOT), with parentheses for grouping. This makes it easy to compose test suites for different purposes.

---

## Parallel Execution

Gauge has built-in support for parallel test execution, distributing specs across multiple streams to reduce overall test time.

### Running Tests in Parallel

\`\`\`bash
# Run with 4 parallel streams
gauge run --parallel -n 4 specs/

# Run with parallel and verbose output
gauge run --parallel -n 4 --verbose specs/

# Parallel execution with specific tags
gauge run --parallel -n 4 --tags "smoke" specs/
\`\`\`

### Parallel Execution Strategies

Gauge offers two strategies for distributing tests:

**Eager distribution** (default): Specs are distributed to streams upfront based on count.

**Lazy distribution**: Specs are assigned to streams as they become available, providing better load balancing:

\`\`\`bash
gauge run --parallel -n 4 --strategy lazy specs/
\`\`\`

### Thread-Safe Implementations

When running in parallel, ensure your step implementations are thread-safe:

\`\`\`javascript
const { Step, DataStore } = require('gauge-ts');

// Use Gauge's DataStore for scenario-scoped state
step('Store the order ID', async () => {
  const orderId = await orderPage.getOrderId();
  DataStore.scenarioStore.put('orderId', orderId);
});

step('Verify the order is confirmed', async () => {
  const orderId = DataStore.scenarioStore.get('orderId');
  const status = await api.getOrderStatus(orderId);
  expect(status).to.equal('confirmed');
});
\`\`\`

Gauge provides three data store scopes:

- **ScenarioStore**: Isolated per scenario (safest for parallel)
- **SpecStore**: Shared within a specification
- **SuiteStore**: Shared across all specs (use carefully with parallel)

---

## Plugins and Extensibility

Gauge's plugin architecture makes it highly extensible. Plugins handle language support, reporting, and IDE integration.

### Essential Plugins

\`\`\`bash
# HTML report generation
gauge install html-report

# XML report for CI/CD integration
gauge install xml-report

# JSON report for custom processing
gauge install json-report

# Screenshot plugin for failure captures
gauge install screenshot
\`\`\`

### HTML Report Configuration

Configure the HTML report in \`env/default/default.properties\`:

\`\`\`properties
# Report output directory
gauge_reports_dir = reports

# Overwrite previous reports
overwrite_reports = true

# Open report in browser after run
GAUGE_HTML_REPORT_THEME_PATH = default
\`\`\`

### Custom Plugin Development

Create custom plugins for specialized needs like integration with test management tools:

\`\`\`javascript
// custom-reporter/index.js
const { GaugeMessageEmitter } = require('gauge-ts');

class CustomReporter {
  onSuiteStart(suiteInfo) {
    console.log('Test suite started:', suiteInfo.name);
    this.results = [];
  }

  onScenarioEnd(scenarioResult) {
    this.results.push({
      name: scenarioResult.name,
      passed: scenarioResult.passed,
      duration: scenarioResult.duration,
      tags: scenarioResult.tags,
    });
  }

  onSuiteEnd() {
    // Push results to your test management tool
    this.publishResults(this.results);
  }

  async publishResults(results) {
    // Integration with TestRail, Zephyr, etc.
    await fetch('https://testrail.example.com/api/v2/add_results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    });
  }
}

module.exports = CustomReporter;
\`\`\`

---

## IDE Support

Gauge offers excellent IDE support that makes writing and maintaining specs productive.

### VS Code Extension

The official Gauge VS Code extension provides:

- Syntax highlighting for \`.spec\` and \`.cpt\` files
- Auto-completion for steps (pulls from existing implementations)
- One-click navigation from spec steps to their implementations
- Inline error highlighting for unimplemented steps
- Run/debug individual scenarios from the editor
- Refactoring support for renaming steps across specs

Install it from the VS Code marketplace:

\`\`\`bash
code --install-extension getgauge.gauge
\`\`\`

### IntelliJ IDEA Plugin

The IntelliJ plugin offers similar capabilities:

- Step completion and navigation
- Run configurations for specs and scenarios
- Integrated debugging
- Refactoring across specs and implementations

### Editor-Agnostic Benefits

Since specs are Markdown, they render well in any tool:

- GitHub and GitLab render \`.spec\` files with proper formatting
- Documentation tools can include specs directly
- Non-technical team members can read and review specs in any text editor
- Specs can be included in wikis and knowledge bases

---

## Environment Management

Gauge supports multiple environments for running tests against different configurations.

### Environment Properties

\`\`\`properties
# env/default/default.properties
base_url = http://localhost:3000
api_url = http://localhost:3001
timeout = 30000
headless = true
\`\`\`

\`\`\`properties
# env/staging/staging.properties
base_url = https://staging.example.com
api_url = https://api.staging.example.com
timeout = 60000
headless = true
\`\`\`

\`\`\`properties
# env/production/production.properties
base_url = https://www.example.com
api_url = https://api.example.com
timeout = 45000
headless = true
\`\`\`

### Using Environment Variables in Steps

\`\`\`javascript
step('Navigate to the home page', async () => {
  const baseUrl = process.env.base_url;
  await page.goto(baseUrl);
});

step('Set timeout to environment default', async () => {
  const timeout = parseInt(process.env.timeout || '30000');
  page.setDefaultTimeout(timeout);
});
\`\`\`

### Running with Specific Environments

\`\`\`bash
# Run with staging environment
gauge run --env staging specs/

# Run with production environment
gauge run --env production specs/smoke/
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: Gauge Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Gauge
        uses: getgauge/setup-gauge@master
        with:
          gauge-plugins: js, html-report, xml-report

      - name: Install dependencies
        run: npm ci

      - name: Run Gauge tests
        run: gauge run --parallel -n 4 specs/
        env:
          base_url: https://staging.example.com

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: gauge-reports
          path: reports/
\`\`\`

### Docker Integration

\`\`\`dockerfile
FROM node:20-slim

RUN curl -SsL https://downloads.gauge.org/stable | sh
RUN gauge install js
RUN gauge install html-report

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

CMD ["gauge", "run", "--parallel", "-n", "4", "specs/"]
\`\`\`

---

## Hooks and Execution Control

Gauge provides hooks at multiple levels for setup and teardown:

\`\`\`javascript
const {
  BeforeSuite, AfterSuite,
  BeforeSpec, AfterSpec,
  BeforeScenario, AfterScenario,
  BeforeStep, AfterStep,
} = require('gauge-ts');

beforeSuite(async () => {
  // Runs once before all specs
  await database.migrate();
  await browser.launch();
});

afterSuite(async () => {
  // Runs once after all specs
  await browser.close();
  await database.cleanup();
});

beforeScenario(async (context) => {
  // Runs before each scenario
  await database.seed();
  console.log('Starting:', context.currentScenario.name);
});

afterScenario(async (context) => {
  // Runs after each scenario
  if (context.currentScenario.isFailed) {
    const screenshot = await page.screenshot();
    gauge.screenshotFn = () => screenshot;
  }
  await database.reset();
});

beforeStep(async (context) => {
  console.log('Step:', context.currentStep.text);
});
\`\`\`

### Tagged Hooks

Run hooks only for specific tagged scenarios:

\`\`\`javascript
beforeScenario(async () => {
  await seedAdminUser();
}, { tags: ['admin'] });

afterScenario(async () => {
  await clearNotifications();
}, { tags: ['notifications'] });
\`\`\`

---

## Best Practices

### Write Specifications for Humans

Gauge specs should read like documentation. Take advantage of Markdown formatting:

\`\`\`markdown
# Order Processing

The order processing system handles the lifecycle of customer
orders from placement through fulfillment. Orders pass through
these stages: Pending, Confirmed, Shipped, and Delivered.

## Place a standard order

A standard order is placed by an authenticated customer
selecting products and completing checkout.

* Login as "customer@example.com" with password "CustomerPass1!"
* Search for product "Ergonomic Keyboard"
* Add the first result to the cart
* Proceed to checkout
* Select "Standard Shipping" as the delivery method
* Confirm the order
* Verify order status is "Pending"
\`\`\`

### Organize Specs by Feature Domain

Group specifications by business domain rather than by technical implementation:

\`\`\`
specs/
  authentication/
    login.spec
    registration.spec
    password-reset.spec
  orders/
    place-order.spec
    cancel-order.spec
    order-history.spec
  inventory/
    stock-management.spec
    low-stock-alerts.spec
\`\`\`

### Use Concepts for Common Workflows

Extract repeated step sequences into concepts to keep specs DRY and maintainable.

### Leverage Data Tables for Validation

Use tables extensively for boundary testing, validation rules, and multi-user scenarios. They make test data visible and easy to review.

---

## Conclusion

Gauge's Markdown-first approach to BDD testing makes specifications genuinely readable and maintainable. The framework strikes an excellent balance between simplicity and power, with features like concepts, data tables, parallel execution, and a rich plugin ecosystem providing everything needed for comprehensive test automation.

Whether you are testing web applications, APIs, or complex distributed systems, Gauge's polyglot support and clean architecture make it an excellent choice. The ability to write specs that render beautifully as documentation while also being executable tests means your team always has up-to-date living documentation of system behavior.
`,
};
