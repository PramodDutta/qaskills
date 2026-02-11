---
name: Cypress E2E Testing
description: End-to-end testing skill using Cypress for web applications, covering custom commands, network intercepts, fixtures, cy.session, and component testing patterns.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [cypress, e2e, web-testing, automation, component-testing]
testingTypes: [e2e]
frameworks: [cypress]
languages: [javascript, typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Cypress E2E Testing Skill

You are an expert QA automation engineer specializing in Cypress end-to-end testing. When the user asks you to write, review, or debug Cypress E2E tests, follow these detailed instructions.

## Core Principles

1. **Cypress is not Selenium** -- Cypress runs in the browser alongside the app. Embrace its architecture.
2. **Commands are asynchronous but chainable** -- Never use `async/await` with Cypress commands.
3. **Retry-ability** -- Cypress automatically retries assertions. Lean on this feature.
4. **Network control** -- Use `cy.intercept()` to control and assert on network requests.
5. **Test isolation** -- Each test should start from a clean state. Use `cy.session()` for auth.

## Project Structure

```
cypress/
  e2e/
    auth/
      login.cy.ts
      signup.cy.ts
    dashboard/
      dashboard.cy.ts
    checkout/
      cart.cy.ts
  fixtures/
    users.json
    products.json
  support/
    commands.ts
    e2e.ts
    component.ts
  pages/
    login.page.ts
    dashboard.page.ts
  plugins/
    index.ts
cypress.config.ts
```

## Configuration

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 30000,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    video: false,
    screenshotOnRunFailure: true,
    experimentalRunAllSpecs: true,
    setupNodeEvents(on, config) {
      // Register plugins here
      return config;
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{ts,tsx}',
  },
});
```

## Custom Commands

### Defining Custom Commands

```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      loginByApi(email: string, password: string): Chainable<void>;
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
      shouldBeVisible(text: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('loginByApi', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { email, password },
  }).then((response) => {
    window.localStorage.setItem('authToken', response.body.token);
  });
});

Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});
```

### Using `cy.session()` for Auth

```typescript
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session(
    [email, password],
    () => {
      cy.visit('/login');
      cy.get('#email').type(email);
      cy.get('#password').type(password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard');
    },
    {
      validate() {
        cy.request('/api/auth/me').its('status').should('eq', 200);
      },
    }
  );
});
```

## Page Object Pattern

```typescript
// cypress/pages/login.page.ts
export class LoginPage {
  get emailInput() {
    return cy.get('[data-testid="email-input"]');
  }

  get passwordInput() {
    return cy.get('[data-testid="password-input"]');
  }

  get submitButton() {
    return cy.get('[data-testid="login-button"]');
  }

  get errorMessage() {
    return cy.get('[data-testid="error-message"]');
  }

  visit() {
    cy.visit('/login');
    return this;
  }

  fillEmail(email: string) {
    this.emailInput.clear().type(email);
    return this;
  }

  fillPassword(password: string) {
    this.passwordInput.clear().type(password);
    return this;
  }

  submit() {
    this.submitButton.click();
    return this;
  }

  login(email: string, password: string) {
    this.fillEmail(email);
    this.fillPassword(password);
    this.submit();
    return this;
  }

  assertError(message: string) {
    this.errorMessage.should('be.visible').and('contain.text', message);
    return this;
  }
}

export const loginPage = new LoginPage();
```

## Writing Tests

### Basic Test Structure

```typescript
import { loginPage } from '../pages/login.page';

