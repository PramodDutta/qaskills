import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Page Object Model (POM) Design Pattern: Complete Guide with Examples',
  description:
    'Master the Page Object Model design pattern for test automation. Covers POM in Playwright, Selenium, and Cypress with base page classes, component objects, fluent interface, factory pattern, and anti-patterns.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
The Page Object Model is the most important design pattern in test automation. It separates the representation of a web page from the test logic that exercises it, creating a clean abstraction layer that makes test suites maintainable, readable, and resilient to UI changes. Whether you use Playwright, Selenium, or Cypress, the POM pattern is the foundation of every successful large-scale test automation effort. This guide covers the pattern in depth with practical examples in TypeScript, Java, and Python.

## Key Takeaways

- The Page Object Model encapsulates page elements and interactions into dedicated classes, keeping tests clean and focused on behavior
- A well-designed base page class eliminates boilerplate and provides consistent wait strategies, navigation, and error handling across all page objects
- Component objects model reusable UI widgets (headers, modals, data tables) that appear across multiple pages
- The fluent interface pattern (method chaining) makes test code read like a specification
- Factory patterns enable page objects to instantiate the correct next page after navigation events
- Common anti-patterns include putting assertions in page objects, creating god page objects, and duplicating selectors
- POM works across all major frameworks: Playwright, Selenium, Cypress, WebDriverIO, and more

---

## What Is the Page Object Model

The Page Object Model is a design pattern where each web page (or significant page section) is represented by a class. The class exposes methods that represent the operations a user can perform on that page, and properties that represent the data visible on that page. Tests interact with these page objects instead of directly manipulating HTML elements.

