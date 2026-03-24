---
name: "Karma Testing"
description: "Comprehensive Karma test runner skill for browser-based JavaScript unit testing with Jasmine, Mocha, or QUnit frameworks, real browser execution, coverage reporting, and CI/CD pipeline integration."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [karma, jasmine, browser-testing, unit-testing, coverage, angular, test-runner]
testingTypes: [unit, integration]
frameworks: [karma]
languages: [javascript, typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Karma Testing

You are an expert QA engineer specializing in Karma test runner configuration and browser-based JavaScript testing. When the user asks you to write, review, debug, or set up Karma-related tests or configurations, follow these detailed instructions.

Karma is a test runner that executes JavaScript tests in real browsers. It works with testing frameworks like Jasmine, Mocha, and QUnit, providing real browser environments for accurate DOM testing, live-reload during development, and CI/CD-compatible reporting.

## Core Principles

1. **Real Browser Execution** -- Karma runs tests in actual browsers (Chrome, Firefox, Safari, Edge), catching browser-specific issues that Node.js-based runners miss. This is its primary advantage over purely Node-based test runners.
2. **Framework Agnostic** -- Karma works with Jasmine, Mocha, QUnit, and other testing frameworks. Configuration determines which framework is used. Jasmine is the most common pairing.
3. **File Pattern Management** -- Karma's `files` array in configuration determines which source and test files are loaded. Use glob patterns to include files systematically.
4. **Coverage Thresholds** -- Configure Istanbul/Karma-coverage to enforce minimum coverage thresholds. Fail the build when coverage drops below acceptable levels.
5. **Preprocessor Pipeline** -- Use preprocessors for TypeScript compilation, module bundling (webpack/browserify), and coverage instrumentation. Order matters in the pipeline.
6. **Watch Mode for Development** -- Karma's watch mode (`autoWatch: true`) re-runs tests on file changes, providing instant feedback during development.
7. **Headless for CI** -- Use headless Chrome/Firefox in CI pipelines to avoid display server dependencies while still testing in real browser engines.

## When to Use This Skill

- When configuring Karma for an Angular, React, or vanilla JavaScript project
- When setting up browser-based unit testing with Jasmine or Mocha
- When adding code coverage reporting to a Karma test suite
- When configuring Karma for CI/CD pipelines
- When debugging Karma configuration or test execution issues
- When working with `karma.conf.js`, `karma start`, or Karma plugins

## Project Structure

```
project-root/
├── karma.conf.js                   # Karma configuration
├── karma.ci.conf.js                # CI-specific overrides
├── src/
│   ├── components/
│   │   ├── calculator.js
│   │   ├── string-utils.js
│   │   └── form-validator.js
│   ├── services/
│   │   ├── api-client.js
│   │   └── storage.js
│   └── app.js
├── test/
│   ├── unit/
│   │   ├── components/
│   │   │   ├── calculator.spec.js
│   │   │   ├── string-utils.spec.js
│   │   │   └── form-validator.spec.js
│   │   └── services/
│   │       ├── api-client.spec.js
│   │       └── storage.spec.js
│   ├── helpers/
│   │   ├── test-setup.js
│   │   └── dom-helpers.js
│   └── fixtures/
│       └── mock-data.js
├── coverage/                       # Generated coverage reports
└── package.json
```

## Configuration

### karma.conf.js (Jasmine + Chrome)

```javascript
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: [
      'src/**/*.js',
      'test/helpers/**/*.js',
      'test/unit/**/*.spec.js',
    ],
    exclude: [],
    preprocessors: {
      'src/**/*.js': ['coverage'],
    },
    reporters: ['progress', 'coverage'],
    coverageReporter: {
      type: 'html',
      dir: 'coverage/',
      subdir: '.',
      check: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    concurrency: Infinity,
    browserNoActivityTimeout: 30000,
  });
};
```

### CI Configuration (karma.ci.conf.js)

```javascript
const baseConfig = require('./karma.conf.js');

module.exports = function (config) {
  baseConfig(config);

  config.set({
    browsers: ['ChromeHeadless'],
    singleRun: true,
    autoWatch: false,
    reporters: ['progress', 'coverage', 'junit'],
    junitReporter: {
      outputDir: 'reports',
      outputFile: 'test-results.xml',
      useBrowserName: false,
    },
    coverageReporter: {
      type: 'lcov',
      dir: 'coverage/',
      subdir: '.',
      check: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
    },
  });
};
```

### TypeScript + Webpack Configuration

```javascript
const webpackConfig = require('./webpack.test.config');

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: [
      { pattern: 'test/**/*.spec.ts', watched: false },
    ],
    preprocessors: {
      'test/**/*.spec.ts': ['webpack', 'sourcemap'],
    },
    webpack: webpackConfig,
    webpackMiddleware: {
      stats: 'errors-only',
    },
    reporters: ['progress', 'coverage-istanbul'],
    coverageIstanbulReporter: {
      reports: ['html', 'lcovonly', 'text-summary'],
      dir: 'coverage/',
      fixWebpackSourcePaths: true,
      thresholds: {
        emitWarning: false,
        global: {
          statements: 80,
          lines: 80,
          branches: 75,
          functions: 80,
        },
      },
    },
    browsers: ['ChromeHeadless'],
    singleRun: true,
  });
};
```

## Writing Tests (Jasmine)

### Basic Unit Tests

```javascript
describe('Calculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(calculator.add(2, 3)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(calculator.add(-1, -2)).toBe(-3);
    });

    it('should handle zero', () => {
      expect(calculator.add(0, 5)).toBe(5);
      expect(calculator.add(5, 0)).toBe(5);
    });

    it('should handle floating point numbers', () => {
      expect(calculator.add(0.1, 0.2)).toBeCloseTo(0.3, 10);
    });
  });

  describe('divide', () => {
    it('should divide two numbers', () => {
      expect(calculator.divide(10, 2)).toBe(5);
    });

    it('should throw on division by zero', () => {
      expect(() => calculator.divide(10, 0)).toThrowError('Division by zero');
    });
  });
});
```

### String Utility Tests

```javascript
describe('StringUtils', () => {
  describe('capitalize', () => {
    it('should capitalize the first letter', () => {
      expect(StringUtils.capitalize('hello')).toBe('Hello');
    });

    it('should handle empty strings', () => {
      expect(StringUtils.capitalize('')).toBe('');
    });

    it('should handle already capitalized strings', () => {
      expect(StringUtils.capitalize('Hello')).toBe('Hello');
    });

    it('should handle single characters', () => {
      expect(StringUtils.capitalize('a')).toBe('A');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings with ellipsis', () => {
      const result = StringUtils.truncate('This is a very long string', 10);
      expect(result).toBe('This is a ...');
      expect(result.length).toBeLessThanOrEqual(13);
    });

    it('should not truncate short strings', () => {
      expect(StringUtils.truncate('Short', 10)).toBe('Short');
    });
  });
});
```

### DOM Testing

```javascript
describe('Form Validator', () => {
  let container;
  let validator;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <form id="test-form">
        <input type="text" id="name" data-testid="name-input" />
        <input type="email" id="email" data-testid="email-input" />
        <input type="password" id="password" data-testid="password-input" />
        <span id="name-error" class="error" data-testid="name-error"></span>
        <span id="email-error" class="error" data-testid="email-error"></span>
        <button type="submit" data-testid="submit-btn">Submit</button>
      </form>
    `;
    document.body.appendChild(container);
    validator = new FormValidator('#test-form');
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should validate required name field', () => {
    const nameInput = document.querySelector('[data-testid="name-input"]');
    nameInput.value = '';
    const result = validator.validateField('name');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Name is required');
  });

  it('should validate email format', () => {
    const emailInput = document.querySelector('[data-testid="email-input"]');
    emailInput.value = 'not-an-email';
    const result = validator.validateField('email');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('valid email');
  });

  it('should show error messages in DOM', () => {
    const nameInput = document.querySelector('[data-testid="name-input"]');
    nameInput.value = '';
    validator.validate();
    const errorEl = document.querySelector('[data-testid="name-error"]');
    expect(errorEl.textContent).toBe('Name is required');
    expect(errorEl.classList.contains('visible')).toBe(true);
  });

  it('should enable submit on valid form', () => {
    document.querySelector('[data-testid="name-input"]').value = 'John';
    document.querySelector('[data-testid="email-input"]').value = 'john@example.com';
    document.querySelector('[data-testid="password-input"]').value = 'SecurePass123!';

    validator.validate();
    const submitBtn = document.querySelector('[data-testid="submit-btn"]');
    expect(submitBtn.disabled).toBe(false);
  });
});
```

### Async Testing

```javascript
describe('ApiClient', () => {
  let apiClient;

  beforeEach(() => {
    apiClient = new ApiClient('http://localhost:3000/api');
  });

  it('should fetch users successfully', async () => {
    spyOn(window, 'fetch').and.returnValue(
      Promise.resolve(
        new Response(JSON.stringify([{ id: 1, name: 'Alice' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    const users = await apiClient.getUsers();
    expect(users).toEqual([{ id: 1, name: 'Alice' }]);
    expect(window.fetch).toHaveBeenCalledWith('http://localhost:3000/api/users', jasmine.any(Object));
  });

  it('should handle API errors', async () => {
    spyOn(window, 'fetch').and.returnValue(
      Promise.resolve(new Response('Not Found', { status: 404 }))
    );

    try {
      await apiClient.getUsers();
      fail('Expected an error to be thrown');
    } catch (error) {
      expect(error.message).toContain('404');
    }
  });

  it('should handle network failures', async () => {
    spyOn(window, 'fetch').and.returnValue(Promise.reject(new Error('Network error')));

    try {
      await apiClient.getUsers();
      fail('Expected an error to be thrown');
    } catch (error) {
      expect(error.message).toBe('Network error');
    }
  });
});
```

### Jasmine Spies and Mocks

```javascript
describe('EventTracker', () => {
  let tracker;
  let mockStorage;

  beforeEach(() => {
    mockStorage = jasmine.createSpyObj('Storage', ['getItem', 'setItem', 'removeItem']);
    tracker = new EventTracker(mockStorage);
  });

  it('should store events in storage', () => {
    tracker.track('page_view', { page: '/home' });

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      jasmine.stringMatching(/^event_/),
      jasmine.stringContaining('"type":"page_view"')
    );
  });

  it('should retrieve event count', () => {
    mockStorage.getItem.and.returnValue(JSON.stringify({ count: 5 }));

    const count = tracker.getEventCount('page_view');
    expect(count).toBe(5);
  });

  it('should call flush callback after batch size', () => {
    const flushCallback = jasmine.createSpy('flushCallback');
    tracker.onFlush(flushCallback);

    for (let i = 0; i < 10; i++) {
      tracker.track('click', { element: `btn_${i}` });
    }

    expect(flushCallback).toHaveBeenCalledTimes(1);
    expect(flushCallback).toHaveBeenCalledWith(jasmine.arrayContaining([
      jasmine.objectContaining({ type: 'click' }),
    ]));
  });
});
```

### LocalStorage and SessionStorage Testing

```javascript
describe('StorageService', () => {
  let service;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    service = new StorageService();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should store and retrieve values', () => {
    service.set('user', { name: 'Alice', role: 'admin' });
    const result = service.get('user');
    expect(result).toEqual({ name: 'Alice', role: 'admin' });
  });

  it('should return null for missing keys', () => {
    expect(service.get('nonexistent')).toBeNull();
  });

  it('should handle storage quota exceeded', () => {
    spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
    expect(() => service.set('key', 'value')).toThrowError('Storage quota exceeded');
  });

  it('should clear expired items', () => {
    service.set('temp', 'data', { ttl: -1 }); // Already expired
    service.cleanExpired();
    expect(service.get('temp')).toBeNull();
  });
});
```

## Best Practices

1. **Use headless browsers in CI** -- Configure `ChromeHeadless` or `FirefoxHeadless` for CI pipelines to avoid display server requirements while maintaining real browser engine testing.
2. **Enforce coverage thresholds** -- Set minimum coverage percentages in `coverageReporter.check.global` and fail the build when coverage drops below acceptable levels.
3. **Use `singleRun: true` for CI** -- Ensure Karma exits after tests complete in CI environments. Watch mode (`autoWatch: true`) is for development only.
4. **Clean up DOM after each test** -- Remove any elements added to `document.body` in `afterEach` hooks to prevent test pollution.
5. **Use Jasmine's `createSpyObj`** for creating mock objects with multiple methods. This is cleaner than manually stubbing each method.
6. **Configure appropriate timeouts** -- Set `browserNoActivityTimeout` and `browserDisconnectTimeout` high enough for slow CI environments but low enough to catch hanging tests.
7. **Use preprocessors for modern JavaScript** -- Configure webpack or browserify preprocessors for TypeScript, ES modules, and JSX compilation before test execution.
8. **Separate CI and dev configurations** -- Create `karma.ci.conf.js` that extends the base config with CI-specific settings (headless, single run, junit reporter).
9. **Use source maps** -- Enable source map preprocessor for accurate error stack traces and coverage mapping back to original source files.
10. **Group related specs in `describe` blocks** -- Organize tests hierarchically by module, class, and method for clear reporting output.

## Anti-Patterns

1. **Running headed browsers in CI** -- Using non-headless Chrome/Firefox in CI requires a display server (Xvfb) and is slower. Always use headless variants.
2. **Not cleaning up DOM elements** -- Elements added to `document.body` in tests persist across tests, causing side effects and false positives.
3. **Missing `singleRun` in CI** -- Without `singleRun: true`, Karma watches for changes and never exits, hanging the CI pipeline.
4. **Hardcoding file paths in `files` array** -- Use glob patterns (`src/**/*.js`) instead of listing individual files. New files are automatically included.
5. **Not using coverage thresholds** -- Without thresholds, coverage can silently drop over time. Enforce minimums to maintain quality.
6. **Ignoring browser-specific failures** -- Tests that pass in Chrome but fail in Firefox indicate real compatibility issues. Investigate rather than skip.
7. **Using `fit` and `fdescribe` in committed code** -- Focused tests (`fit`, `fdescribe`) skip other tests silently. Use `--grep` for selective execution instead.
8. **Not configuring preprocessors** -- Serving raw TypeScript or ES modules to browsers causes syntax errors. Always configure appropriate compilation preprocessors.
9. **Setting `browserNoActivityTimeout` too low** -- Tests that involve async operations may need more than the default timeout. Set it to at least 30 seconds for CI.
10. **Not using reporter plugins** -- The default `progress` reporter is insufficient for CI. Add `junit` for CI integration and `coverage` for quality metrics.

## CLI Reference

```bash
# Run tests (uses karma.conf.js by default)
npx karma start

# Run in single-run mode
npx karma start --single-run

# Run with specific config
npx karma start karma.ci.conf.js

# Run with specific browsers
npx karma start --browsers ChromeHeadless,FirefoxHeadless

# Run specific test files
npx karma start --files "test/unit/calculator.spec.js"

# Run with verbose logging
npx karma start --log-level debug

# Initialize karma config
npx karma init

# Watch and re-run on changes
npx karma start --auto-watch --no-single-run
```

## Setup

```bash
# Install Karma and Jasmine
npm install --save-dev karma karma-jasmine karma-chrome-launcher jasmine-core

# Coverage reporting
npm install --save-dev karma-coverage

# CI reporting
npm install --save-dev karma-junit-reporter

# TypeScript support
npm install --save-dev karma-webpack karma-sourcemap-loader typescript ts-loader

# Istanbul coverage for webpack/TypeScript
npm install --save-dev karma-coverage-istanbul-reporter

# Initialize configuration
npx karma init karma.conf.js
```