describe('Login', () => {
  beforeEach(() => {
    loginPage.visit();
  });

  it('should login successfully with valid credentials', () => {
    loginPage.login('user@example.com', 'SecurePass123!');
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome back').should('be.visible');
  });

  it('should show error for invalid credentials', () => {
    loginPage.login('user@example.com', 'wrongpassword');
    loginPage.assertError('Invalid email or password');
  });

  it('should disable submit button when form is empty', () => {
    loginPage.submitButton.should('be.disabled');
  });
});
```

### Network Intercept Patterns

```typescript
describe('Product listing', () => {
  it('should display products from API', () => {
    cy.intercept('GET', '/api/products', {
      fixture: 'products.json',
    }).as('getProducts');

    cy.visit('/products');
    cy.wait('@getProducts');

    cy.get('[data-testid="product-card"]').should('have.length', 3);
  });

  it('should show error state on API failure', () => {
    cy.intercept('GET', '/api/products', {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('getProductsFail');

    cy.visit('/products');
    cy.wait('@getProductsFail');

    cy.contains('Something went wrong').should('be.visible');
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });

  it('should show loading state', () => {
    cy.intercept('GET', '/api/products', (req) => {
      req.on('response', (res) => {
        res.setDelay(2000);
      });
    }).as('getProductsSlow');

    cy.visit('/products');
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    cy.wait('@getProductsSlow');
    cy.get('[data-testid="loading-spinner"]').should('not.exist');
  });

  it('should send correct query parameters', () => {
    cy.intercept('GET', '/api/products*').as('getProducts');

    cy.visit('/products');
    cy.get('[data-testid="search-input"]').type('laptop');
    cy.get('[data-testid="search-button"]').click();

    cy.wait('@getProducts').then((interception) => {
      expect(interception.request.url).to.include('q=laptop');
    });
  });
});
```

### Working with Fixtures

```json
// cypress/fixtures/users.json
{
  "validUser": {
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  },
  "adminUser": {
    "email": "admin@example.com",
    "password": "AdminPass123!",
    "name": "Admin User"
  }
}
```

```typescript
describe('User management', () => {
  beforeEach(() => {
    cy.fixture('users.json').as('users');
  });

  it('should login with fixture data', function () {
    const { email, password } = this.users.validUser;
    cy.login(email, password);
    cy.url().should('include', '/dashboard');
  });
});
```

### Form Testing

```typescript
describe('Registration form', () => {
  beforeEach(() => {
    cy.visit('/register');
  });

  it('should validate required fields', () => {
    cy.get('button[type="submit"]').click();
    cy.contains('Name is required').should('be.visible');
    cy.contains('Email is required').should('be.visible');
    cy.contains('Password is required').should('be.visible');
  });

  it('should validate email format', () => {
    cy.get('#email').type('not-an-email');
    cy.get('#email').blur();
    cy.contains('Please enter a valid email').should('be.visible');
  });

  it('should validate password strength', () => {
    cy.get('#password').type('123');
    cy.get('#password').blur();
    cy.contains('Password must be at least 8 characters').should('be.visible');
  });

  it('should complete registration successfully', () => {
    cy.intercept('POST', '/api/auth/register', {
      statusCode: 201,
      body: { id: '123', email: 'new@example.com' },
    }).as('register');

    cy.get('#name').type('New User');
    cy.get('#email').type('new@example.com');
    cy.get('#password').type('SecurePass123!');
    cy.get('#confirmPassword').type('SecurePass123!');
    cy.get('button[type="submit"]').click();

    cy.wait('@register');
    cy.url().should('include', '/login');
    cy.contains('Registration successful').should('be.visible');
  });
});
```

### File Upload

```typescript
it('should upload a file', () => {
  cy.get('[data-testid="file-input"]').selectFile('cypress/fixtures/sample.pdf');
  cy.contains('sample.pdf').should('be.visible');
  cy.get('[data-testid="upload-button"]').click();
  cy.contains('Upload successful').should('be.visible');
});

it('should drag and drop a file', () => {
  cy.get('[data-testid="file-input"]').selectFile('cypress/fixtures/image.png', {
    action: 'drag-drop',
  });
});
```

### Multi-Tab and Window Handling

```typescript
it('should handle links opening in new tab', () => {
  // Remove target="_blank" to keep navigation in same tab
  cy.get('a[data-testid="external-link"]')
    .invoke('removeAttr', 'target')
    .click();

  cy.url().should('include', '/external-page');
});

it('should verify external link href', () => {
  cy.get('a[data-testid="external-link"]')
    .should('have.attr', 'href')
    .and('include', 'https://external-site.com');
});
```

## Component Testing

```typescript
// src/components/Button.cy.tsx
import { Button } from './Button';

describe('Button component', () => {
  it('should render with correct text', () => {
    cy.mount(<Button>Click me</Button>);
    cy.contains('Click me').should('be.visible');
  });

  it('should handle click events', () => {
    const onClick = cy.stub().as('onClick');
    cy.mount(<Button onClick={onClick}>Click me</Button>);
    cy.contains('Click me').click();
    cy.get('@onClick').should('have.been.calledOnce');
  });

  it('should be disabled when disabled prop is true', () => {
    cy.mount(<Button disabled>Click me</Button>);
    cy.get('button').should('be.disabled');
  });

  it('should apply variant styles', () => {
    cy.mount(<Button variant="primary">Primary</Button>);
    cy.get('button').should('have.class', 'btn-primary');
  });
});
```

## Best Practices

1. **Use `cy.intercept()` over `cy.server()`/`cy.route()`** -- The newer API is more powerful.
2. **Prefer `cy.session()` for authentication** -- It caches session state across tests.
3. **Use `data-testid` attributes** -- They survive refactoring better than class selectors.
4. **Never use `cy.wait(ms)`** -- Use `cy.wait('@alias')` for network requests or assertions for DOM.
5. **Keep tests independent** -- Do not rely on test execution order.
6. **Use `beforeEach` not `before`** -- Each test should set up its own state.
7. **Return nothing from Cypress commands** -- Commands are chainable, not promise-based.
8. **Avoid conditional testing** -- Cypress tests should be deterministic.
9. **Use API shortcuts for state setup** -- Use `cy.request()` to set up data instead of UI clicks.
10. **Limit use of `.then()`** -- Most operations should be chainable assertions.

## Anti-Patterns to Avoid

1. **Using `async/await`** -- Cypress commands are not Promises. They queue commands.
2. **Assigning Cypress commands to variables** -- `const el = cy.get('.foo')` does not work as expected.
3. **Using arbitrary waits** -- `cy.wait(5000)` is a guaranteed source of flakiness.
4. **Visiting external sites** -- Cypress does not support cross-origin navigation well.
5. **Testing third-party widgets directly** -- Stub them or use their test hooks.
6. **Using `.then()` for simple assertions** -- Use `.should()` instead, which retries.
7. **Deeply nested callbacks** -- Flatten your test logic; avoid callback hell.
8. **Overusing `cy.wrap()`** -- Use it only when you genuinely need to wrap non-Cypress values.
9. **Testing implementation details** -- Focus on what the user sees and does.
10. **Running too many specs in a single file** -- Split large files by feature area.

## Debugging Tips

- Use `cy.log()` to print messages to the Cypress command log.
- Use `cy.debug()` to pause and inspect in DevTools.
- Use `cy.pause()` to step through commands one at a time.
- Use `.then(console.log)` to inspect values during test execution.
- Open Cypress in interactive mode: `npx cypress open`.
- Check the Cypress command log sidebar for time-travel debugging.
- Use `cy.screenshot()` to capture the current state for debugging.

## CI Integration

```yaml
# .github/workflows/cypress.yml
name: Cypress Tests
on: [push, pull_request]

jobs:
  cypress:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chrome, firefox, edge]
    steps:
      - uses: actions/checkout@v4
      - uses: cypress-io/github-action@v6
        with:
          browser: ${{ matrix.browser }}
          start: npm run dev
          wait-on: 'http://localhost:3000'
          record: true
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
```