A simple analogy: a page object is like a remote control for a television. You press "Volume Up" without knowing the internal electronics. Similarly, your test calls \`loginPage.login(email, password)\` without knowing the CSS selectors or the sequence of clicks involved.

### The Problem POM Solves

Without page objects, test code looks like this:

\`\`\`typescript
// Without POM -- selectors and actions mixed into tests
test('should login successfully', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email-input').fill('admin@example.com');
  await page.locator('#password-input').fill('password123');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('.welcome-heading')).toHaveText('Welcome, Admin');
});

test('should show error for bad credentials', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email-input').fill('wrong@example.com');
  await page.locator('#password-input').fill('wrongpass');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('.error-message')).toBeVisible();
});
\`\`\`

The problems multiply as the suite grows. If the email input ID changes from \`#email-input\` to \`[data-testid="email"]\`, you must find and update every test that references it. With 200 tests, this becomes a maintenance nightmare. POM solves this by centralizing selectors in one place.

### The POM Solution

\`\`\`typescript
// With POM -- tests are clean and selectors are centralized
test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = await loginPage.login('admin@example.com', 'password123');
  await dashboardPage.expectWelcomeMessage('Welcome, Admin');
});

test('should show error for bad credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.login('wrong@example.com', 'wrongpass');
  await loginPage.expectErrorVisible();
});
\`\`\`

Now if the email input selector changes, you update it in one place: the \`LoginPage\` class. Every test that uses it continues to work without modification.

---

## Why Use the Page Object Model

### Maintainability

When the UI changes (and it always does), you update a single page object class instead of searching through hundreds of test files. This is the primary benefit and the reason POM exists.

### Readability

Tests read like specifications. \`loginPage.login(email, password)\` communicates intent far better than a sequence of locator calls and clicks.

### Reusability

Login is used by dozens of tests. With POM, you write the login interaction once and reuse it everywhere. Changes propagate automatically.

### Encapsulation

Tests do not need to know about selectors, wait strategies, or the internal structure of pages. The page object handles all of that complexity.

### Team Collaboration

Page objects create a shared vocabulary. QA engineers, developers, and product managers can all understand tests written with well-named page object methods.

For AI coding agents, installing a POM-specific QA skill ensures generated tests always follow this pattern:

\`\`\`bash
npx @qaskills/cli add page-object-model
\`\`\`

---

## POM in Playwright (TypeScript)

### Base Page Class

\`\`\`typescript
// pages/BasePage.ts
import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  protected getByRole(
    role: Parameters<Page['getByRole']>[0],
    options?: Parameters<Page['getByRole']>[1]
  ): Locator {
    return this.page.getByRole(role, options);
  }

  protected getByLabel(label: string): Locator {
    return this.page.getByLabel(label);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: \`screenshots/\${name}.png\` });
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }
}
\`\`\`

### Login Page

\`\`\`typescript
// pages/LoginPage.ts
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { DashboardPage } from './DashboardPage';

export class LoginPage extends BasePage {
  // Locators are defined as properties
  private readonly emailInput = this.getByLabel('Email');
  private readonly passwordInput = this.getByLabel('Password');
  private readonly loginButton = this.getByRole('button', { name: 'Sign in' });
  private readonly errorMessage = this.getByTestId('error-message');
  private readonly forgotPasswordLink = this.getByRole('link', {
    name: 'Forgot password',
  });

  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<this> {
    await this.navigate('/login');
    return this;
  }

  async fillEmail(email: string): Promise<this> {
    await this.emailInput.fill(email);
    return this;
  }

  async fillPassword(password: string): Promise<this> {
    await this.passwordInput.fill(password);
    return this;
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async login(email: string, password: string): Promise<DashboardPage> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
    await this.page.waitForURL('**/dashboard');
    return new DashboardPage(this.page);
  }

  async loginExpectingError(
    email: string,
    password: string
  ): Promise<this> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
    return this;
  }

  async expectErrorVisible(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectErrorText(text: string): Promise<void> {
    await expect(this.errorMessage).toContainText(text);
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }
}
\`\`\`

### Dashboard Page

\`\`\`typescript
// pages/DashboardPage.ts
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  private readonly welcomeHeading = this.getByTestId('welcome-heading');
  private readonly statsCards = this.getByTestId('stat-card');
  private readonly userMenu = this.getByTestId('user-menu');
  private readonly logoutButton = this.getByRole('button', { name: 'Logout' });

  constructor(page: Page) {
    super(page);
  }

  async expectWelcomeMessage(message: string): Promise<void> {
    await expect(this.welcomeHeading).toContainText(message);
  }

  async getStatsCount(): Promise<number> {
    return this.statsCards.count();
  }

  async logout(): Promise<void> {
    await this.userMenu.click();
    await this.logoutButton.click();
  }
}
\`\`\`

### Test Using Page Objects

\`\`\`typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.open();
  });

  test('should login successfully', async ({ page }) => {
    const dashboard = await loginPage.login(
      'admin@example.com',
      'password123'
    );
    await dashboard.expectWelcomeMessage('Welcome, Admin');
  });

  test('should show error for invalid credentials', async () => {
    await loginPage.loginExpectingError('wrong@example.com', 'bad');
    await loginPage.expectErrorText('Invalid email or password');
  });
});
\`\`\`

---

## POM in Selenium (Java)

### Base Page

\`\`\`java
// pages/BasePage.java
package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

public abstract class BasePage {
    protected WebDriver driver;
    protected WebDriverWait wait;

    public BasePage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    protected WebElement find(By locator) {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
    }

    protected void click(By locator) {
        wait.until(ExpectedConditions.elementToBeClickable(locator)).click();
    }

    protected void type(By locator, String text) {
        WebElement element = find(locator);
        element.clear();
        element.sendKeys(text);
    }

    protected String getText(By locator) {
        return find(locator).getText();
    }

    protected boolean isDisplayed(By locator) {
        try {
            return find(locator).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    protected void waitForUrl(String partialUrl) {
        wait.until(ExpectedConditions.urlContains(partialUrl));
    }

    public String getTitle() {
        return driver.getTitle();
    }
}
\`\`\`

### Login Page

\`\`\`java
// pages/LoginPage.java
package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class LoginPage extends BasePage {
    private final By emailInput = By.cssSelector("[data-testid='email-input']");
    private final By passwordInput = By.cssSelector("[data-testid='password-input']");
    private final By loginButton = By.cssSelector("[data-testid='login-btn']");
    private final By errorMessage = By.cssSelector("[data-testid='error-message']");

    public LoginPage(WebDriver driver) {
        super(driver);
    }

    public LoginPage open() {
        driver.get("http://localhost:3000/login");
        return this;
    }

    public LoginPage enterEmail(String email) {
        type(emailInput, email);
        return this;
    }

    public LoginPage enterPassword(String password) {
        type(passwordInput, password);
        return this;
    }

    public DashboardPage clickLogin() {
        click(loginButton);
        waitForUrl("/dashboard");
        return new DashboardPage(driver);
    }

    public DashboardPage login(String email, String password) {
        enterEmail(email);
        enterPassword(password);
        return clickLogin();
    }

    public LoginPage loginExpectingError(String email, String password) {
        enterEmail(email);
        enterPassword(password);
        click(loginButton);
        return this;
    }

    public String getErrorMessage() {
        return getText(errorMessage);
    }

    public boolean isErrorDisplayed() {
        return isDisplayed(errorMessage);
    }
}
\`\`\`

### Test with JUnit 5

\`\`\`java
// tests/LoginTest.java
package tests;

import org.junit.jupiter.api.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import pages.LoginPage;
import pages.DashboardPage;

import static org.junit.jupiter.api.Assertions.*;

class LoginTest {
    private WebDriver driver;
    private LoginPage loginPage;

    @BeforeEach
    void setUp() {
        driver = new ChromeDriver();
        loginPage = new LoginPage(driver).open();
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    void shouldLoginSuccessfully() {
        DashboardPage dashboard = loginPage.login(
            "admin@example.com", "password123"
        );
        assertTrue(dashboard.getTitle().contains("Dashboard"));
    }

    @Test
    void shouldShowErrorForInvalidCredentials() {
        loginPage.loginExpectingError("wrong@example.com", "bad");
        assertTrue(loginPage.isErrorDisplayed());
        assertTrue(loginPage.getErrorMessage().contains("Invalid"));
    }
}
\`\`\`

---

## POM in Selenium (Python)

### Base Page

\`\`\`python
# pages/base_page.py
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class BasePage:
    def __init__(self, driver: WebDriver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)

    def find(self, locator: tuple) -> WebElement:
        return self.wait.until(EC.visibility_of_element_located(locator))

    def click(self, locator: tuple):
        self.wait.until(EC.element_to_be_clickable(locator)).click()

    def type_text(self, locator: tuple, text: str):
        element = self.find(locator)
        element.clear()
        element.send_keys(text)

    def get_text(self, locator: tuple) -> str:
        return self.find(locator).text

    def is_displayed(self, locator: tuple) -> bool:
        try:
            return self.find(locator).is_displayed()
        except Exception:
            return False

    def wait_for_url(self, partial_url: str):
        self.wait.until(EC.url_contains(partial_url))
\`\`\`

### Login Page

\`\`\`python
# pages/login_page.py
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from pages.dashboard_page import DashboardPage


class LoginPage(BasePage):
    EMAIL_INPUT = (By.CSS_SELECTOR, "[data-testid='email-input']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "[data-testid='password-input']")
    LOGIN_BUTTON = (By.CSS_SELECTOR, "[data-testid='login-btn']")
    ERROR_MESSAGE = (By.CSS_SELECTOR, "[data-testid='error-message']")

    def open(self):
        self.driver.get("http://localhost:3000/login")
        return self

    def login(self, email: str, password: str) -> DashboardPage:
        self.type_text(self.EMAIL_INPUT, email)
        self.type_text(self.PASSWORD_INPUT, password)
        self.click(self.LOGIN_BUTTON)
        self.wait_for_url("/dashboard")
        return DashboardPage(self.driver)

    def login_expecting_error(self, email: str, password: str):
        self.type_text(self.EMAIL_INPUT, email)
        self.type_text(self.PASSWORD_INPUT, password)
        self.click(self.LOGIN_BUTTON)
        return self

    def get_error_message(self) -> str:
        return self.get_text(self.ERROR_MESSAGE)
\`\`\`

---

## POM in Cypress

Cypress uses a functional, chaining API rather than traditional OOP classes. POM in Cypress adapts the pattern to fit this style.

\`\`\`typescript
// cypress/pages/LoginPage.ts
export class LoginPage {
  private selectors = {
    email: '[data-testid="email-input"]',
    password: '[data-testid="password-input"]',
    loginButton: '[data-testid="login-btn"]',
    error: '[data-testid="error-message"]',
  };

  visit() {
    cy.visit('/login');
    return this;
  }

  typeEmail(email: string) {
    cy.get(this.selectors.email).clear().type(email);
    return this;
  }

  typePassword(password: string) {
    cy.get(this.selectors.password).clear().type(password);
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

  assertError(message: string) {
    cy.get(this.selectors.error)
      .should('be.visible')
      .and('contain.text', message);
    return this;
  }
}
\`\`\`

\`\`\`typescript
// cypress/e2e/login.cy.ts
import { LoginPage } from '../pages/LoginPage';

describe('Login', () => {
  const loginPage = new LoginPage();

  it('should login successfully', () => {
    loginPage.visit().login('admin@example.com', 'password123');
    cy.url().should('include', '/dashboard');
  });

  it('should show error for bad credentials', () => {
    loginPage.visit().login('wrong@example.com', 'bad');
    loginPage.assertError('Invalid email or password');
  });
});
\`\`\`

---

## Component Objects

Component objects extend the POM concept to reusable UI components that appear across multiple pages: navigation bars, modals, data tables, search bars, and footers.

### Navigation Component

\`\`\`typescript
// components/NavigationBar.ts
import { Page, Locator } from '@playwright/test';

export class NavigationBar {
  private readonly page: Page;
  private readonly searchInput: Locator;
  private readonly userMenu: Locator;
  private readonly notificationBell: Locator;
  private readonly logo: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('searchbox');
    this.userMenu = page.getByTestId('user-menu');
    this.notificationBell = page.getByTestId('notification-bell');
    this.logo = page.getByTestId('logo');
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
  }

  async openUserMenu(): Promise<void> {
    await this.userMenu.click();
  }

  async getNotificationCount(): Promise<number> {
    const badge = this.notificationBell.locator('.badge');
    const text = await badge.textContent();
    return text ? parseInt(text, 10) : 0;
  }

  async clickLogo(): Promise<void> {
    await this.logo.click();
  }
}
\`\`\`

### Modal Component

\`\`\`typescript
// components/ConfirmationModal.ts
import { Page, Locator, expect } from '@playwright/test';

export class ConfirmationModal {
  private readonly overlay: Locator;
  private readonly title: Locator;
  private readonly message: Locator;
  private readonly confirmButton: Locator;
  private readonly cancelButton: Locator;

  constructor(page: Page) {
    this.overlay = page.getByTestId('modal-overlay');
    this.title = page.getByTestId('modal-title');
    this.message = page.getByTestId('modal-message');
    this.confirmButton = page.getByRole('button', { name: 'Confirm' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
  }

  async expectVisible(): Promise<void> {
    await expect(this.overlay).toBeVisible();
  }

  async expectTitle(title: string): Promise<void> {
    await expect(this.title).toHaveText(title);
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
    await expect(this.overlay).toBeHidden();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.overlay).toBeHidden();
  }
}
\`\`\`

### Data Table Component

\`\`\`typescript
// components/DataTable.ts
import { Page, Locator, expect } from '@playwright/test';

export class DataTable {
  private readonly table: Locator;
  private readonly rows: Locator;
  private readonly headers: Locator;
  private readonly emptyState: Locator;

  constructor(page: Page, testId: string = 'data-table') {
    this.table = page.getByTestId(testId);
    this.rows = this.table.locator('tbody tr');
    this.headers = this.table.locator('thead th');
    this.emptyState = this.table.getByTestId('empty-state');
  }

  async getRowCount(): Promise<number> {
    return this.rows.count();
  }

  async getCellText(row: number, column: number): Promise<string> {
    const cell = this.rows.nth(row).locator('td').nth(column);
    return (await cell.textContent()) || '';
  }

  async clickRowAction(row: number, action: string): Promise<void> {
    await this.rows.nth(row).getByRole('button', { name: action }).click();
  }

  async sortByColumn(headerText: string): Promise<void> {
    await this.headers.filter({ hasText: headerText }).click();
  }

  async expectRowCount(count: number): Promise<void> {
    await expect(this.rows).toHaveCount(count);
  }

  async expectEmpty(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }
}
\`\`\`

### Composing Components into Pages

\`\`\`typescript
// pages/ProductListPage.ts
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { NavigationBar } from '../components/NavigationBar';
import { DataTable } from '../components/DataTable';
import { ConfirmationModal } from '../components/ConfirmationModal';

export class ProductListPage extends BasePage {
  readonly nav: NavigationBar;
  readonly table: DataTable;
  readonly confirmModal: ConfirmationModal;

  constructor(page: Page) {
    super(page);
    this.nav = new NavigationBar(page);
    this.table = new DataTable(page, 'product-table');
    this.confirmModal = new ConfirmationModal(page);
  }

  async open(): Promise<this> {
    await this.navigate('/products');
    return this;
  }

  async deleteProduct(row: number): Promise<void> {
    await this.table.clickRowAction(row, 'Delete');
    await this.confirmModal.expectVisible();
    await this.confirmModal.confirm();
  }

  async searchProducts(query: string): Promise<void> {
    await this.nav.search(query);
  }
}
\`\`\`

---

## The Fluent Interface Pattern

The fluent interface (also known as method chaining) makes page object methods return \`this\` so actions can be chained together. This creates test code that reads like a sentence.

\`\`\`typescript
// Without fluent interface
await registrationPage.fillFirstName('Jane');
await registrationPage.fillLastName('Doe');
await registrationPage.fillEmail('jane@example.com');
await registrationPage.selectCountry('United States');
await registrationPage.acceptTerms();
await registrationPage.submit();

// With fluent interface
await registrationPage
  .fillFirstName('Jane')
  .fillLastName('Doe')
  .fillEmail('jane@example.com')
  .selectCountry('United States')
  .acceptTerms()
  .submit();
\`\`\`

### Implementation

For async frameworks (Playwright, WebDriverIO), return a Promise that resolves to \`this\`:

\`\`\`typescript
export class RegistrationPage extends BasePage {
  async fillFirstName(name: string): Promise<this> {
    await this.getByLabel('First name').fill(name);
    return this;
  }

  async fillLastName(name: string): Promise<this> {
    await this.getByLabel('Last name').fill(name);
    return this;
  }

  // Note: with async, you chain with .then() or await each step
}
\`\`\`

For synchronous frameworks (Selenium Java), simple method chaining works directly:

\`\`\`java
public class RegistrationPage extends BasePage {
    public RegistrationPage fillFirstName(String name) {
        type(firstNameInput, name);
        return this;
    }

    public RegistrationPage fillLastName(String name) {
        type(lastNameInput, name);
        return this;
    }

    public RegistrationPage fillEmail(String email) {
        type(emailInput, email);
        return this;
    }

    public DashboardPage submit() {
        click(submitButton);
        waitForUrl("/dashboard");
        return new DashboardPage(driver);
    }
}
\`\`\`

---

## The Factory Pattern

When a page action navigates to a different page, the page object method should return an instance of the destination page. This is the factory pattern applied to page objects.

\`\`\`typescript
export class LoginPage extends BasePage {
  // Returns DashboardPage on success
  async loginAsAdmin(): Promise<DashboardPage> {
    await this.fillEmail('admin@example.com');
    await this.fillPassword('password123');
    await this.clickLogin();
    await this.page.waitForURL('**/dashboard');
    return new DashboardPage(this.page);
  }

  // Returns LoginPage on failure (stays on same page)
  async loginWithInvalidCredentials(
    email: string,
    password: string
  ): Promise<LoginPage> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
    return this;
  }

  // Returns ForgotPasswordPage
  async clickForgotPassword(): Promise<ForgotPasswordPage> {
    await this.forgotPasswordLink.click();
    return new ForgotPasswordPage(this.page);
  }
}
\`\`\`

In the test, the type system tells you exactly which page you are on after each action:

\`\`\`typescript
test('complete password reset flow', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();

  const forgotPage = await loginPage.clickForgotPassword();
  const confirmPage = await forgotPage.submitEmail('user@example.com');
  await confirmPage.expectSuccessMessage('Check your email');
});
\`\`\`

---

## Anti-Patterns to Avoid

### 1. Assertions Inside Page Objects

Page objects should expose data and state. Tests should make assertions.

\`\`\`typescript
// BAD: assertion inside page object
class LoginPage {
  async verifyLoginSuccessful() {
    await expect(this.page).toHaveURL('/dashboard'); // assertion belongs in test
  }
}

// GOOD: page object returns data, test asserts
class LoginPage {
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }
}
// In test:
expect(await loginPage.getCurrentUrl()).toContain('/dashboard');

// ALSO GOOD: expect methods that wrap assertions for readability
class DashboardPage {
  async expectWelcomeMessage(name: string): Promise<void> {
    await expect(this.welcomeHeading).toContainText(name);
  }
}
\`\`\`

The second approach (expect methods) is a pragmatic compromise that many teams adopt. The key is consistency: pick one approach and apply it across the project.

### 2. God Page Objects

A page object that models an entire complex page with 50+ methods is too large. Break it into component objects.

### 3. Exposing Locators

Page objects should not expose raw locators. Callers should only interact through methods.

\`\`\`typescript
// BAD: exposes implementation details
class LoginPage {
  public emailInput = this.page.locator('#email');
}

// GOOD: encapsulates interaction
class LoginPage {
  private emailInput = this.page.locator('#email');

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }
}
\`\`\`

### 4. Duplicating Selectors Across Page Objects

If the same component appears on multiple pages, extract it into a component object rather than duplicating selectors.

### 5. Stateful Page Objects

Page objects should not store state between method calls beyond what the constructor provides. Each method should query the current state of the page, not rely on cached values.

---

## Best Practices Summary

1. **One page object per page or major section.** Do not create one giant class for the entire application.

2. **Use a base page class.** Centralize common operations like find, click, type, and wait.

3. **Extract component objects for reusable UI elements.** Headers, modals, tables, and forms deserve their own classes.

4. **Return the next page from navigation methods.** The factory pattern makes test flow explicit.

5. **Use the fluent interface for multi-step operations.** Method chaining improves readability.

6. **Keep selectors private.** Only expose methods, not locators.

7. **Use data-testid attributes as your primary selector strategy.** Coordinate with developers to add them.

8. **Keep page objects thin.** Each method should do one thing. Complex workflows belong in test helper functions.

9. **Name methods from the user's perspective.** Use \`login()\`, \`addToCart()\`, \`searchFor()\` -- not \`clickButton()\` or \`fillField()\`.

10. **Version page objects with the application.** When the UI changes, update the page object first, then verify tests still pass.

---

## POM and AI Coding Agents

AI coding agents benefit enormously from POM structure. When an agent has a POM skill installed, it generates tests that are naturally organized, use centralized selectors, and follow consistent patterns:

\`\`\`bash
npx @qaskills/cli add page-object-model
\`\`\`

Browse all available QA skills at [qaskills.sh/skills](/skills).

---

## Conclusion

The Page Object Model is not just a design pattern -- it is the foundation of maintainable test automation. Every team that scales beyond a handful of tests eventually adopts POM, and those that adopt it early avoid the painful refactoring that comes from years of scattered selectors and duplicated page interactions.

Implement the pattern from day one. Start with a base page class, create page objects for each major page, extract component objects for shared widgets, and use the factory pattern for navigation. Follow the anti-pattern guidance to avoid common mistakes, and adapt the pattern to your framework of choice. The examples in this guide work directly with Playwright, Selenium, and Cypress -- the three most popular automation frameworks in 2026.

A well-structured POM is not more work. It is less work over the lifetime of a project. It is the difference between a test suite that the team maintains with confidence and one that everyone is afraid to touch.
`,
};
