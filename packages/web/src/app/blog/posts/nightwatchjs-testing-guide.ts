import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Nightwatch.js E2E Testing: Complete Guide',
  description:
    'Complete guide to Nightwatch.js E2E testing. Covers setup, page objects, custom commands, assertions, Selenium WebDriver integration, parallel testing, and CI/CD configuration.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
Nightwatch.js is an end-to-end testing framework built on top of the W3C WebDriver API (formerly Selenium). It provides a clean, expressive syntax for writing browser tests, a built-in test runner, and out-of-the-box support for page objects, custom commands, and parallel execution.

While Playwright and Cypress have gained significant market share, Nightwatch remains a strong choice for teams that want WebDriver compatibility, simple configuration, and a familiar assertion style. This guide covers everything from initial setup through page objects, custom commands, and CI integration.

## Key Takeaways

- Nightwatch.js 3.x supports Selenium WebDriver, Chrome DevTools Protocol, and direct browser drivers
- The built-in test runner handles parallel execution, retries, and multiple environments
- Page objects encapsulate page-specific selectors and methods for maintainable tests
- Custom commands and assertions extend the framework with reusable testing utilities
- Nightwatch integrates with Selenium Grid for distributed cross-browser testing
- Configuration supports multiple environments (dev, staging, production) in a single file

---

## Setting Up Nightwatch

### Installation

