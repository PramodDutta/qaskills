import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'TestCafe E2E Testing: No WebDriver Required Guide',
  description:
    'Complete guide to TestCafe E2E testing without WebDriver. Covers TestCafe architecture, selectors, actions, assertions, roles for authentication, request mocking, and CI/CD setup.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
TestCafe is an end-to-end testing framework that takes a fundamentally different approach from Selenium-based tools. Instead of controlling browsers through WebDriver or the DevTools Protocol, TestCafe injects scripts directly into the page under test. This means there is no external driver to install, no version compatibility to manage, and no browser-specific binaries to download.

This architecture choice gives TestCafe unique advantages: zero-configuration browser setup, automatic waiting, and the ability to test in any browser that runs JavaScript, including remote devices and cloud browsers. This guide covers TestCafe from setup through advanced patterns like roles, request mocking, and CI integration.

## Key Takeaways

- TestCafe requires no WebDriver, browser plugins, or additional binaries
- Tests run by injecting a proxy script into the browser, giving TestCafe control over page behavior
- The selector API provides automatic waiting and retry logic for stable element queries
- Roles enable reusable authentication patterns across tests
- Request mocking (RequestMock and RequestLogger) lets you intercept and modify HTTP traffic
- TestCafe supports Chrome, Firefox, Safari, Edge, and remote browsers out of the box

---

## How TestCafe Works

TestCafe acts as a reverse proxy between the browser and the application:

\`\`\`
Browser <-> TestCafe Proxy <-> Your Application
\`\`\`

When you run a test, TestCafe:

1. Starts a local proxy server
2. Opens the browser pointing to the proxy URL
3. Injects test scripts into every page the browser loads
4. Intercepts requests and responses to enable mocking and assertions
5. Reports results back to the test runner

This design eliminates the driver compatibility issues that plague Selenium-based tools. If a browser can load web pages, TestCafe can test in it.

---

## Setup and Installation

### Installation

\`\`\`bash
npm install -D testcafe
\`\`\`

That is the entire setup. No browser drivers, no Java, no Selenium. TestCafe uses browsers already installed on your machine.

### Configuration

Create a \`.testcaferc.json\` file:

\`\`\`json
{
    "browsers": ["chrome:headless"],
    "src": "tests/e2e/**/*.test.js",
    "screenshots": {
        "path": "tests/screenshots",
        "takeOnFails": true,
        "fullPage": true
    },
    "reporter": [
        { "name": "spec" },
        { "name": "xunit", "output": "reports/results.xml" }
    ],
    "concurrency": 3,
    "retryTestPages": true,
    "pageLoadTimeout": 10000,
    "assertionTimeout": 5000,
    "selectorTimeout": 10000
}
\`\`\`

### Running Tests

\`\`\`bash
# Run all tests in Chrome
npx testcafe chrome tests/

# Headless Chrome
npx testcafe chrome:headless tests/

# Multiple browsers
npx testcafe chrome,firefox tests/

# Specific test file
npx testcafe chrome tests/login.test.js

# Run with concurrency (3 browser instances)
npx testcafe chrome tests/ -c 3

# Live mode (re-runs on file changes)
npx testcafe chrome tests/ --live
\`\`\`

---

## Writing Tests

TestCafe tests use a fixture/test structure with async/await:

\`\`\`javascript
import { Selector } from 'testcafe';

fixture('Homepage')
    .page('https://example.com');

test('Page loads with correct title', async t => {
    await t.expect(Selector('h1').innerText).eql('Welcome');
});

test('Navigation links are visible', async t => {
    const navLinks = Selector('nav a');

    await t
        .expect(navLinks.count).gte(3)
        .expect(navLinks.nth(0).innerText).eql('Home')
        .expect(navLinks.nth(1).innerText).eql('About')
        .expect(navLinks.nth(2).innerText).eql('Contact');
});
\`\`\`

### Fixtures and Test Organization

Fixtures group related tests and can set shared configuration:

\`\`\`javascript
fixture('User Dashboard')
    .page('https://example.com/dashboard')
    .beforeEach(async t => {
        // Runs before each test in this fixture
        await t.useRole(adminRole);
    })
    .afterEach(async t => {
        // Runs after each test in this fixture
        await t.eval(() => localStorage.clear());
    });

test('Shows user statistics', async t => {
    await t
        .expect(Selector('.stats-panel').visible).ok()
        .expect(Selector('.total-users').innerText).notEql('0');
});

test('Recent activity list is populated', async t => {
    await t
        .expect(Selector('.activity-list .item').count).gt(0);
});
\`\`\`

---

## Selectors

TestCafe selectors automatically wait for elements to appear in the DOM and retry queries until the timeout expires.

### Basic Selectors

\`\`\`javascript
import { Selector } from 'testcafe';

// CSS selector
const submitButton = Selector('button[type="submit"]');

// By ID
const header = Selector('#main-header');

// By class
const errorMessages = Selector('.error-message');

// By tag name
const allLinks = Selector('a');

// Nested selectors
const menuItems = Selector('.sidebar').find('.menu-item');
\`\`\`

### Filtering Selectors

\`\`\`javascript
const items = Selector('.list-item');

// By index
const firstItem = items.nth(0);
const lastItem = items.nth(-1);

// By text content
const activeItem = items.withText('Active');
const exactMatch = items.withExactText('Active Users');

// By attribute
const checkedBoxes = Selector('input[type="checkbox"]')
    .withAttribute('checked');

// Filter with a function
const largeItems = items.filter(node => {
    return node.offsetHeight > 100;
});

// Parent/child traversal
const parent = Selector('.child').parent('.wrapper');
const siblings = Selector('.target').sibling('.related');
\`\`\`

### Custom Selectors

\`\`\`javascript
// Select by React component (with testcafe-react-selectors)
import { ReactSelector } from 'testcafe-react-selectors';

const todoItem = ReactSelector('TodoItem');
const completedTodos = ReactSelector('TodoItem')
    .withProps({ completed: true });

// Select by test ID (recommended pattern)
const loginButton = Selector('[data-testid="login-button"]');
\`\`\`

---

## Actions

TestCafe provides a rich set of actions that automatically wait for elements to be actionable.

### Click and Type

\`\`\`javascript
test('Fill out and submit a form', async t => {
    await t
        .click(Selector('input[name="email"]'))
        .typeText(Selector('input[name="email"]'), 'jane@example.com')
        .typeText(Selector('input[name="password"]'), 'securePass123')
        .click(Selector('button[type="submit"]'));
});
\`\`\`

### Advanced Input Actions

\`\`\`javascript
test('Form interactions', async t => {
    // Clear field before typing
    await t.typeText('#search', 'new query', { replace: true });

    // Type character by character (triggers keydown/keyup events)
    await t.typeText('#search', 'slow typing', { speed: 0.1 });

    // Press keyboard keys
    await t.pressKey('enter');
    await t.pressKey('ctrl+a delete');

    // Select from dropdown
    await t.click('#country-select')
        .click(Selector('option').withText('United States'));

    // Checkboxes and radio buttons
    await t.click('#agree-checkbox');
    await t.click('input[value="premium"]');
});
\`\`\`

### Drag and Drop

\`\`\`javascript
test('Drag and drop items', async t => {
    const draggable = Selector('.drag-item');
    const dropZone = Selector('.drop-zone');

    await t.dragToElement(draggable, dropZone);
});
\`\`\`

### File Upload

\`\`\`javascript
test('Upload a file', async t => {
    await t.setFilesToUpload(
        Selector('input[type="file"]'),
        ['./test-files/document.pdf']
    );

    await t.expect(Selector('.upload-success').visible).ok();
});
\`\`\`

### Scrolling

\`\`\`javascript
test('Scroll to element', async t => {
    const footer = Selector('footer');

    await t.scrollIntoView(footer);
    await t.expect(footer.visible).ok();

    // Scroll by offset
    await t.scroll(0, 500);
});
\`\`\`

---

## Assertions

TestCafe assertions use the \`expect\` API with built-in waiting:

### Value Assertions

\`\`\`javascript
test('Assertion examples', async t => {
    const title = Selector('h1');
    const count = Selector('.item-count');
    const price = Selector('.price');

    // String assertions
    await t.expect(title.innerText).eql('Dashboard');
    await t.expect(title.innerText).contains('Dash');
    await t.expect(title.innerText).notEql('Login');
    await t.expect(title.innerText).match(/^Dash/);

    // Numeric assertions
    await t.expect(count.innerText).eql('42');

    // Boolean assertions
    await t.expect(title.visible).ok();
    await t.expect(title.visible).ok('Title should be visible');
    await t.expect(Selector('.error').visible).notOk();
});
\`\`\`

### Element Property Assertions

\`\`\`javascript
test('Element properties', async t => {
    const input = Selector('#email');
    const button = Selector('#submit');

    // Check element exists
    await t.expect(input.exists).ok();

    // Check attributes
    await t.expect(input.getAttribute('type')).eql('email');
    await t.expect(input.getAttribute('placeholder'))
        .contains('Enter email');

    // Check CSS
    await t.expect(button.getStyleProperty('background-color'))
        .eql('rgb(0, 123, 255)');

    // Check element count
    await t.expect(Selector('.list-item').count).eql(5);

    // Check value of input
    await t.expect(input.value).eql('');
    await t.typeText(input, 'test@example.com');
    await t.expect(input.value).eql('test@example.com');
});
\`\`\`

### Custom Assertion Timeout

\`\`\`javascript
// Override timeout for a specific assertion
await t.expect(Selector('.slow-content').visible)
    .ok('Content should load', { timeout: 30000 });
\`\`\`

---

## Roles for Authentication

Roles let you define reusable authentication states. TestCafe caches the browser state (cookies, localStorage) after the first login and restores it for subsequent uses, making tests faster.

### Defining Roles

\`\`\`javascript
import { Role, Selector } from 'testcafe';

const adminRole = Role('https://example.com/login', async t => {
    await t
        .typeText('#email', 'admin@example.com')
        .typeText('#password', 'adminPass123')
        .click('#login-button');
}, { preserveUrl: true });

const userRole = Role('https://example.com/login', async t => {
    await t
        .typeText('#email', 'user@example.com')
        .typeText('#password', 'userPass123')
        .click('#login-button');
}, { preserveUrl: true });

const anonymousRole = Role.anonymous();
\`\`\`

### Using Roles in Tests

\`\`\`javascript
fixture('Admin Dashboard')
    .page('https://example.com/dashboard');

test('Admin sees admin panel', async t => {
    await t.useRole(adminRole);

    await t
        .expect(Selector('.admin-panel').visible).ok()
        .expect(Selector('.user-role').innerText).eql('Admin');
});

test('Regular user does not see admin panel', async t => {
    await t.useRole(userRole);

    await t
        .expect(Selector('.admin-panel').exists).notOk()
        .expect(Selector('.user-role').innerText).eql('User');
});

test('Anonymous user is redirected to login', async t => {
    await t.useRole(anonymousRole);

    await t.expect(Selector('#login-form').visible).ok();
});

test('Switch roles mid-test', async t => {
    await t.useRole(userRole);
    await t.expect(Selector('.dashboard').visible).ok();

    await t.useRole(adminRole);
    await t.expect(Selector('.admin-panel').visible).ok();

    await t.useRole(anonymousRole);
    await t.expect(Selector('#login-form').visible).ok();
});
\`\`\`

---

## Request Mocking

TestCafe provides \`RequestMock\` for intercepting HTTP requests and \`RequestLogger\` for monitoring them.

### RequestMock

\`\`\`javascript
import { RequestMock, Selector } from 'testcafe';

const mockUsers = RequestMock()
    .onRequestTo('https://api.example.com/users')
    .respond([
        { id: 1, name: 'Jane Doe' },
        { id: 2, name: 'John Smith' },
    ], 200, {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
    });

const mockError = RequestMock()
    .onRequestTo('https://api.example.com/users')
    .respond(
        { error: 'Internal Server Error' },
        500,
        { 'content-type': 'application/json' }
    );

fixture('User List')
    .page('https://example.com/users');

test
    .requestHooks(mockUsers)
    ('Displays mocked user list', async t => {
        await t
            .expect(Selector('.user-item').count).eql(2)
            .expect(Selector('.user-item').nth(0).innerText)
                .contains('Jane Doe');
    });

test
    .requestHooks(mockError)
    ('Shows error state on API failure', async t => {
        await t
            .expect(Selector('.error-message').visible).ok()
            .expect(Selector('.error-message').innerText)
                .contains('Something went wrong');
    });
\`\`\`

### RequestLogger

\`\`\`javascript
import { RequestLogger, Selector } from 'testcafe';

const apiLogger = RequestLogger(
    'https://api.example.com/analytics',
    {
        logRequestBody: true,
        logResponseBody: true,
        stringifyRequestBody: true,
    }
);

fixture('Analytics Tracking')
    .page('https://example.com')
    .requestHooks(apiLogger);

test('Sends analytics event on button click', async t => {
    await t.click(Selector('.track-button'));

    // Wait for the request to be logged
    await t.expect(apiLogger.count(
        r => r.request.method === 'post'
    )).eql(1);

    const request = apiLogger.requests[0];
    const body = JSON.parse(request.request.body);

    await t.expect(body.event).eql('button_click');
    await t.expect(body.page).eql('/');
});
\`\`\`

### Conditional Mocking

\`\`\`javascript
const conditionalMock = RequestMock()
    .onRequestTo(request => {
        return request.url.includes('/api/')
            && request.method === 'post';
    })
    .respond((req, res) => {
        const body = JSON.parse(req.body);
        if (body.email === 'existing@example.com') {
            res.statusCode = 409;
            res.headers['content-type'] = 'application/json';
            res.setBody(JSON.stringify({
                error: 'User already exists'
            }));
        } else {
            res.statusCode = 201;
            res.headers['content-type'] = 'application/json';
            res.setBody(JSON.stringify({
                id: 1, email: body.email
            }));
        }
    });
\`\`\`

---

## Client-Side JavaScript

Execute JavaScript directly in the browser context:

\`\`\`javascript
import { ClientFunction, Selector } from 'testcafe';

const getPageUrl = ClientFunction(() => window.location.href);
const getLocalStorageItem = ClientFunction(
    key => localStorage.getItem(key)
);
const scrollToBottom = ClientFunction(
    () => window.scrollTo(0, document.body.scrollHeight)
);

fixture('Client Functions')
    .page('https://example.com');

test('URL changes after navigation', async t => {
    await t.click(Selector('a').withText('About'));
    const url = await getPageUrl();
    await t.expect(url).contains('/about');
});

test('Check localStorage value', async t => {
    await t.click(Selector('#save-preference'));
    const theme = await getLocalStorageItem('theme');
    await t.expect(theme).eql('dark');
});
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  testcafe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Start application
        run: npm start &
        env:
          PORT: 3000

      - name: Wait for application
        run: npx wait-on http://localhost:3000

      - name: Run TestCafe tests
        run: npx testcafe chrome:headless tests/
          --reporter spec,xunit:reports/results.xml
          --screenshots tests/screenshots
          --screenshots-on-fails

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: testcafe-artifacts
          path: |
            tests/screenshots/
            reports/
\`\`\`

### Docker

\`\`\`dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y \\
    chromium \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ENV CHROMIUM_PATH=/usr/bin/chromium

CMD ["npx", "testcafe", "chromium:headless", "tests/"]
\`\`\`

---

## Concurrency and Parallel Execution

TestCafe supports concurrent test execution with a simple flag:

\`\`\`bash
# Run tests in 3 browser instances simultaneously
npx testcafe chrome tests/ -c 3
\`\`\`

\`\`\`json
{
    "concurrency": 3,
    "browsers": ["chrome:headless"]
}
\`\`\`

This launches multiple browser windows that each pick up the next available test from the queue. Unlike other tools that require complex configuration for parallelism, TestCafe handles it with a single number.

### Parallel Across Browsers

\`\`\`bash
# Run in Chrome and Firefox simultaneously
npx testcafe chrome,firefox tests/ -c 2
\`\`\`

---

## Debugging

### Debug Mode

\`\`\`javascript
test('Debug a failing test', async t => {
    await t.navigateTo('https://example.com');

    // Pause execution and open browser DevTools
    await t.debug();

    await t.click('#submit');
});
\`\`\`

### Live Mode

\`\`\`bash
# Re-runs tests on file changes
npx testcafe chrome tests/ --live
\`\`\`

### Screenshots and Videos

\`\`\`json
{
    "screenshots": {
        "path": "tests/screenshots",
        "takeOnFails": true,
        "fullPage": true,
        "pathPattern": "\\\${DATE}_\\\${TIME}/\\\${FIXTURE}/\\\${TEST}/\\\${FILE_INDEX}.png"
    },
    "videoPath": "tests/videos",
    "videoOptions": {
        "failedOnly": true,
        "pathPattern": "\\\${DATE}_\\\${TIME}/\\\${FIXTURE}/\\\${TEST}.mp4"
    }
}
\`\`\`

---

## When to Choose TestCafe

**TestCafe is a good fit when:**
- You want zero setup for browser automation (no drivers to install or manage)
- You need to test in browsers on remote devices or cloud services
- You value the simplicity of a single \`npm install\` for the entire testing framework
- The role-based authentication pattern fits your application
- You need request mocking without additional libraries
- Your team prefers a proxy-based architecture over WebDriver or CDP

**Consider alternatives when:**
- You need the deepest possible browser control (Playwright or Puppeteer via CDP)
- You want built-in component testing (Cypress has first-class support)
- You need the trace viewer debugging experience (Playwright)
- Your team is already invested in a WebDriver ecosystem (Selenium, Nightwatch)

---

## Summary

TestCafe eliminates the biggest pain point of browser testing: driver management. By injecting scripts through a proxy, it works with any browser without external dependencies. The selector API with automatic waiting, roles for authentication, and request mocking for network control provide everything you need for comprehensive E2E testing. Combined with simple concurrency and straightforward CI integration, TestCafe remains a practical and productive choice for teams that want to write end-to-end tests without fighting infrastructure.
`,
};
