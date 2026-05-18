import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Automation Framework Design Patterns: POM, Screenplay, Factory, and More',
  description:
    'Complete guide to test automation framework design patterns including Page Object Model, Screenplay pattern, Builder, Factory, Strategy, Decorator, and Observer patterns with implementation examples in TypeScript and Java for 2026.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
Design patterns are the difference between a test automation framework that scales gracefully to thousands of tests and one that collapses under its own weight after a few hundred. Patterns provide proven solutions to recurring problems -- they make your code more maintainable, more readable, and more adaptable to change. This guide covers the most important design patterns for test automation in 2026, with concrete implementation examples in both TypeScript (Playwright) and Java (Selenium). For each pattern, we explain when to use it, when to avoid it, and how to implement it correctly.

## Key Takeaways

- Page Object Model (POM) remains the most widely used pattern for UI test automation -- it separates page structure from test logic for maintainability
- The Screenplay pattern is gaining adoption for complex, actor-centric test scenarios where POM becomes unwieldy
- Builder pattern creates readable, flexible test data and configuration objects
- Factory pattern centralizes object creation and reduces test setup duplication
- Strategy pattern enables runtime selection of test behaviors (browsers, environments, auth methods)
- Decorator pattern adds cross-cutting concerns (logging, screenshots, retries) without modifying existing code
- Observer pattern powers real-time test reporting and event-driven test infrastructure
- Combining patterns is more powerful than using any single pattern in isolation

---

## Page Object Model (POM)

The Page Object Model is the foundational pattern of UI test automation. It encapsulates the structure and behavior of a web page (or component) into a class, exposing methods that represent user actions rather than raw element interactions.

### Why POM Matters

Without POM, UI selectors are scattered across test files. When the UI changes (and it will), you update selectors in dozens of test files. With POM, each selector exists in exactly one place. A UI change means updating one page object, not fifty tests.