\`\`\`bash
# Initialize a new project with Nightwatch
npm init nightwatch@latest

# Or add to an existing project
npm install nightwatch --save-dev
npm install chromedriver --save-dev
\`\`\`

The \`npm init nightwatch\` command walks you through an interactive setup that generates a configuration file and example tests.

### Configuration

Nightwatch uses a \`nightwatch.conf.js\` (or \`.nightwatch.json\`) configuration file:

\`\`\`javascript
// nightwatch.conf.js
module.exports = {
    src_folders: ['tests/e2e'],
    page_objects_path: ['tests/page-objects'],
    custom_commands_path: ['tests/custom-commands'],
    custom_assertions_path: ['tests/custom-assertions'],

    webdriver: {
        start_process: true,
        server_path: require('chromedriver').path,
        port: 9515,
    },

    test_settings: {
        default: {
            desiredCapabilities: {
                browserName: 'chrome',
                'goog:chromeOptions': {
                    args: ['--headless=new'],
                },
            },
            screenshots: {
                enabled: true,
                on_failure: true,
                path: 'tests/screenshots',
            },
        },

        firefox: {
            desiredCapabilities: {
                browserName: 'firefox',
                'moz:firefoxOptions': {
                    args: ['--headless'],
                },
            },
            webdriver: {
                start_process: true,
                server_path: require('geckodriver').path,
                port: 4444,
            },
        },

        selenium: {
            selenium: {
                start_process: true,
                port: 4444,
                server_path: require('selenium-server').path,
            },
            desiredCapabilities: {
                browserName: 'chrome',
            },
        },
    },
};
\`\`\`

### Running Tests

\`\`\`bash
# Run all tests with default settings
npx nightwatch

# Run a specific test file
npx nightwatch tests/e2e/login.test.js

# Run with a specific environment
npx nightwatch --env firefox

# Run tests in parallel
npx nightwatch --parallel

# Run with tags
npx nightwatch --tag smoke
\`\`\`

---

## Writing Your First Test

Nightwatch tests export an object where each key is a test step:

\`\`\`javascript
// tests/e2e/homepage.test.js
module.exports = {
    'Homepage loads successfully': function (browser) {
        browser
            .navigateTo('https://example.com')
            .waitForElementVisible('body')
            .assert.titleContains('Example')
            .assert.visible('h1')
            .assert.textContains('h1', 'Welcome');
    },

    'Navigation links work': function (browser) {
        browser
            .navigateTo('https://example.com')
            .click('a[href="/about"]')
            .assert.urlContains('/about')
            .assert.visible('h1')
            .assert.textContains('h1', 'About Us');
    },

    after: function (browser) {
        browser.end();
    },
};
\`\`\`

### Using Async/Await

Nightwatch 3.x supports async/await syntax:

\`\`\`javascript
module.exports = {
    'Login with valid credentials': async function (browser) {
        await browser.navigateTo('https://example.com/login');

        await browser
            .setValue('input[name="email"]', 'jane@example.com')
            .setValue('input[name="password"]', 'securePass123')
            .click('button[type="submit"]');

        await browser.waitForElementVisible('.dashboard');
        await browser.assert.urlContains('/dashboard');
        await browser.assert.textContains(
            '.welcome-message', 'Hello, Jane'
        );
    },
};
\`\`\`

### Test Hooks

Nightwatch provides lifecycle hooks at the test module level:

\`\`\`javascript
module.exports = {
    before: function (browser) {
        // Runs once before all tests in this file
        console.log('Setting up test suite');
    },

    beforeEach: function (browser) {
        // Runs before each test
        browser.navigateTo('https://example.com');
    },

    afterEach: function (browser) {
        // Runs after each test
        browser.deleteCookies();
    },

    after: function (browser) {
        // Runs once after all tests in this file
        browser.end();
    },

    'Test one': function (browser) {
        // ...
    },

    'Test two': function (browser) {
        // ...
    },
};
\`\`\`

---

## Assertions

Nightwatch includes two assertion namespaces:

- \`browser.assert\` — fails the test immediately on assertion failure
- \`browser.verify\` — logs the failure but continues execution

### Common Assertions

\`\`\`javascript
// Element visibility
browser.assert.visible('.header');
browser.assert.not.visible('.modal');

// Text content
browser.assert.textContains('.message', 'Success');
browser.assert.textEquals('.count', '42');

// Element attributes
browser.assert.attributeEquals('input', 'type', 'email');
browser.assert.attributeContains('a', 'href', '/dashboard');

// CSS properties
browser.assert.cssProperty('.button', 'background-color', 'rgba(0, 123, 255, 1)');

// Element count
browser.assert.elementsCount('.list-item', 5);

// URL and title
browser.assert.urlContains('/dashboard');
browser.assert.titleContains('Dashboard');

// Value of form inputs
browser.assert.valueEquals('input[name="email"]', 'jane@example.com');
\`\`\`

### Element State Assertions

\`\`\`javascript
// Element exists in DOM
browser.assert.elementPresent('.sidebar');

// Element is enabled/disabled
browser.assert.enabled('button[type="submit"]');
browser.assert.not.enabled('.disabled-button');

// Element is selected (checkboxes, radio buttons)
browser.assert.selected('input[name="agree"]');
\`\`\`

---

## Page Objects

Page objects encapsulate page-specific selectors and behaviors, making tests more maintainable and readable.

### Defining a Page Object

\`\`\`javascript
// tests/page-objects/loginPage.js
module.exports = {
    url: function () {
        return this.api.launchUrl + '/login';
    },

    elements: {
        emailInput: {
            selector: 'input[name="email"]',
        },
        passwordInput: {
            selector: 'input[name="password"]',
        },
        submitButton: {
            selector: 'button[type="submit"]',
        },
        errorMessage: {
            selector: '.error-message',
        },
        forgotPasswordLink: {
            selector: 'a[href="/forgot-password"]',
        },
    },

    commands: [
        {
            login: function (email, password) {
                return this.setValue('@emailInput', email)
                    .setValue('@passwordInput', password)
                    .click('@submitButton');
            },

            assertErrorVisible: function (expectedText) {
                return this.waitForElementVisible('@errorMessage')
                    .assert.textContains(
                        '@errorMessage', expectedText
                    );
            },
        },
    ],
};
\`\`\`

### Using Page Objects in Tests

\`\`\`javascript
module.exports = {
    'Login with valid credentials': function (browser) {
        const loginPage = browser.page.loginPage();

        loginPage
            .navigate()
            .login('jane@example.com', 'securePass123');

        browser.assert.urlContains('/dashboard');
    },

    'Login shows error for invalid credentials': function (browser) {
        const loginPage = browser.page.loginPage();

        loginPage
            .navigate()
            .login('jane@example.com', 'wrongpassword')
            .assertErrorVisible('Invalid credentials');
    },
};
\`\`\`

### Sections

Page objects support sections for complex pages:

\`\`\`javascript
// tests/page-objects/dashboardPage.js
module.exports = {
    url: function () {
        return this.api.launchUrl + '/dashboard';
    },

    sections: {
        header: {
            selector: '.dashboard-header',
            elements: {
                title: { selector: 'h1' },
                userMenu: { selector: '.user-menu' },
                logoutButton: { selector: '.logout-btn' },
            },
            commands: [
                {
                    logout: function () {
                        return this.click('@userMenu')
                            .click('@logoutButton');
                    },
                },
            ],
        },
        sidebar: {
            selector: '.sidebar',
            elements: {
                navLinks: { selector: 'a.nav-link' },
                settingsLink: { selector: 'a[href="/settings"]' },
            },
        },
    },
};
\`\`\`

\`\`\`javascript
// Using sections in tests
module.exports = {
    'Dashboard header shows user name': function (browser) {
        const dashboard = browser.page.dashboardPage();

        dashboard.navigate();

        dashboard.section.header
            .assert.visible('@title')
            .assert.textContains('@title', 'Dashboard');
    },

    'Logout from dashboard': function (browser) {
        const dashboard = browser.page.dashboardPage();

        dashboard.navigate();
        dashboard.section.header.logout();

        browser.assert.urlContains('/login');
    },
};
\`\`\`

---

## Custom Commands

Custom commands extend the Nightwatch API with reusable functionality.

### Creating a Custom Command

\`\`\`javascript
// tests/custom-commands/login.js
module.exports = {
    command: function (email, password) {
        this.navigateTo(this.launchUrl + '/login')
            .setValue('input[name="email"]', email)
            .setValue('input[name="password"]', password)
            .click('button[type="submit"]')
            .waitForElementVisible('.dashboard');

        return this;
    },
};
\`\`\`

### Using Custom Commands

\`\`\`javascript
module.exports = {
    'Authenticated user can view profile': function (browser) {
        browser
            .login('jane@example.com', 'securePass123')
            .navigateTo(browser.launchUrl + '/profile')
            .assert.visible('.profile-info')
            .assert.textContains('.user-name', 'Jane');
    },
};
\`\`\`

### Custom Assertions

\`\`\`javascript
// tests/custom-assertions/elementCount.js
exports.assertion = function (selector, expectedCount) {
    this.message = \\\`Testing if element <\\\${selector}> count equals \\\${expectedCount}\\\`;

    this.expected = expectedCount;

    this.evaluate = function (value) {
        return value === expectedCount;
    };

    this.value = function (result) {
        return result.value.length;
    };

    this.command = function (callback) {
        this.api.elements('css selector', selector, callback);
        return this;
    };
};
\`\`\`

\`\`\`javascript
// Usage
browser.assert.elementCount('.list-item', 5);
\`\`\`

---

## Parallel Testing

Nightwatch supports parallel test execution at multiple levels.

### File-Level Parallelism

Run test files in parallel across multiple workers:

\`\`\`javascript
// nightwatch.conf.js
module.exports = {
    test_workers: {
        enabled: true,
        workers: 4,
    },
};
\`\`\`

\`\`\`bash
npx nightwatch --parallel
\`\`\`

### Environment-Level Parallelism

Run the same tests across multiple browsers simultaneously:

\`\`\`bash
npx nightwatch --env chrome,firefox
\`\`\`

### Selenium Grid Integration

For distributed testing across machines:

\`\`\`javascript
// nightwatch.conf.js
module.exports = {
    test_settings: {
        grid: {
            selenium: {
                host: 'selenium-hub.example.com',
                port: 4444,
            },
            desiredCapabilities: {
                browserName: 'chrome',
                'se:options': {
                    maxInstances: 5,
                },
            },
        },
    },
};
\`\`\`

---

## Working with Waits

### Implicit vs Explicit Waits

\`\`\`javascript
// Global implicit wait (in config)
module.exports = {
    test_settings: {
        default: {
            globals: {
                waitForConditionTimeout: 10000,
            },
        },
    },
};
\`\`\`

\`\`\`javascript
// Explicit waits in tests
browser
    .waitForElementVisible('.dynamic-content', 5000)
    .waitForElementNotPresent('.loading-spinner', 10000)
    .waitForElementPresent('.loaded-content');
\`\`\`

### Waiting for Network Requests

\`\`\`javascript
module.exports = {
    'Wait for API response': async function (browser) {
        await browser.navigateTo('https://example.com/data');

        // Wait for element that appears after API loads
        await browser.waitForElementVisible(
            '.data-loaded', 15000
        );

        await browser.assert.elementsCount('.data-row', 10);
    },
};
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  nightwatch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Start application
        run: npm run start &
        env:
          PORT: 3000

      - name: Wait for app
        run: npx wait-on http://localhost:3000

      - name: Run Nightwatch tests
        run: npx nightwatch --headless
        env:
          LAUNCH_URL: http://localhost:3000

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: nightwatch-screenshots
          path: tests/screenshots/
\`\`\`

### Docker Setup

\`\`\`dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y \\
    chromium \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ENV CHROME_BIN=/usr/bin/chromium
CMD ["npx", "nightwatch", "--headless"]
\`\`\`

---

## Tags and Test Organization

### Tagging Tests

\`\`\`javascript
module.exports = {
    '@tags': ['smoke', 'login'],

    'Login works with valid credentials': function (browser) {
        // ...
    },
};
\`\`\`

\`\`\`bash
# Run only smoke tests
npx nightwatch --tag smoke

# Run tests with multiple tags
npx nightwatch --tag smoke --tag login

# Skip tests with a tag
npx nightwatch --skiptags slow
\`\`\`

### Disabling Tests

\`\`\`javascript
module.exports = {
    '@disabled': true, // Disable entire file

    'Skipped test': function (browser) {
        // This will not run
    },
};
\`\`\`

---

## Debugging Tips

### Running in Headed Mode

\`\`\`bash
# Override headless in config
npx nightwatch --headless false
\`\`\`

### Pausing Execution

\`\`\`javascript
module.exports = {
    'Debug a specific step': function (browser) {
        browser
            .navigateTo('https://example.com')
            .pause(0) // Opens REPL for interactive debugging
            .assert.visible('.content');
    },
};
\`\`\`

### Verbose Output

\`\`\`bash
npx nightwatch --verbose
\`\`\`

### Screenshots on Failure

Configure automatic screenshots in \`nightwatch.conf.js\`:

\`\`\`javascript
screenshots: {
    enabled: true,
    on_failure: true,
    on_error: true,
    path: 'tests/screenshots',
},
\`\`\`

---

## Nightwatch vs Other Frameworks

**When Nightwatch is a good fit:**
- You need WebDriver/Selenium compatibility
- Your organization has existing Selenium Grid infrastructure
- You want a batteries-included framework with page objects and custom commands built in
- You prefer a configuration-driven approach over code-driven setup
- You need to test across browsers using the W3C WebDriver standard

**When to consider alternatives:**
- If you need the fastest possible execution and auto-waiting, look at Playwright
- If your team prefers an interactive test runner with time-travel debugging, look at Cypress
- If you are already heavily invested in another Selenium-based tool, the migration effort may not be justified

---

## Summary

Nightwatch.js provides a comprehensive E2E testing experience built on WebDriver. Its page object system, custom commands, parallel execution, and multi-environment configuration make it suitable for testing applications across browsers at scale. While newer tools have introduced innovations like auto-waiting and trace viewers, Nightwatch's WebDriver foundation means it works with any browser that implements the W3C standard, and its straightforward API keeps tests readable and maintainable. For teams with Selenium infrastructure or those who value the WebDriver ecosystem, Nightwatch remains a solid choice in 2026.
`,
};
