import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Tutorial for Beginners: Complete Guide to E2E Testing in 2026',
  description:
    'Master Cypress end-to-end testing from scratch. Covers installation, selectors, assertions, custom commands, network intercepts, fixtures, POM pattern, component testing, and CI/CD with TypeScript examples.',
  date: '2026-05-18',
  category: 'Tutorial',
  content: `
Cypress has earned its place as one of the most popular end-to-end testing frameworks in the JavaScript ecosystem. Its developer-friendly API, automatic waiting, real-time reloading, and time-travel debugging make it an excellent choice for teams that want fast, reliable browser tests. This tutorial takes you from zero to production-ready Cypress tests in 2026, with TypeScript examples throughout.

## Key Takeaways

- Cypress runs directly in the browser, giving you access to everything happening in your application in real time
- TypeScript support in Cypress is first-class and eliminates entire categories of test bugs
- Custom commands and the Page Object Model pattern keep large test suites maintainable
- Network interception with \`cy.intercept()\` enables deterministic testing without backend dependencies
- Component testing in Cypress lets you test UI components in isolation with the same API you use for E2E tests
- CI/CD integration with GitHub Actions, GitLab CI, and other platforms is straightforward with the official Docker images

---

## Why Cypress for E2E Testing in 2026

The end-to-end testing landscape has matured significantly over the past few years. While Playwright has gained momentum, Cypress remains a top choice for frontend-heavy teams and organizations already invested in the JavaScript ecosystem. Here is why Cypress continues to be relevant in 2026.

**Developer experience**: Cypress was designed from the ground up for developers. The test runner gives you a visual interface showing exactly what your tests are doing, with time-travel snapshots for every command. When a test fails, you can step back through each action and see the DOM state at that point.

**Automatic waiting**: Cypress automatically waits for elements to appear, animations to complete, and network requests to finish. You almost never need to write explicit waits or sleep statements, which eliminates a massive category of flaky tests.

**Network control**: The \`cy.intercept()\` API gives you complete control over network requests. You can stub API responses, wait for specific requests, and assert on request payloads -- all without modifying your application code.

**Real browser testing**: Cypress tests run inside a real browser (Chromium, Firefox, or WebKit via experimental support). This means your tests interact with the same rendering engine your users see.

If you are working with AI coding agents, installing a Cypress-specific QA skill can dramatically improve the quality of generated tests:

\`\`\`bash
npx @qaskills/cli add cypress-e2e-testing
\`\`\`

Browse all available testing skills at [qaskills.sh/skills](/skills).

---

## Installing Cypress with TypeScript

Let us start by setting up a new Cypress project with TypeScript from scratch. We will use a modern project structure that scales well.

### Step 1: Initialize the Project

\`\`\`bash
mkdir my-cypress-project
cd my-cypress-project
npm init -y
npm install --save-dev cypress typescript @types/node
\`\`\`

### Step 2: Initialize TypeScript

Create a \`tsconfig.json\` at the project root:

\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["cypress", "node"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["cypress/**/*.ts", "cypress.config.ts"],
  "exclude": ["node_modules"]
}
\`\`\`

### Step 3: Open Cypress for the First Time

\`\`\`bash
npx cypress open
\`\`\`

This launches the Cypress Launchpad, which helps you configure the project. Select "E2E Testing" and choose your preferred browser. Cypress will create the default folder structure:

\`\`\`
cypress/
  e2e/          # Your test files go here
  fixtures/     # Static test data (JSON files)
  support/
    commands.ts # Custom commands
    e2e.ts      # Support file loaded before every test
cypress.config.ts  # Main configuration
\`\`\`

### Step 4: Configure Cypress

Create or update \`cypress.config.ts\`:

\`\`\`typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    video: true,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      // Register plugins here
      return config;
    },
  },
});
\`\`\`

The \`retries\` configuration is especially important for CI environments. Setting \`runMode: 2\` means failing tests will be retried up to 2 times when running in headless mode, which helps catch intermittent failures without marking the build as broken.

---

## Writing Your First Cypress Test

Let us write a test for a simple todo application. Create \`cypress/e2e/todo.cy.ts\`:

\`\`\`typescript
describe('Todo Application', () => {
  beforeEach(() => {
    cy.visit('/todos');
  });

  it('should display the todo input field', () => {
    cy.get('[data-testid="todo-input"]').should('be.visible');
  });

  it('should add a new todo item', () => {
    const todoText = 'Buy groceries';

    cy.get('[data-testid="todo-input"]').type(todoText);
    cy.get('[data-testid="add-todo-btn"]').click();

    cy.get('[data-testid="todo-list"]')
      .should('contain.text', todoText);
  });

  it('should mark a todo as completed', () => {
    // Add a todo first
    cy.get('[data-testid="todo-input"]').type('Read a book');
    cy.get('[data-testid="add-todo-btn"]').click();

    // Mark it as done
    cy.get('[data-testid="todo-item"]')
      .first()
      .find('[data-testid="toggle-complete"]')
      .click();

    cy.get('[data-testid="todo-item"]')
      .first()
      .should('have.class', 'completed');
  });

  it('should delete a todo item', () => {
    cy.get('[data-testid="todo-input"]').type('Temporary task');
    cy.get('[data-testid="add-todo-btn"]').click();

    cy.get('[data-testid="todo-item"]').should('have.length.gte', 1);

    cy.get('[data-testid="todo-item"]')
      .first()
      .find('[data-testid="delete-btn"]')
      .click();

    cy.get('[data-testid="todo-item"]').should('have.length', 0);
  });

  it('should filter todos by status', () => {
    // Add multiple todos
    cy.get('[data-testid="todo-input"]').type('Task 1');
    cy.get('[data-testid="add-todo-btn"]').click();
    cy.get('[data-testid="todo-input"]').type('Task 2');
    cy.get('[data-testid="add-todo-btn"]').click();

    // Complete the first one
    cy.get('[data-testid="todo-item"]')
      .first()
      .find('[data-testid="toggle-complete"]')
      .click();

    // Filter to active
    cy.get('[data-testid="filter-active"]').click();
    cy.get('[data-testid="todo-item"]').should('have.length', 1);
    cy.get('[data-testid="todo-item"]').should('contain.text', 'Task 2');

    // Filter to completed
    cy.get('[data-testid="filter-completed"]').click();
    cy.get('[data-testid="todo-item"]').should('have.length', 1);
    cy.get('[data-testid="todo-item"]').should('contain.text', 'Task 1');
  });
});
\`\`\`

Run the test:

\`\`\`bash
# Interactive mode (opens the Cypress runner)
npx cypress open

# Headless mode (for CI)
npx cypress run --spec cypress/e2e/todo.cy.ts
\`\`\`

---

## Selectors and Locator Strategies

Choosing the right selectors is the single most important decision for test reliability. Fragile selectors are the number one cause of flaky tests. Here is a hierarchy of selector strategies, from best to worst.

### Best: data-testid Attributes

\`\`\`typescript
// Recommended: resilient to style and structure changes
cy.get('[data-testid="submit-button"]').click();
cy.get('[data-testid="user-email"]').should('have.text', 'user@example.com');
\`\`\`

These attributes exist solely for testing and will not break when developers change CSS classes or restructure the DOM.

### Good: Accessible Selectors

\`\`\`typescript
// Uses ARIA roles and labels -- also validates accessibility
cy.get('button').contains('Submit').click();
cy.get('[role="dialog"]').should('be.visible');
cy.get('[aria-label="Close modal"]').click();
cy.get('input[name="email"]').type('user@example.com');
\`\`\`

### Avoid: CSS Classes and Complex Selectors

\`\`\`typescript
// Fragile: breaks when styles change
cy.get('.btn-primary.submit-form').click();

// Very fragile: breaks when DOM structure changes
cy.get('div > form > div:nth-child(3) > button').click();
\`\`\`

### Cypress Testing Library

For teams that prefer accessibility-first selectors, install \`@testing-library/cypress\`:

\`\`\`bash
npm install --save-dev @testing-library/cypress
\`\`\`

Add it to \`cypress/support/e2e.ts\`:

\`\`\`typescript
import '@testing-library/cypress/add-commands';
\`\`\`

Now you can use Testing Library queries:

\`\`\`typescript
cy.findByRole('button', { name: /submit/i }).click();
cy.findByLabelText('Email address').type('user@example.com');
cy.findByText('Welcome back').should('be.visible');
\`\`\`

---

## Assertions in Depth

Cypress uses Chai assertions with its own extensions. Understanding the assertion library well makes your tests more expressive and your error messages more helpful.

### Element Assertions

\`\`\`typescript
// Visibility
cy.get('[data-testid="modal"]').should('be.visible');
cy.get('[data-testid="modal"]').should('not.exist');

// Content
cy.get('[data-testid="heading"]').should('have.text', 'Welcome');
cy.get('[data-testid="heading"]').should('contain.text', 'Welcome');
cy.get('[data-testid="paragraph"]').should('not.be.empty');

// Attributes
cy.get('input').should('have.attr', 'placeholder', 'Enter email');
cy.get('button').should('be.disabled');
cy.get('input[type="checkbox"]').should('be.checked');

// CSS
cy.get('[data-testid="error"]').should('have.css', 'color', 'rgb(255, 0, 0)');
cy.get('[data-testid="card"]').should('have.class', 'active');

// Count
cy.get('[data-testid="list-item"]').should('have.length', 5);
cy.get('[data-testid="list-item"]').should('have.length.gte', 3);
\`\`\`

### Chained Assertions

\`\`\`typescript
cy.get('[data-testid="user-card"]')
  .should('be.visible')
  .and('contain.text', 'John Doe')
  .and('have.class', 'premium-user');
\`\`\`

### Custom Should Callback

For complex assertions, use a callback:

\`\`\`typescript
cy.get('[data-testid="price"]').should((\$el) => {
  const price = parseFloat(\$el.text().replace('\\\$', ''));
  expect(price).to.be.greaterThan(0);
  expect(price).to.be.lessThan(1000);
});
\`\`\`

---

## Custom Commands

Custom commands are the backbone of a maintainable Cypress test suite. They encapsulate reusable logic and make tests read like natural language.

### Defining Custom Commands

In \`cypress/support/commands.ts\`:

\`\`\`typescript
// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-btn"]').click();
    cy.url().should('include', '/dashboard');
  });
});

// API login (faster for tests that don't need to test the login UI)
Cypress.Commands.add('loginViaApi', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { email, password },
  }).then((response) => {
    window.localStorage.setItem('authToken', response.body.token);
  });
});

// Drag and drop
Cypress.Commands.add(
  'dragAndDrop',
  (sourceSelector: string, targetSelector: string) => {
    cy.get(sourceSelector).trigger('dragstart');
    cy.get(targetSelector).trigger('drop');
    cy.get(sourceSelector).trigger('dragend');
  }
);

// Wait for API response
Cypress.Commands.add('waitForApi', (alias: string, timeout = 10000) => {
  cy.wait(alias, { timeout }).its('response.statusCode').should('eq', 200);
});
\`\`\`

### TypeScript Declarations

Add type declarations in \`cypress/support/index.d.ts\`:

\`\`\`typescript
declare namespace Cypress {
  interface Chainable {
    login(email: string, password: string): Chainable<void>;
    loginViaApi(email: string, password: string): Chainable<void>;
    dragAndDrop(source: string, target: string): Chainable<void>;
    waitForApi(alias: string, timeout?: number): Chainable<void>;
  }
}
\`\`\`

### Using Custom Commands

\`\`\`typescript
describe('Dashboard', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'password123');
    cy.visit('/dashboard');
  });

  it('should display user stats', () => {
    cy.get('[data-testid="stats-panel"]').should('be.visible');
    cy.get('[data-testid="total-users"]').should('not.be.empty');
  });
});
\`\`\`

The \`cy.session()\` call inside the login command is critical for performance. It caches the session state so subsequent tests that use the same credentials do not repeat the full login flow. This can cut test suite execution time by 50% or more for suites that require authentication.

---

## Network Interception with cy.intercept()

Network interception is one of Cypress's most powerful features. It lets you control the network layer completely, enabling deterministic tests that do not depend on backend availability or data state.

### Stubbing API Responses

\`\`\`typescript
describe('Product List', () => {
  it('should display products from API', () => {
    cy.intercept('GET', '/api/products', {
      statusCode: 200,
      body: [
        { id: 1, name: 'Widget A', price: 29.99 },
        { id: 2, name: 'Widget B', price: 49.99 },
      ],
    }).as('getProducts');

    cy.visit('/products');
    cy.wait('@getProducts');

    cy.get('[data-testid="product-card"]').should('have.length', 2);
    cy.get('[data-testid="product-card"]')
      .first()
      .should('contain.text', 'Widget A');
  });

  it('should handle API errors gracefully', () => {
    cy.intercept('GET', '/api/products', {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('getProductsError');

    cy.visit('/products');
    cy.wait('@getProductsError');

    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain.text', 'Something went wrong');
  });

  it('should show loading state', () => {
    cy.intercept('GET', '/api/products', (req) => {
      req.reply({
        delay: 2000,
        statusCode: 200,
        body: [],
      });
    }).as('getProductsSlow');

    cy.visit('/products');
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    cy.wait('@getProductsSlow');
    cy.get('[data-testid="loading-spinner"]').should('not.exist');
  });
});
\`\`\`

### Asserting on Request Payloads

\`\`\`typescript
it('should send correct data when creating a product', () => {
  cy.intercept('POST', '/api/products').as('createProduct');

  cy.visit('/products/new');
  cy.get('[data-testid="name-input"]').type('New Widget');
  cy.get('[data-testid="price-input"]').type('39.99');
  cy.get('[data-testid="submit-btn"]').click();

  cy.wait('@createProduct').then((interception) => {
    expect(interception.request.body).to.deep.equal({
      name: 'New Widget',
      price: 39.99,
    });
    expect(interception.response?.statusCode).to.equal(201);
  });
});
\`\`\`

### Using Fixtures for Stubbed Data

\`\`\`typescript
// cypress/fixtures/products.json
// [{ "id": 1, "name": "Widget", "price": 29.99 }]

it('should load products from fixture', () => {
  cy.intercept('GET', '/api/products', { fixture: 'products.json' }).as(
    'getProducts'
  );

  cy.visit('/products');
  cy.wait('@getProducts');
  cy.get('[data-testid="product-card"]').should('have.length.gte', 1);
});
\`\`\`

---

## Working with Fixtures

Fixtures keep test data separate from test logic. They are JSON files stored in \`cypress/fixtures/\` and loaded with \`cy.fixture()\` or referenced directly in \`cy.intercept()\`.

### Creating Fixture Files

\`\`\`json
// cypress/fixtures/user.json
{
  "id": 1,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "admin",
  "preferences": {
    "theme": "dark",
    "language": "en"
  }
}
\`\`\`

### Using Fixtures in Tests

\`\`\`typescript
describe('User Profile', () => {
  it('should display user information from fixture', () => {
    cy.fixture('user.json').then((user) => {
      cy.intercept('GET', '/api/user/profile', user).as('getProfile');

      cy.visit('/profile');
      cy.wait('@getProfile');

      cy.get('[data-testid="user-name"]').should('have.text', user.name);
      cy.get('[data-testid="user-email"]').should('have.text', user.email);
    });
  });
});
\`\`\`

### Dynamic Fixtures

Sometimes you need to modify fixture data per test:

\`\`\`typescript
it('should handle premium user differently', () => {
  cy.fixture('user.json').then((user) => {
    const premiumUser = { ...user, role: 'premium', plan: 'enterprise' };

    cy.intercept('GET', '/api/user/profile', premiumUser).as('getProfile');
    cy.visit('/profile');
    cy.wait('@getProfile');

    cy.get('[data-testid="premium-badge"]').should('be.visible');
  });
});
\`\`\`

---

## Environment Variables

Cypress supports environment variables for configuration values that change between environments, such as API URLs, credentials, and feature flags.

### Setting Environment Variables

In \`cypress.config.ts\`:

\`\`\`typescript
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    env: {
      API_URL: 'http://localhost:3001/api',
      TEST_USER_EMAIL: 'test@example.com',
      TEST_USER_PASSWORD: 'testpassword123',
    },
  },
});
\`\`\`

### Using cypress.env.json

Create \`cypress.env.json\` (add this to \`.gitignore\`):

\`\`\`json
{
  "API_URL": "https://staging-api.example.com",
  "TEST_USER_EMAIL": "staging-test@example.com",
  "TEST_USER_PASSWORD": "staging-password"
}
\`\`\`

### Accessing in Tests

\`\`\`typescript
describe('API Integration', () => {
  it('should call the correct API endpoint', () => {
    const apiUrl = Cypress.env('API_URL');

    cy.intercept(\`\\\${apiUrl}/products\`).as('getProducts');
    cy.visit('/products');
    cy.wait('@getProducts');
  });

  it('should login with test credentials', () => {
    cy.login(
      Cypress.env('TEST_USER_EMAIL'),
      Cypress.env('TEST_USER_PASSWORD')
    );
  });
});
\`\`\`

### CLI Overrides

\`\`\`bash
npx cypress run --env API_URL=https://prod-api.example.com
\`\`\`

---

## Page Object Model Pattern in Cypress

The Page Object Model (POM) encapsulates page interactions into reusable classes. While Cypress's chaining API makes POM less necessary than in Selenium, it still provides enormous value in large test suites.

### Defining Page Objects

\`\`\`typescript
// cypress/pages/LoginPage.ts
export class LoginPage {
  private selectors = {
    emailInput: '[data-testid="email-input"]',
    passwordInput: '[data-testid="password-input"]',
    loginButton: '[data-testid="login-btn"]',
    errorMessage: '[data-testid="error-message"]',
    forgotPassword: '[data-testid="forgot-password-link"]',
  };

  visit() {
    cy.visit('/login');
    return this;
  }

  typeEmail(email: string) {
    cy.get(this.selectors.emailInput).clear().type(email);
    return this;
  }

  typePassword(password: string) {
    cy.get(this.selectors.passwordInput).clear().type(password);
    return this;
  }

  clickLogin() {
    cy.get(this.selectors.loginButton).click();
    return this;
  }

  login(email: string, password: string) {
    this.typeEmail(email);
    this.typePassword(password);
    this.clickLogin();
    return this;
  }

  assertErrorMessage(message: string) {
    cy.get(this.selectors.errorMessage)
      .should('be.visible')
      .and('contain.text', message);
    return this;
  }

  assertLoginButtonDisabled() {
    cy.get(this.selectors.loginButton).should('be.disabled');
    return this;
  }
}
\`\`\`

\`\`\`typescript
// cypress/pages/DashboardPage.ts
export class DashboardPage {
  private selectors = {
    welcomeMessage: '[data-testid="welcome-message"]',
    statsPanel: '[data-testid="stats-panel"]',
    navigationMenu: '[data-testid="nav-menu"]',
    logoutButton: '[data-testid="logout-btn"]',
  };

  assertWelcomeMessage(name: string) {
    cy.get(this.selectors.welcomeMessage)
      .should('be.visible')
      .and('contain.text', name);
    return this;
  }

  assertStatsVisible() {
    cy.get(this.selectors.statsPanel).should('be.visible');
    return this;
  }

  logout() {
    cy.get(this.selectors.logoutButton).click();
    return this;
  }
}
\`\`\`

### Using Page Objects in Tests

\`\`\`typescript
// cypress/e2e/login.cy.ts
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

describe('Login Flow', () => {
  const loginPage = new LoginPage();
  const dashboardPage = new DashboardPage();

  it('should login successfully with valid credentials', () => {
    loginPage.visit().login('admin@example.com', 'password123');

    cy.url().should('include', '/dashboard');
    dashboardPage.assertWelcomeMessage('Admin');
    dashboardPage.assertStatsVisible();
  });

  it('should show error for invalid credentials', () => {
    loginPage.visit().login('wrong@example.com', 'wrongpassword');

    loginPage.assertErrorMessage('Invalid email or password');
    cy.url().should('include', '/login');
  });

  it('should disable login button when fields are empty', () => {
    loginPage.visit();
    loginPage.assertLoginButtonDisabled();
  });
});
\`\`\`

The fluent interface pattern (returning \`this\` from each method) allows chaining page object methods, making tests very readable.

---

## Component Testing with Cypress

Cypress component testing lets you mount and test individual UI components in isolation, using the same API you already know from E2E testing. This is particularly valuable for design system components and complex interactive widgets.

### Setting Up Component Testing

\`\`\`bash
npm install --save-dev @cypress/react @cypress/vite-dev-server
\`\`\`

Update \`cypress.config.ts\`:

\`\`\`typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.tsx',
  },
});
\`\`\`

### Writing Component Tests

\`\`\`typescript
// src/components/Button.cy.tsx
import { Button } from './Button';

describe('Button Component', () => {
  it('should render with correct text', () => {
    cy.mount(<Button>Click Me</Button>);
    cy.get('button').should('have.text', 'Click Me');
  });

  it('should call onClick handler when clicked', () => {
    const onClick = cy.spy().as('clickHandler');
    cy.mount(<Button onClick={onClick}>Submit</Button>);

    cy.get('button').click();
    cy.get('@clickHandler').should('have.been.calledOnce');
  });

  it('should be disabled when disabled prop is true', () => {
    cy.mount(<Button disabled>Disabled</Button>);
    cy.get('button').should('be.disabled');
  });

  it('should render different variants', () => {
    cy.mount(<Button variant="primary">Primary</Button>);
    cy.get('button').should('have.class', 'btn-primary');

    cy.mount(<Button variant="secondary">Secondary</Button>);
    cy.get('button').should('have.class', 'btn-secondary');
  });

  it('should show loading spinner when loading', () => {
    cy.mount(<Button loading>Loading</Button>);
    cy.get('[data-testid="spinner"]').should('be.visible');
    cy.get('button').should('be.disabled');
  });
});
\`\`\`

### Testing Forms as Components

\`\`\`typescript
// src/components/ContactForm.cy.tsx
import { ContactForm } from './ContactForm';

describe('ContactForm Component', () => {
  it('should submit form with correct data', () => {
    const onSubmit = cy.spy().as('submitHandler');
    cy.mount(<ContactForm onSubmit={onSubmit} />);

    cy.get('[data-testid="name-input"]').type('Jane Doe');
    cy.get('[data-testid="email-input"]').type('jane@example.com');
    cy.get('[data-testid="message-input"]').type('Hello there');
    cy.get('[data-testid="submit-btn"]').click();

    cy.get('@submitHandler').should('have.been.calledWith', {
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'Hello there',
    });
  });

  it('should show validation errors for empty required fields', () => {
    cy.mount(<ContactForm onSubmit={cy.spy()} />);
    cy.get('[data-testid="submit-btn"]').click();

    cy.get('[data-testid="name-error"]').should('contain.text', 'Name is required');
    cy.get('[data-testid="email-error"]').should('contain.text', 'Email is required');
  });
});
\`\`\`

Run component tests:

\`\`\`bash
npx cypress open --component
\`\`\`

---

## Advanced Patterns

### Handling Authentication Across Tests

Use \`cy.session()\` to cache login state:

\`\`\`typescript
Cypress.Commands.add('loginByApi', (username: string) => {
  cy.session(
    username,
    () => {
      cy.request('POST', '/api/auth/login', {
        email: username,
        password: Cypress.env('TEST_USER_PASSWORD'),
      }).then(({ body }) => {
        window.localStorage.setItem('token', body.token);
      });
    },
    {
      validate() {
        cy.request({
          url: '/api/auth/me',
          headers: {
            Authorization: \`Bearer \\\${window.localStorage.getItem('token')}\`,
          },
        }).its('status').should('eq', 200);
      },
    }
  );
});
\`\`\`

### File Upload Testing

\`\`\`typescript
it('should upload a file successfully', () => {
  cy.get('[data-testid="file-input"]').selectFile('cypress/fixtures/sample.pdf');
  cy.get('[data-testid="upload-btn"]').click();
  cy.get('[data-testid="upload-success"]').should('be.visible');
});

// Drag and drop upload
it('should accept drag and drop file upload', () => {
  cy.get('[data-testid="dropzone"]').selectFile('cypress/fixtures/image.png', {
    action: 'drag-drop',
  });
});
\`\`\`

### Testing Responsive Layouts

\`\`\`typescript
const viewports: Cypress.ViewportPreset[] = ['iphone-6', 'ipad-2', 'macbook-15'];

viewports.forEach((viewport) => {
  describe(\`Navigation on \\\${viewport}\`, () => {
    beforeEach(() => {
      cy.viewport(viewport);
      cy.visit('/');
    });

    it('should show mobile menu on small screens', () => {
      if (viewport === 'iphone-6') {
        cy.get('[data-testid="mobile-menu-btn"]').should('be.visible');
        cy.get('[data-testid="desktop-nav"]').should('not.be.visible');
      } else {
        cy.get('[data-testid="desktop-nav"]').should('be.visible');
      }
    });
  });
});
\`\`\`

### Handling Iframes

\`\`\`typescript
cy.get('iframe[data-testid="payment-frame"]')
  .its('0.contentDocument.body')
  .should('not.be.empty')
  .then(cy.wrap)
  .find('[data-testid="card-number"]')
  .type('4242424242424242');
\`\`\`

---

## CI/CD Integration

### GitHub Actions

Create \`.github/workflows/cypress.yml\`:

\`\`\`yaml
name: Cypress Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  cypress-run:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        browser: [chrome, firefox]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Cypress tests
        uses: cypress-io/github-action@v6
        with:
          build: npm run build
          start: npm start
          browser: \${{ matrix.browser }}
          wait-on: 'http://localhost:3000'
          wait-on-timeout: 120

      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: cypress-screenshots-\${{ matrix.browser }}
          path: cypress/screenshots

      - name: Upload videos
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: cypress-videos-\${{ matrix.browser }}
          path: cypress/videos
\`\`\`

### Parallel Test Execution

For large test suites, use the Cypress Cloud or a sharding strategy:

\`\`\`yaml
jobs:
  cypress-run:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        containers: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: cypress-io/github-action@v6
        with:
          start: npm start
          wait-on: 'http://localhost:3000'
          record: true
          parallel: true
          group: 'CI - Chrome'
        env:
          CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
\`\`\`

### Docker Setup

\`\`\`dockerfile
FROM cypress/included:13.6.0

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["npx", "cypress", "run"]
\`\`\`

---

## Debugging Cypress Tests

### Time-Travel Debugging

The Cypress Test Runner captures a snapshot at every command. Click on any command in the left panel to see the DOM state at that point. This is the fastest way to understand why a test failed.

### cy.debug() and cy.pause()

\`\`\`typescript
cy.get('[data-testid="user-card"]')
  .debug()  // Opens browser DevTools and logs the subject
  .should('be.visible');

cy.get('[data-testid="complex-form"]')
  .pause()  // Pauses test execution, lets you inspect state
  .find('input')
  .first()
  .type('test');
\`\`\`

### Console Logging

\`\`\`typescript
cy.get('[data-testid="price"]').then((\$el) => {
  cy.log(\`Price element text: \\\${\$el.text()}\`);
  cy.log(\`Element classes: \\\${\$el.attr('class')}\`);
});
\`\`\`

### Screenshots and Videos

Cypress automatically takes screenshots on failure and records videos in headless mode. You can also take manual screenshots:

\`\`\`typescript
cy.screenshot('before-login');
cy.get('[data-testid="login-btn"]').click();
cy.screenshot('after-login');
\`\`\`

---

## Best Practices Summary

1. **Use data-testid selectors** for reliability. Add them to your application code as a first-class concern, not an afterthought.

2. **Avoid cy.wait() with arbitrary timeouts**. Use \`cy.intercept()\` aliases instead of \`cy.wait(5000)\`. Network aliases make tests deterministic.

3. **Use cy.session() for login**. Do not repeat the full login flow in every test. Cache the session and restore it.

4. **Keep tests independent**. Each test should be able to run in isolation. Do not depend on test execution order.

5. **Prefer API setup over UI setup**. If a test needs data to exist, create it via API calls in \`beforeEach\` rather than clicking through the UI.

6. **Use fixtures for test data**. Keep test data in JSON fixtures and modify it per test as needed.

7. **Organize with Page Objects for large suites**. When you have more than 20 test files, the POM pattern pays for itself in maintainability.

8. **Configure retries for CI**. Set \`retries.runMode\` to 1 or 2 in CI to handle genuinely intermittent failures without masking real bugs.

9. **Run tests in parallel**. Use Cypress Cloud or a container-based sharding strategy to keep CI times under 10 minutes.

10. **Test the unhappy paths**. Error states, empty states, loading states, and edge cases are where real bugs hide.

---

## Installing QA Skills for Cypress

AI coding agents can generate Cypress tests faster when they have access to specialized Cypress knowledge. Install a Cypress skill to get framework-specific patterns, selector strategies, and best practices baked into your agent:

\`\`\`bash
npx @qaskills/cli add cypress-e2e-testing
\`\`\`

This gives your AI agent deep knowledge of Cypress patterns including custom commands, intercepts, fixtures, component testing, and CI configuration. Browse all available skills at [qaskills.sh/skills](/skills).

---

## Conclusion

Cypress continues to be an excellent choice for end-to-end testing in 2026, especially for teams deeply invested in the JavaScript and TypeScript ecosystem. Its developer-friendly approach, powerful network interception, and built-in debugging tools make it uniquely productive for frontend testing.

Start with the basics covered in this tutorial: install Cypress with TypeScript, write tests using reliable selectors, stub network requests with \`cy.intercept()\`, and organize your tests with the Page Object Model as the suite grows. Add component testing for your UI library, and set up CI/CD with GitHub Actions for automated feedback on every pull request.

The key to a successful Cypress test suite is not writing more tests -- it is writing the right tests. Focus on critical user flows, handle edge cases, and keep tests fast and independent. With the patterns in this guide, you have everything you need to build a production-grade Cypress testing pipeline.
`,
};