POM also improves readability. A test that reads \`loginPage.login('user@test.com', 'password')\` is clearer than one with raw \`page.fill('#email', 'user@test.com')\` calls.

### TypeScript Implementation (Playwright)

\`\`\`typescript
// pages/login.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  private readonly page: Page;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorMessage: Locator;
  private readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email address');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot password' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectLoggedIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\\/dashboard/);
  }
}
\`\`\`

\`\`\`typescript
// tests/login.spec.ts
import { test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test.describe('Login', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@example.com', 'validpassword');
    await loginPage.expectLoggedIn();
  });

  test('invalid credentials show error message', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@example.com', 'wrongpassword');
    await loginPage.expectError('Invalid email or password');
  });
});
\`\`\`

### Java Implementation (Selenium)

\`\`\`java
// pages/LoginPage.java
public class LoginPage {
    private final WebDriver driver;
    private final By emailInput = By.cssSelector("[data-testid='email-input']");
    private final By passwordInput = By.cssSelector("[data-testid='password-input']");
    private final By submitButton = By.cssSelector("[data-testid='login-button']");
    private final By errorMessage = By.cssSelector("[role='alert']");

    public LoginPage(WebDriver driver) {
        this.driver = driver;
    }

    public LoginPage navigate() {
        driver.get(Config.BASE_URL + "/login");
        return this;
    }

    public DashboardPage login(String email, String password) {
        driver.findElement(emailInput).sendKeys(email);
        driver.findElement(passwordInput).sendKeys(password);
        driver.findElement(submitButton).click();
        return new DashboardPage(driver);
    }

    public String getErrorMessage() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        return wait.until(ExpectedConditions.visibilityOfElementLocated(errorMessage)).getText();
    }
}
\`\`\`

### When to Use POM

Use POM for every UI test automation project. It is the baseline pattern that other patterns build upon. Even small projects benefit from the separation of concerns.

### When POM Falls Short

POM struggles with highly dynamic pages where elements appear conditionally, with complex workflows that span many pages, and with component-level interactions that do not map cleanly to "pages." This is where the Screenplay pattern or component-level page objects help.

### POM Best Practices

**Return types**: Page methods that navigate to a new page should return the new page object. This enables fluent chaining and makes navigation explicit.

**No assertions in page objects**: Page objects should expose state (get methods) but not assert. Assertions belong in test files. The exception is wait-and-verify methods like \`expectLoggedIn()\` that combine waiting with verification for convenience.

**Composition over inheritance**: Instead of a deep inheritance hierarchy (BasePage -> AuthenticatedPage -> DashboardPage), compose page objects from smaller component objects (NavigationBar, Sidebar, DataTable).

---

## Screenplay Pattern

The Screenplay pattern models tests around actors performing tasks, rather than pages exposing methods. It originated in the Serenity BDD framework and is particularly powerful for complex business workflows.

### Core Concepts

- **Actor**: A user with abilities (browse the web, call APIs) and a name
- **Task**: A high-level goal (place an order, register an account) composed of smaller interactions
- **Interaction**: A low-level action (click a button, type in a field)
- **Question**: A way to query the system state (what is the order total? is the button visible?)

### TypeScript Implementation

\`\`\`typescript
// screenplay/actors.ts
import { Page } from '@playwright/test';

export class Actor {
  private page: Page;

  constructor(public name: string, page: Page) {
    this.page = page;
  }

  async attemptsTo(...tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      await task.performAs(this);
    }
  }

  async asks<T>(question: Question<T>): Promise<T> {
    return question.answeredBy(this);
  }

  getPage(): Page {
    return this.page;
  }
}

export interface Task {
  performAs(actor: Actor): Promise<void>;
}

export interface Question<T> {
  answeredBy(actor: Actor): Promise<T>;
}
\`\`\`

\`\`\`typescript
// screenplay/tasks/login.task.ts
import { Actor, Task } from '../actors';

export class Login implements Task {
  constructor(private email: string, private password: string) {}

  async performAs(actor: Actor): Promise<void> {
    const page = actor.getPage();
    await page.goto('/login');
    await page.getByLabel('Email address').fill(this.email);
    await page.getByLabel('Password').fill(this.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }

  static withCredentials(email: string, password: string): Login {
    return new Login(email, password);
  }
}
\`\`\`

\`\`\`typescript
// screenplay/tasks/place-order.task.ts
import { Actor, Task } from '../actors';

export class PlaceOrder implements Task {
  private productName: string;
  private quantity: number;

  constructor(productName: string, quantity: number) {
    this.productName = productName;
    this.quantity = quantity;
  }

  async performAs(actor: Actor): Promise<void> {
    const page = actor.getPage();
    await page.goto('/products');
    await page.getByText(this.productName).click();
    await page.getByLabel('Quantity').fill(String(this.quantity));
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();
    await page.getByRole('button', { name: 'Place order' }).click();
  }

  static forProduct(name: string, quantity: number = 1): PlaceOrder {
    return new PlaceOrder(name, quantity);
  }
}
\`\`\`

\`\`\`typescript
// screenplay/questions/order-confirmation.question.ts
import { Actor, Question } from '../actors';

export class OrderConfirmation implements Question<{ orderId: string; total: string }> {
  async answeredBy(actor: Actor): Promise<{ orderId: string; total: string }> {
    const page = actor.getPage();
    const orderId = await page.getByTestId('order-id').textContent() || '';
    const total = await page.getByTestId('order-total').textContent() || '';
    return { orderId, total };
  }

  static details(): OrderConfirmation {
    return new OrderConfirmation();
  }
}
\`\`\`

\`\`\`typescript
// tests/order-flow.spec.ts
import { test, expect } from '@playwright/test';
import { Actor } from '../screenplay/actors';
import { Login } from '../screenplay/tasks/login.task';
import { PlaceOrder } from '../screenplay/tasks/place-order.task';
import { OrderConfirmation } from '../screenplay/questions/order-confirmation.question';

test('customer can place an order', async ({ page }) => {
  const customer = new Actor('Jane', page);

  await customer.attemptsTo(
    Login.withCredentials('jane@example.com', 'password'),
    PlaceOrder.forProduct('Wireless Headphones', 2)
  );

  const confirmation = await customer.asks(OrderConfirmation.details());
  expect(confirmation.orderId).toBeTruthy();
  expect(confirmation.total).toContain('59.98');
});
\`\`\`

### When to Use Screenplay

Use Screenplay when tests model complex business workflows involving multiple actors (buyer, seller, admin), when POM classes become too large with too many methods, or when you need tests that read like business specifications.

### When to Avoid Screenplay

For simple CRUD applications or single-page apps with straightforward flows, Screenplay adds unnecessary abstraction. POM is sufficient and simpler.

---

## Builder Pattern

The Builder pattern constructs complex objects step by step. In test automation, it is used for creating test data, configuration objects, and request payloads with a fluent, readable API.

### TypeScript Implementation

\`\`\`typescript
// builders/user.builder.ts
import { randomUUID } from 'crypto';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  department: string;
  isActive: boolean;
  permissions: string[];
}

export class UserBuilder {
  private user: User = {
    id: randomUUID(),
    name: 'Test User',
    email: \`test-\${Date.now()}@example.com\`,
    role: 'user',
    department: 'Engineering',
    isActive: true,
    permissions: ['read'],
  };

  withName(name: string): this {
    this.user.name = name;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  asAdmin(): this {
    this.user.role = 'admin';
    this.user.permissions = ['read', 'write', 'delete', 'admin'];
    return this;
  }

  asViewer(): this {
    this.user.role = 'viewer';
    this.user.permissions = ['read'];
    return this;
  }

  inactive(): this {
    this.user.isActive = false;
    return this;
  }

  inDepartment(department: string): this {
    this.user.department = department;
    return this;
  }

  withPermissions(...permissions: string[]): this {
    this.user.permissions = permissions;
    return this;
  }

  build(): User {
    return { ...this.user };
  }
}

// Usage in tests
const admin = new UserBuilder().withName('Admin Jane').asAdmin().build();
const viewer = new UserBuilder().asViewer().inactive().inDepartment('Marketing').build();
\`\`\`

### Java Implementation

\`\`\`java
// builders/UserBuilder.java
public class UserBuilder {
    private String id = UUID.randomUUID().toString();
    private String name = "Test User";
    private String email = "test-" + System.currentTimeMillis() + "@example.com";
    private String role = "user";
    private boolean isActive = true;
    private List<String> permissions = List.of("read");

    public UserBuilder withName(String name) {
        this.name = name;
        return this;
    }

    public UserBuilder withEmail(String email) {
        this.email = email;
        return this;
    }

    public UserBuilder asAdmin() {
        this.role = "admin";
        this.permissions = List.of("read", "write", "delete", "admin");
        return this;
    }

    public UserBuilder asViewer() {
        this.role = "viewer";
        this.permissions = List.of("read");
        return this;
    }

    public UserBuilder inactive() {
        this.isActive = false;
        return this;
    }

    public User build() {
        return new User(id, name, email, role, isActive, permissions);
    }
}

// Usage
User admin = new UserBuilder().withName("Admin Jane").asAdmin().build();
\`\`\`

### When to Use Builder

Use Builder when creating objects with many optional fields, when you want test data creation to be self-documenting, and when different tests need different variations of the same object type.

---

## Factory Pattern

The Factory pattern centralizes object creation logic. Unlike Builder (which constructs one object step by step), Factory creates pre-configured object variations.

### TypeScript Implementation

\`\`\`typescript
// factories/user.factory.ts
import { randomUUID } from 'crypto';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
}

export class UserFactory {
  static createFreeUser(overrides?: Partial<User>): User {
    return {
      id: randomUUID(),
      name: 'Free User',
      email: \`free-\${Date.now()}@example.com\`,
      role: 'user',
      plan: 'free',
      ...overrides,
    };
  }

  static createProUser(overrides?: Partial<User>): User {
    return {
      id: randomUUID(),
      name: 'Pro User',
      email: \`pro-\${Date.now()}@example.com\`,
      role: 'user',
      plan: 'pro',
      ...overrides,
    };
  }

  static createAdmin(overrides?: Partial<User>): User {
    return {
      id: randomUUID(),
      name: 'Admin User',
      email: \`admin-\${Date.now()}@example.com\`,
      role: 'admin',
      plan: 'enterprise',
      ...overrides,
    };
  }
}

// Usage
const freeUser = UserFactory.createFreeUser();
const admin = UserFactory.createAdmin({ name: 'Super Admin' });
\`\`\`

### When to Use Factory vs Builder

Use Factory for creating common, pre-defined object variations (the "80% case"). Use Builder when each test needs a unique combination of properties (the "20% case"). Many frameworks use both: Factory for quick defaults, Builder for customized objects.

---

## Strategy Pattern

The Strategy pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable. In test automation, it enables runtime selection of behaviors like browser type, authentication method, or test environment.

### TypeScript Implementation

\`\`\`typescript
// strategies/auth.strategy.ts
export interface AuthStrategy {
  authenticate(): Promise<{ headers: Record<string, string> }>;
}

class BearerTokenAuth implements AuthStrategy {
  constructor(private tokenUrl: string, private clientId: string, private secret: string) {}

  async authenticate(): Promise<{ headers: Record<string, string> }> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.secret,
      }),
    });
    const { access_token } = await response.json();
    return { headers: { Authorization: \`Bearer \${access_token}\` } };
  }
}

class ApiKeyAuth implements AuthStrategy {
  constructor(private apiKey: string) {}

  async authenticate(): Promise<{ headers: Record<string, string> }> {
    return { headers: { 'X-API-Key': this.apiKey } };
  }
}

class NoAuth implements AuthStrategy {
  async authenticate(): Promise<{ headers: Record<string, string> }> {
    return { headers: {} };
  }
}

// Factory for selecting strategy based on environment
export function getAuthStrategy(env: string): AuthStrategy {
  switch (env) {
    case 'production':
      return new BearerTokenAuth(
        process.env.TOKEN_URL!,
        process.env.CLIENT_ID!,
        process.env.CLIENT_SECRET!
      );
    case 'staging':
      return new ApiKeyAuth(process.env.STAGING_API_KEY!);
    case 'local':
      return new NoAuth();
    default:
      throw new Error(\`Unknown environment: \${env}\`);
  }
}
\`\`\`

\`\`\`typescript
// tests/api.spec.ts
import { getAuthStrategy } from '../strategies/auth.strategy';

test('API returns products', async ({ request }) => {
  const auth = getAuthStrategy(process.env.TEST_ENV || 'staging');
  const { headers } = await auth.authenticate();

  const response = await request.get('/api/products', { headers });
  expect(response.status()).toBe(200);
});
\`\`\`

### Java Implementation

\`\`\`java
// strategies/BrowserStrategy.java
public interface BrowserStrategy {
    WebDriver createDriver();
}

public class ChromeStrategy implements BrowserStrategy {
    public WebDriver createDriver() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new");
        return new ChromeDriver(options);
    }
}

public class FirefoxStrategy implements BrowserStrategy {
    public WebDriver createDriver() {
        FirefoxOptions options = new FirefoxOptions();
        options.addArguments("-headless");
        return new FirefoxDriver(options);
    }
}

public class BrowserFactory {
    public static BrowserStrategy getStrategy(String browser) {
        return switch (browser.toLowerCase()) {
            case "chrome" -> new ChromeStrategy();
            case "firefox" -> new FirefoxStrategy();
            default -> throw new IllegalArgumentException("Unknown browser: " + browser);
        };
    }
}
\`\`\`

---

## Decorator Pattern

The Decorator pattern wraps an object to add behavior without modifying the original class. In test automation, decorators add cross-cutting concerns like logging, screenshots on failure, retry logic, and performance measurement.

### TypeScript Implementation

\`\`\`typescript
// decorators/logging.decorator.ts
import { Page } from '@playwright/test';

export function withLogging(page: Page): Page {
  return new Proxy(page, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (typeof original === 'function' && ['click', 'fill', 'goto', 'getByRole', 'getByText'].includes(String(prop))) {
        return (...args: any[]) => {
          console.log(\`[Action] \${String(prop)}(\${args.map((a) => JSON.stringify(a)).join(', ')})\`);
          return original.apply(target, args);
        };
      }

      return original;
    },
  });
}

// Usage
test('with logging', async ({ page }) => {
  const loggedPage = withLogging(page);
  await loggedPage.goto('/login'); // Logs: [Action] goto("/login")
  await loggedPage.getByLabel('Email').fill('test@test.com'); // Logs the action
});
\`\`\`

### Screenshot on Failure Decorator

\`\`\`typescript
// decorators/screenshot-on-failure.ts
import { test as base, Page } from '@playwright/test';
import path from 'path';

export function withScreenshotOnFailure(testInfo: any, page: Page) {
  const originalExpect = global.expect;

  return new Proxy(page, {
    get(target, prop) {
      const original = (target as any)[prop];
      if (typeof original !== 'function') return original;

      return async (...args: any[]) => {
        try {
          return await original.apply(target, args);
        } catch (error) {
          const screenshotPath = path.join(
            testInfo.outputDir,
            \`failure-\${Date.now()}.png\`
          );
          await target.screenshot({ path: screenshotPath, fullPage: true });
          testInfo.attachments.push({
            name: 'failure-screenshot',
            contentType: 'image/png',
            path: screenshotPath,
          });
          throw error;
        }
      };
    },
  });
}
\`\`\`

### Retry Decorator

\`\`\`typescript
// decorators/retry.decorator.ts
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  maxRetries: number = 3,
  delayMs: number = 1000
): T {
  return (async (...args: any[]) => {
    let lastError: Error;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          console.log(\`Retry \${attempt}/\${maxRetries} after error: \${lastError.message}\`);
          await new Promise((r) => setTimeout(r, delayMs * attempt));
        }
      }
    }
    throw lastError!;
  }) as T;
}
\`\`\`

---

## Observer Pattern

The Observer pattern defines a one-to-many dependency between objects. When one object changes state, all dependent observers are notified. In test automation, this powers real-time reporting, event logging, and test lifecycle hooks.

### TypeScript Implementation

\`\`\`typescript
// observers/test-event-emitter.ts
type TestEvent =
  | { type: 'test:start'; name: string; timestamp: number }
  | { type: 'test:pass'; name: string; duration: number }
  | { type: 'test:fail'; name: string; error: string; duration: number }
  | { type: 'step:start'; name: string; timestamp: number }
  | { type: 'step:end'; name: string; duration: number }
  | { type: 'screenshot'; path: string; timestamp: number };

type EventHandler = (event: TestEvent) => void | Promise<void>;

class TestEventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  async emit(event: TestEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    const wildcardHandlers = this.handlers.get('*') || [];

    for (const handler of [...handlers, ...wildcardHandlers]) {
      await handler(event);
    }
  }
}

export const testEvents = new TestEventEmitter();
\`\`\`

\`\`\`typescript
// observers/slack-reporter.ts
import { testEvents } from './test-event-emitter';

testEvents.on('test:fail', async (event) => {
  if (event.type !== 'test:fail') return;

  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: \`Test failed: \${event.name}\\nError: \${event.error}\\nDuration: \${event.duration}ms\`,
    }),
  });
});

// observers/metrics-collector.ts
testEvents.on('*', async (event) => {
  // Push all events to a metrics system (Prometheus, DataDog, etc.)
  console.log(\`[Metric] \${event.type} at \${Date.now()}\`);
});
\`\`\`

---

## Combining Patterns

Real frameworks combine multiple patterns. Here is a realistic example that uses POM, Builder, Factory, and Strategy together:

\`\`\`typescript
// A complete test combining patterns
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { UserFactory } from '../factories/user.factory';
import { OrderBuilder } from '../builders/order.builder';
import { getAuthStrategy } from '../strategies/auth.strategy';

test.describe('Order Management', () => {
  test('admin can view all orders', async ({ page, request }) => {
    // Factory: create test user
    const adminUser = UserFactory.createAdmin();

    // Strategy: authenticate based on environment
    const auth = getAuthStrategy(process.env.TEST_ENV || 'staging');
    const { headers } = await auth.authenticate();

    // Builder: create test order via API
    const order = new OrderBuilder()
      .withProduct('Widget Pro', 3)
      .withShipping('express')
      .withDiscount('SAVE10')
      .build();

    await request.post('/api/orders', { data: order, headers });

    // POM: interact with UI
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(adminUser.email, 'adminpassword');

    const dashboard = new DashboardPage(page);
    await dashboard.navigateToOrders();
    await dashboard.expectOrderVisible(order.id);
  });
});
\`\`\`

---

## Pattern Selection Guide

| Scenario | Recommended Pattern |
|---|---|
| Encapsulating page interactions | Page Object Model |
| Complex multi-actor workflows | Screenplay |
| Creating test data with many optional fields | Builder |
| Pre-configured test object variants | Factory |
| Runtime behavior switching (browser, auth, env) | Strategy |
| Adding logging, retries, screenshots | Decorator |
| Real-time reporting and event handling | Observer |
| Centralizing element creation | Abstract Factory |
| Ensuring single instance (config, auth, DB) | Singleton |

---

## Anti-Patterns to Avoid

**God Page Object**: A page object with 50+ methods and 100+ locators. Split it into component page objects (HeaderComponent, SidebarComponent, DataTableComponent).

**Over-abstraction**: Adding patterns for the sake of patterns. If your application has 10 tests and 3 pages, POM alone is sufficient. Do not add Screenplay, Builder, Factory, Strategy, Decorator, and Observer to a small project.

**Leaky abstractions**: Page objects that expose implementation details (raw locators, Playwright Page instance) to tests. The test should not know or care whether the page uses CSS selectors or ARIA roles.

**Inheritance abuse**: Deep inheritance hierarchies (BasePage -> AuthenticatedPage -> AdminPage -> AdminDashboardPage) are fragile. Prefer composition: inject shared components rather than inheriting from base classes.

**Shared mutable state**: Singletons that store test state (current user, current page) across tests. Each test should construct its own state.

---

## Conclusion

Design patterns are tools, not rules. The right pattern depends on your application's complexity, your team's experience, and the testing challenges you face. Start with POM for every UI project. Add Builder and Factory for test data. Introduce Strategy when you need runtime flexibility. Consider Screenplay when POM cannot express your test scenarios cleanly. Use Decorator and Observer for cross-cutting infrastructure concerns.

The best frameworks use two or three patterns well rather than implementing every pattern from the Gang of Four catalog. Start simple, add patterns when you feel real pain, and always prioritize test readability over architectural elegance.

For teams using AI coding agents, install QA skills that encode these patterns so your agent generates well-structured, pattern-compliant tests:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

Browse all 450+ QA skills at [qaskills.sh/skills](/skills).
`,
};
