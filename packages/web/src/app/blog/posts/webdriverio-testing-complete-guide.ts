import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'WebDriverIO Testing: The Complete 2026 Guide',
  description:
    'Master WebDriverIO testing with this complete guide covering setup, selectors, page objects, async/await patterns, mobile testing, visual regression, and CI/CD integration for 2026.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
WebDriverIO has evolved into one of the most versatile browser and mobile automation frameworks available today. Whether you are testing web applications, native mobile apps, or hybrid solutions, WebDriverIO provides a unified API that simplifies cross-platform test automation. This comprehensive guide walks you through every aspect of WebDriverIO testing in 2026, from initial setup to advanced patterns used in production environments.

## Key Takeaways

- WebDriverIO v9 delivers a fully async-first API with built-in TypeScript support and simplified configuration
- The Page Object pattern in WebDriverIO uses getter-based element selectors for lazy evaluation and composability
- Mobile testing with Appium integration enables a single framework for web and native app testing
- Visual regression testing via \`@wdio/visual-service\` catches UI drift automatically across browsers
- WebDriverIO's plugin ecosystem supports parallel execution, custom reporters, and CI/CD integrations out of the box
- AI-powered QA skills from qaskills.sh can generate WebDriverIO tests with proper patterns and best practices

---

## What is WebDriverIO?

WebDriverIO is a progressive automation framework built on top of the WebDriver and Chrome DevTools protocols. Unlike frameworks that only support browser automation, WebDriverIO works across web browsers, mobile devices, and even desktop applications. It provides a concise, expressive API that reduces boilerplate while giving you full control over the automation stack.

The framework follows the "batteries included" philosophy with its test runner (\`@wdio/cli\`), built-in assertion library, and an extensive plugin system for reporters, services, and custom integrations.

---

## Setting Up WebDriverIO

Getting started with WebDriverIO is straightforward thanks to the interactive configuration wizard.

\`\`\`bash
# Create a new project
mkdir my-wdio-project && cd my-wdio-project
npm init -y

# Run the WebDriverIO setup wizard
npm init wdio@latest .
\`\`\`

The wizard prompts you for your testing preferences: framework (Mocha, Jasmine, or Cucumber), reporter, services, and base URL. For most projects, select Mocha as the framework, spec reporter for console output, and the chromedriver service for local development.

Your generated \`wdio.conf.ts\` file serves as the central configuration:

\`\`\`typescript
// wdio.conf.ts
export const config: WebdriverIO.Config = {
  runner: 'local',
  autoCompileOpts: {
    tsNodeOpts: {
      project: './tsconfig.json',
    },
  },
  specs: ['./test/specs/**/*.ts'],
  exclude: [],
  maxInstances: 5,
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: ['--headless', '--disable-gpu', '--window-size=1920,1080'],
      },
    },
  ],
  logLevel: 'warn',
  bail: 0,
  baseUrl: 'http://localhost:3000',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
};
\`\`\`

---

## WebDriverIO Selectors and Element Interaction

WebDriverIO supports multiple selector strategies. Understanding when to use each strategy is critical for writing maintainable tests.

### CSS Selectors

\`\`\`typescript
// Basic CSS selectors
const submitButton = await \$('button[type="submit"]');
const emailInput = await \$('#email');
const errorMessages = await \$\$('.error-message');

// Nested selectors
const navLink = await \$('nav').\$('a.active');
\`\`\`

### Custom Selectors with data-testid

\`\`\`typescript
// Preferred: data-testid for test stability
const loginForm = await \$('[data-testid="login-form"]');
const usernameField = await \$('[data-testid="username-input"]');
const submitBtn = await \$('[data-testid="submit-button"]');
\`\`\`

### Chained and Indexed Selectors

\`\`\`typescript
// Get all list items and interact with specific ones
const items = await \$\$('ul.product-list li');
const thirdItem = items[2];
await thirdItem.\$('button.add-to-cart').click();

// Text-based selectors
const heading = await \$('h1=Welcome Back');
const partialMatch = await \$('p*=shipping');
\`\`\`

### React and Shadow DOM Selectors

\`\`\`typescript
// React component selectors (requires @wdio/react-service)
const component = await browser.react\$('ProductCard', {
  props: { featured: true },
});

// Shadow DOM piercing
const shadowElement = await \$('my-component')
  .shadow\$('button.internal');
\`\`\`

---

## The Page Object Pattern in WebDriverIO

Page Objects are the backbone of maintainable WebDriverIO test suites. WebDriverIO's getter-based pattern provides lazy evaluation, meaning elements are only located when they are actually used.

### Base Page Object

\`\`\`typescript
// test/pageobjects/page.ts
export default class Page {
  open(path: string) {
    return browser.url(path);
  }

  async waitForPageLoad() {
    await browser.waitUntil(
      async () => {
        const state = await browser.execute(
          () => document.readyState
        );
        return state === 'complete';
      },
      { timeout: 30000, timeoutMsg: 'Page did not load within 30s' }
    );
  }

  async getTitle() {
    return browser.getTitle();
  }
}
\`\`\`

### Login Page Object

\`\`\`typescript
// test/pageobjects/login.page.ts
import Page from './page';

class LoginPage extends Page {
  get inputUsername() {
    return \$('[data-testid="username"]');
  }

  get inputPassword() {
    return \$('[data-testid="password"]');
  }

  get btnSubmit() {
    return \$('[data-testid="login-submit"]');
  }

  get errorMessage() {
    return \$('[data-testid="login-error"]');
  }

  get successBanner() {
    return \$('[data-testid="login-success"]');
  }

  async login(username: string, password: string) {
    await this.inputUsername.setValue(username);
    await this.inputPassword.setValue(password);
    await this.btnSubmit.click();
  }

  async getErrorText() {
    await this.errorMessage.waitForDisplayed();
    return this.errorMessage.getText();
  }

  open() {
    return super.open('/login');
  }
}

export default new LoginPage();
\`\`\`

### Using Page Objects in Tests

\`\`\`typescript
// test/specs/login.spec.ts
import LoginPage from '../pageobjects/login.page';
import DashboardPage from '../pageobjects/dashboard.page';

describe('Login Feature', () => {
  beforeEach(async () => {
    await LoginPage.open();
  });

  it('should login with valid credentials', async () => {
    await LoginPage.login('testuser', 'securepass123');
    await DashboardPage.waitForPageLoad();
    await expect(DashboardPage.welcomeMessage).toHaveText(
      'Welcome, testuser'
    );
  });

  it('should show error for invalid credentials', async () => {
    await LoginPage.login('baduser', 'wrongpass');
    const error = await LoginPage.getErrorText();
    expect(error).toContain('Invalid username or password');
  });

  it('should disable submit button when fields are empty', async () => {
    await expect(LoginPage.btnSubmit).toBeDisabled();
  });
});
\`\`\`

---

## Async/Await Patterns and Waits

WebDriverIO v9 is fully async-first. Every browser and element command returns a Promise, and all tests must use async/await consistently.

### Explicit Waits

\`\`\`typescript
// Wait for element to be displayed
const notification = await \$('.notification');
await notification.waitForDisplayed({ timeout: 5000 });

// Wait for element to exist in DOM
const dynamicContent = await \$('#lazy-loaded');
await dynamicContent.waitForExist({ timeout: 10000 });

// Wait for element to be clickable
const button = await \$('button.proceed');
await button.waitForClickable({ timeout: 5000 });
await button.click();

// Wait for element to NOT be displayed (e.g., loading spinner)
const spinner = await \$('.loading-spinner');
await spinner.waitForDisplayed({ reverse: true, timeout: 15000 });
\`\`\`

### Custom Wait Conditions

\`\`\`typescript
// Wait for a custom condition
await browser.waitUntil(
  async () => {
    const count = await \$\$('.search-result').length;
    return count >= 10;
  },
  {
    timeout: 15000,
    timeoutMsg: 'Expected at least 10 search results',
    interval: 500,
  }
);

// Wait for network idle
await browser.waitUntil(
  async () => {
    const pending = await browser.execute(() => {
      return (performance as any)
        .getEntriesByType('resource')
        .filter((r: any) => !r.responseEnd).length;
    });
    return pending === 0;
  },
  { timeout: 10000 }
);
\`\`\`

### Handling Alerts and Frames

\`\`\`typescript
// Handle browser alerts
await \$('#trigger-alert').click();
await browser.acceptAlert();

// Switch to iframe
const frame = await \$('#payment-iframe');
await browser.switchToFrame(frame);
await \$('#card-number').setValue('4242424242424242');
await browser.switchToParentFrame();
\`\`\`

---

## Mobile Testing with Appium

WebDriverIO integrates seamlessly with Appium for mobile testing, allowing you to reuse patterns across web and mobile.

### Appium Configuration

\`\`\`typescript
// wdio.mobile.conf.ts
export const config: WebdriverIO.Config = {
  ...baseConfig,
  services: ['appium'],
  port: 4723,
  capabilities: [
    {
      platformName: 'Android',
      'appium:deviceName': 'Pixel_6_API_33',
      'appium:app': './apps/android-debug.apk',
      'appium:automationName': 'UiAutomator2',
      'appium:newCommandTimeout': 240,
    },
  ],
};
\`\`\`

### Mobile-Specific Commands

\`\`\`typescript
describe('Mobile App Tests', () => {
  it('should swipe through onboarding screens', async () => {
    const carousel = await \$('~onboarding-carousel');

    // Swipe left three times
    for (let i = 0; i < 3; i++) {
      await browser.execute('mobile: swipeGesture', {
        elementId: carousel.elementId,
        direction: 'left',
        percent: 0.75,
      });
    }

    await expect(\$('~get-started-button')).toBeDisplayed();
  });

  it('should handle native picker', async () => {
    await \$('~date-picker').click();

    // Scroll to select a date on Android
    await browser.execute('mobile: scrollGesture', {
      left: 100,
      top: 500,
      width: 200,
      height: 200,
      direction: 'down',
      percent: 1.0,
    });

    await \$('~confirm-date').click();
  });

  it('should toggle between portrait and landscape', async () => {
    await browser.setOrientation('LANDSCAPE');
    await expect(\$('~landscape-layout')).toBeDisplayed();

    await browser.setOrientation('PORTRAIT');
    await expect(\$('~portrait-layout')).toBeDisplayed();
  });
});
\`\`\`

---

## Visual Regression Testing

WebDriverIO's visual testing service captures and compares screenshots to detect unintended UI changes.

### Setup

\`\`\`bash
npm install @wdio/visual-service --save-dev
\`\`\`

\`\`\`typescript
// wdio.conf.ts
export const config: WebdriverIO.Config = {
  services: [
    [
      'visual',
      {
        baselineFolder: './test/visual/baseline',
        formatImageName: '{tag}-{browserName}-{width}x{height}',
        screenshotPath: './test/visual/screenshots',
        savePerInstance: true,
        blockOutStatusBar: true,
        blockOutToolBar: true,
      },
    ],
  ],
};
\`\`\`

### Visual Tests

\`\`\`typescript
describe('Visual Regression', () => {
  it('should match the homepage layout', async () => {
    await browser.url('/');
    await browser.waitUntil(
      async () =>
        (await \$\$('img').filter(
          async (img) => !(await img.getAttribute('complete'))
        )).length === 0,
      { timeout: 10000 }
    );

    const result = await browser.checkFullPageScreen('homepage', {
      fullPageScrollTimeout: 3000,
    });

    expect(result).toBeLessThan(0.5); // Less than 0.5% diff
  });

  it('should match component appearance', async () => {
    await browser.url('/components/buttons');
    const buttonGroup = await \$('[data-testid="button-showcase"]');

    const result = await browser.checkElement(
      buttonGroup,
      'button-showcase',
      {
        blockOutStatusBar: true,
        ignoreAntialiasing: true,
      }
    );

    expect(result).toBeLessThan(0.1);
  });
});
\`\`\`

---

## Multi-Browser and Parallel Execution

WebDriverIO supports running tests across multiple browsers simultaneously for comprehensive cross-browser coverage.

\`\`\`typescript
// wdio.conf.ts - Multi-browser capabilities
export const config: WebdriverIO.Config = {
  maxInstances: 10,
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: ['--headless', '--disable-gpu'],
      },
    },
    {
      browserName: 'firefox',
      'moz:firefoxOptions': {
        args: ['-headless'],
      },
    },
    {
      browserName: 'safari',
    },
  ],
};
\`\`\`

### Parallel Execution with Sharding

\`\`\`typescript
// wdio.conf.ts
export const config: WebdriverIO.Config = {
  maxInstances: 10,
  capabilities: [
    {
      maxInstances: 5,
      browserName: 'chrome',
    },
  ],
  // Specs are distributed across instances automatically
  specs: ['./test/specs/**/*.ts'],
  // Group related specs to run together
  suites: {
    smoke: ['./test/specs/smoke/**/*.ts'],
    regression: ['./test/specs/regression/**/*.ts'],
    checkout: [
      './test/specs/cart.spec.ts',
      './test/specs/payment.spec.ts',
      './test/specs/order-confirmation.spec.ts',
    ],
  },
};
\`\`\`

Run specific suites:

\`\`\`bash
npx wdio run wdio.conf.ts --suite smoke
npx wdio run wdio.conf.ts --suite checkout
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
# .github/workflows/wdio-tests.yml
name: WebDriverIO Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chrome, firefox]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
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

      - name: Run WebDriverIO tests
        run: npx wdio run wdio.ci.conf.ts
        env:
          BROWSER: \\\${{ matrix.browser }}

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: wdio-logs-\\\${{ matrix.browser }}
          path: |
            ./test/visual/screenshots/
            ./logs/
\`\`\`

### Docker-Based Testing

\`\`\`dockerfile
# Dockerfile.test
FROM node:20-slim

RUN apt-get update && apt-get install -y \\\\
    chromium \\\\
    fonts-liberation \\\\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ENV CHROME_BIN=/usr/bin/chromium
CMD ["npx", "wdio", "run", "wdio.docker.conf.ts"]
\`\`\`

---

## Custom Commands and Hooks

Extend WebDriverIO with custom commands for common operations specific to your application.

\`\`\`typescript
// test/helpers/commands.ts
browser.addCommand('loginAs', async (role: 'admin' | 'user') => {
  const credentials = {
    admin: { user: 'admin@test.com', pass: 'admin123' },
    user: { user: 'user@test.com', pass: 'user123' },
  };

  const { user, pass } = credentials[role];
  await browser.url('/login');
  await \$('#email').setValue(user);
  await \$('#password').setValue(pass);
  await \$('button[type="submit"]').click();
  await \$('.dashboard').waitForDisplayed();
});

// Custom element command
browser.addCommand(
  'selectByText',
  async function (this: WebdriverIO.Element, text: string) {
    const options = await this.\$\$('option');
    for (const option of options) {
      if ((await option.getText()) === text) {
        await option.click();
        return;
      }
    }
    throw new Error(\\\`Option with text "\\\${text}" not found\\\`);
  },
  true // element command
);

// Usage in tests
describe('Admin Dashboard', () => {
  it('should display admin controls', async () => {
    await browser.loginAs('admin');
    await expect(\$('[data-testid="admin-panel"]')).toBeDisplayed();
  });
});
\`\`\`

---

## Reporting and Debugging

### Allure Reporter

\`\`\`bash
npm install @wdio/allure-reporter allure-commandline --save-dev
\`\`\`

\`\`\`typescript
// wdio.conf.ts
reporters: [
  'spec',
  [
    'allure',
    {
      outputDir: 'allure-results',
      disableWebdriverStepsReporting: false,
      disableWebdriverScreenshotsReporting: false,
    },
  ],
],

// Take screenshot on failure in afterTest hook
afterTest: async function (test, context, { error }) {
  if (error) {
    await browser.takeScreenshot();
  }
},
\`\`\`

### Debugging Tips

\`\`\`typescript
// Pause execution for debugging
it('should debug this test', async () => {
  await browser.url('/complex-page');
  await browser.debug(); // Opens REPL in terminal
  // Continue testing...
});

// Use browser.execute for DOM inspection
const computedStyles = await browser.execute((selector: string) => {
  const el = document.querySelector(selector);
  return el ? window.getComputedStyle(el).display : null;
}, '.hidden-element');
\`\`\`

---

## Integrating QA Skills for WebDriverIO

Accelerate your WebDriverIO test creation with AI-powered QA skills:

\`\`\`bash
npx @qaskills/cli add webdriverio-e2e
\`\`\`

This skill configures your AI coding agent to generate WebDriverIO tests following the Page Object pattern, proper async/await usage, and robust selector strategies. It understands WebDriverIO-specific APIs and generates tests that work out of the box.

---

## 10 Best Practices for WebDriverIO Testing

1. **Use data-testid attributes** for selectors instead of CSS classes or XPath. They survive UI refactors and are explicit about their purpose.

2. **Implement the Page Object Model** with getter-based selectors. Getters provide lazy evaluation and keep element resolution close to usage.

3. **Never use hard-coded waits.** Replace \`browser.pause(5000)\` with explicit waits like \`waitForDisplayed\`, \`waitForClickable\`, or custom \`waitUntil\` conditions.

4. **Isolate test data per test.** Use API calls or database seeding in \`beforeEach\` hooks to create fresh test data. Never depend on state from a previous test.

5. **Run tests in parallel** from day one. Design tests to be independent so they can scale across multiple browser instances without conflicts.

6. **Configure retry logic for flaky tests.** Use \`specFileRetries\` in configuration for CI environments, but investigate and fix the root cause of flakiness.

7. **Capture screenshots and videos on failure.** Configure \`afterTest\` hooks to automatically save debugging artifacts when tests fail.

8. **Keep configuration DRY with config composition.** Create a base config and extend it for different environments (local, CI, visual, mobile).

9. **Version control your visual baselines.** Store baseline screenshots in the repository and update them intentionally through a review process.

10. **Use TypeScript for all test code.** Type safety catches configuration errors and API misuse at compile time rather than runtime.

---

## 8 Anti-Patterns to Avoid

1. **Chaining without await.** Every WebDriverIO command is async. Forgetting await leads to race conditions and unpredictable test behavior that is extremely difficult to debug.

2. **Using XPath for everything.** XPath selectors are fragile, hard to read, and slower than CSS selectors. Reserve XPath only for cases where CSS cannot express the query.

3. **Testing through the UI when an API call suffices.** Setting up test preconditions (login, data creation) through the UI is slow and introduces unnecessary failure points. Use API shortcuts.

4. **Sharing state between spec files.** Tests that depend on execution order or shared mutable state will fail randomly in parallel execution and are impossible to debug in isolation.

5. **Ignoring the maxInstances setting.** Running too many parallel instances can overwhelm CI resources and cause timeout failures that look like application bugs.

6. **Hardcoding environment-specific values.** Base URLs, credentials, and feature flags should come from configuration or environment variables, never hardcoded in test files.

7. **Writing overly broad assertions.** Asserting \`expect(page).toHaveTitle(/.*/)\` passes for any page. Assertions should be specific enough to catch real regressions.

8. **Skipping test cleanup.** Failing to clean up created data (users, orders, uploads) pollutes the test environment and causes cascading failures in subsequent runs.

---

## Conclusion

WebDriverIO is a powerful, flexible framework that handles web, mobile, and visual testing with a unified API. By following the patterns in this guide, using Page Objects, proper async/await, explicit waits, and robust CI/CD integration, you can build a test suite that scales with your application. Start with the basics, add mobile and visual testing as your needs grow, and leverage QA skills from qaskills.sh to accelerate your test authoring with AI coding agents.
`,
};
