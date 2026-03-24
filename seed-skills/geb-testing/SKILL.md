---
name: "Geb Testing"
description: "Browser automation testing with Geb framework for Groovy/JVM using jQuery-like content DSL, Page Object pattern, Spock integration, and WebDriver abstraction."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [geb, groovy, spock, browser-automation, page-object, webdriver, jquery-dsl, jvm]
testingTypes: [e2e, integration, acceptance]
frameworks: [geb]
languages: [groovy]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Geb Testing

You are an expert QA engineer specializing in Geb, the Groovy-based browser automation framework built on top of WebDriver. When the user asks you to write, review, debug, or set up Geb tests, follow these detailed instructions. You understand the Geb ecosystem deeply including the jQuery-like content DSL, Page Object pattern with content blocks, module composition, Spock integration, waiting/polling, and configuration management.

## Core Principles

1. **Content DSL** — Use Geb's declarative `content` blocks in Page Objects to define element references. The jQuery-like `$()` navigator provides powerful element selection.
2. **Page Object Pattern** — Every page interaction goes through a Page class with `static content` definitions. Pages define their `url`, `at` checker, and navigable content.
3. **Module Composition** — Extract reusable UI components (headers, footers, modals, tables) into Module classes that can be embedded in multiple pages.
4. **Implicit Assertions** — Geb automatically waits for `at` checkers to pass during page transitions. Use `waitFor {}` for dynamic content.
5. **Spock Integration** — Use `GebSpec` or `GebReportingSpec` as the base class for tests. Spock's BDD-style `given/when/then` blocks pair naturally with Geb.
6. **Configuration Over Code** — Use `GebConfig.groovy` for browser selection, base URL, waiting strategies, and reporting. Keep tests focused on behavior.
7. **Navigator API** — Master the `$()` navigator for element selection. Chain methods like `.text()`, `.value()`, `.click()`, `.attr()` for fluent interactions.

## Project Structure

```
project-root/
├── build.gradle                      # Gradle build with Geb dependencies
├── src/
│   └── test/
│       ├── groovy/
│       │   ├── pages/
│       │   │   ├── BasePage.groovy
│       │   │   ├── LoginPage.groovy
│       │   │   ├── DashboardPage.groovy
│       │   │   └── CartPage.groovy
│       │   ├── modules/
│       │   │   ├── NavBarModule.groovy
│       │   │   ├── ModalModule.groovy
│       │   │   └── TableModule.groovy
│       │   ├── specs/
│       │   │   ├── auth/
│       │   │   │   ├── LoginSpec.groovy
│       │   │   │   └── RegistrationSpec.groovy
│       │   │   ├── shopping/
│       │   │   │   └── CartSpec.groovy
│       │   │   └── smoke/
│       │   │       └── SmokeSpec.groovy
│       │   └── helpers/
│       │       ├── TestDataHelper.groovy
│       │       └── ApiHelper.groovy
│       └── resources/
│           └── GebConfig.groovy      # Geb configuration
├── reports/
│   └── geb/
└── gradle/
    └── wrapper/
```

## Detailed Code Examples

### Geb Configuration

```groovy
// src/test/resources/GebConfig.groovy
import org.openqa.selenium.chrome.ChromeDriver
import org.openqa.selenium.chrome.ChromeOptions
import org.openqa.selenium.firefox.FirefoxDriver

waiting {
    timeout = 10
    retryInterval = 0.5
    includeCauseInMessage = true
}

atCheckWaiting = true

environments {
    chrome {
        driver = {
            ChromeOptions options = new ChromeOptions()
            options.addArguments('--window-size=1920,1080')
            if (System.getenv('CI')) {
                options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage')
            }
            new ChromeDriver(options)
        }
    }

    firefox {
        driver = { new FirefoxDriver() }
    }
}

baseUrl = System.getenv('BASE_URL') ?: 'http://localhost:3000'

reportsDir = new File('reports/geb')
reportOnTestFailureOnly = false
```

### Page Objects with Content DSL

```groovy
// src/test/groovy/pages/LoginPage.groovy
import geb.Page

class LoginPage extends Page {
    static url = '/login'

    static at = {
        title.contains('Login') || emailInput.displayed
    }

    static content = {
        emailInput { $('[data-testid="email-input"]') }
        passwordInput { $('[data-testid="password-input"]') }
        loginButton { $('[data-testid="login-submit"]') }
        errorMessage(required: false) { $('[data-testid="error-message"]') }
        forgotPasswordLink { $('a', text: 'Forgot password?') }
        rememberMeCheckbox { $('[data-testid="remember-me"]') }
    }

    void login(String email, String password) {
        emailInput.value(email)
        passwordInput.value(password)
        loginButton.click()
    }

    String getErrorText() {
        waitFor { errorMessage.displayed }
        errorMessage.text()
    }
}

// src/test/groovy/pages/DashboardPage.groovy
import geb.Page

class DashboardPage extends Page {
    static url = '/dashboard'

    static at = {
        welcomeMessage.displayed
    }

    static content = {
        welcomeMessage { $('[data-testid="welcome-message"]') }
        navBar { module NavBarModule }
        userMenu { $('[data-testid="user-menu"]') }
        notificationBadge(required: false) { $('[data-testid="notification-count"]') }
        recentActivity { $('[data-testid="activity-list"] li') }
    }

    String getWelcomeText() {
        welcomeMessage.text()
    }

    int getActivityCount() {
        recentActivity.size()
    }

    void clickUserMenu() {
        userMenu.click()
        waitFor { $('[data-testid="user-dropdown"]').displayed }
    }
}
```

### Modules for Reusable Components

```groovy
// src/test/groovy/modules/NavBarModule.groovy
import geb.Module

class NavBarModule extends Module {
    static content = {
        homeLink { $('nav a', text: 'Home') }
        productsLink { $('nav a', text: 'Products') }
        cartLink { $('nav a[href="/cart"]') }
        cartCount(required: false) { $('[data-testid="cart-count"]') }
        searchInput { $('nav input[type="search"]') }
        searchButton { $('nav button[type="submit"]') }
    }

    void navigateTo(String section) {
        $("nav a", text: section).click()
    }

    void search(String query) {
        searchInput.value(query)
        searchButton.click()
    }

    int getCartItemCount() {
        cartCount.displayed ? cartCount.text().toInteger() : 0
    }
}

// src/test/groovy/modules/ModalModule.groovy
import geb.Module

class ModalModule extends Module {
    static content = {
        title { $('[data-testid="modal-title"]') }
        body { $('[data-testid="modal-body"]') }
        confirmButton { $('[data-testid="modal-confirm"]') }
        cancelButton { $('[data-testid="modal-cancel"]') }
        closeButton { $('[data-testid="modal-close"]') }
    }

    void confirm() {
        confirmButton.click()
        waitFor { !isDisplayed() }
    }

    void cancel() {
        cancelButton.click()
        waitFor { !isDisplayed() }
    }

    boolean isDisplayed() {
        try { title.displayed } catch (Exception e) { false }
    }
}

// src/test/groovy/modules/TableModule.groovy
import geb.Module

class TableModule extends Module {
    static content = {
        headers { $('thead th') }
        rows { $('tbody tr') }
        cells { $('tbody td') }
    }

    List<String> getHeaderTexts() {
        headers*.text()
    }

    int getRowCount() {
        rows.size()
    }

    String getCellText(int row, int col) {
        rows[row].find('td')[col].text()
    }

    void clickRow(int index) {
        rows[index].click()
    }

    void sortBy(String headerText) {
        headers.find { it.text() == headerText }.click()
    }
}
```

### Spock Test Specifications

```groovy
// src/test/groovy/specs/auth/LoginSpec.groovy
import geb.spock.GebReportingSpec
import pages.LoginPage
import pages.DashboardPage
import spock.lang.Unroll

class LoginSpec extends GebReportingSpec {

    def "should login successfully with valid credentials"() {
        given: "I am on the login page"
        to LoginPage

        when: "I enter valid credentials and submit"
        login('user@example.com', 'SecurePass123')

        then: "I should be on the dashboard"
        at DashboardPage
        welcomeMessage.text().contains('Welcome')
    }

    def "should show error for invalid credentials"() {
        given: "I am on the login page"
        to LoginPage

        when: "I enter invalid credentials"
        login('user@example.com', 'wrongpassword')

        then: "I should see an error message"
        at LoginPage
        waitFor { errorMessage.displayed }
        errorMessage.text() == 'Invalid credentials'
    }

    @Unroll
    def "should show validation error for email=#email, password=#password"() {
        given: "I am on the login page"
        to LoginPage

        when: "I enter invalid data"
        login(email, password)

        then: "I should see the error"
        waitFor { errorMessage.displayed }
        errorMessage.text() == expectedError

        where:
        email              | password        | expectedError
        ''                 | 'SecurePass123' | 'Email is required'
        'user@example.com' | ''              | 'Password is required'
        'invalid-email'    | 'SecurePass123' | 'Invalid email format'
    }

    def "should navigate to forgot password page"() {
        given: "I am on the login page"
        to LoginPage

        when: "I click forgot password"
        forgotPasswordLink.click()

        then: "I should be on the forgot password page"
        waitFor { browser.currentUrl.contains('/forgot-password') }
    }
}
```

### Advanced Navigator Usage

```groovy
// src/test/groovy/specs/shopping/CartSpec.groovy
import geb.spock.GebReportingSpec
import pages.CartPage
import pages.ProductPage

class CartSpec extends GebReportingSpec {

    def "should add product to cart"() {
        given: "I am on a product page"
        go '/products/laptop-pro'
        at ProductPage

        when: "I click add to cart"
        addToCartButton.click()

        then: "cart count should increase"
        waitFor { navBar.cartCount.text() == '1' }
    }

    def "should demonstrate navigator features"() {
        when: "using various navigator methods"
        go '/products'

        then: "jQuery-like selection works"
        // CSS selector
        $('div.product-card').size() > 0

        // Attribute selector
        $('input', name: 'search').displayed

        // Text content
        $('h1', text: 'Products').displayed

        // Index-based
        $('div.product-card', 0).displayed

        // Chaining
        $('div.product-card').find('button.add-to-cart').size() > 0

        // Filtering
        $('div.product-card').filter('.featured').size() >= 0

        // Traversing
        $('[data-testid="product-1"]').parent().hasClass('product-grid')

        // Multiple elements iteration
        $('div.product-card').collect { it.find('h3').text() }.size() > 0
    }

    def "should handle dynamic content with waitFor"() {
        given: "I am on the products page"
        go '/products'

        when: "I search for a product"
        $('input[type="search"]').value('laptop')
        $('button[type="submit"]').click()

        then: "results load dynamically"
        waitFor(15) { $('[data-testid="search-results"]').displayed }
        waitFor { $('div.product-card').size() > 0 }

        and: "I can interact with results"
        def firstProduct = $('div.product-card', 0)
        firstProduct.find('h3').text().toLowerCase().contains('laptop')
    }
}
```

### Form Handling

```groovy
// src/test/groovy/specs/forms/FormSpec.groovy
import geb.spock.GebReportingSpec

class FormSpec extends GebReportingSpec {

    def "should fill and submit a form"() {
        given: "I am on the registration form"
        go '/register'

        when: "I fill in all fields"
        $('[data-testid="name"]').value('John Doe')
        $('[data-testid="email"]').value('john@example.com')
        $('[data-testid="password"]').value('SecurePass123')

        // Select dropdown
        $('select[name="country"]').value('US')

        // Radio button
        $('input[name="gender"]', value: 'male').click()

        // Checkbox
        $('[data-testid="terms"]').value(true)

        // File upload
        $('input[type="file"]').value(new File('src/test/resources/avatar.jpg').absolutePath)

        // Textarea
        $('textarea[name="bio"]').value('A short biography')

        // Submit
        $('[data-testid="register-submit"]').click()

        then: "registration succeeds"
        waitFor { browser.currentUrl.contains('/welcome') }
    }
}
```

### Gradle Build Configuration

```groovy
// build.gradle
plugins {
    id 'groovy'
    id 'java'
}

ext {
    gebVersion = '7.0'
    seleniumVersion = '4.18.1'
    spockVersion = '2.3-groovy-4.0'
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation "org.gebish:geb-spock:${gebVersion}"
    testImplementation "org.gebish:geb-core:${gebVersion}"
    testImplementation "org.spockframework:spock-core:${spockVersion}"
    testImplementation "org.seleniumhq.selenium:selenium-chrome-driver:${seleniumVersion}"
    testImplementation "org.seleniumhq.selenium:selenium-firefox-driver:${seleniumVersion}"
    testImplementation "org.seleniumhq.selenium:selenium-support:${seleniumVersion}"
    testRuntimeOnly 'org.apache.groovy:groovy-all:4.0.18'
}

test {
    useJUnitPlatform()
    systemProperty 'geb.env', System.getProperty('geb.env', 'chrome')
    systemProperty 'geb.build.reportsDir', reporting.baseDir.toString() + '/geb'
}

tasks.register('smokeTest', Test) {
    useJUnitPlatform {
        includeTags 'smoke'
    }
}
```

### CI/CD Integration (GitHub Actions)

```yaml
name: Geb E2E Tests
on: [push, pull_request]

jobs:
  geb-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Start application
        run: ./gradlew bootRun &
      - name: Wait for app
        run: |
          for i in $(seq 1 30); do
            curl -s http://localhost:3000/health && break
            sleep 2
          done
      - name: Run Geb tests
        run: ./gradlew test -Dgeb.env=chrome
        env:
          BASE_URL: http://localhost:3000
          CI: true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: geb-reports
          path: build/reports/
```

## Best Practices

1. **Use `static content` blocks** in Page Objects for all element references. The content DSL provides lazy evaluation and automatic waiting.
2. **Define `at` checkers** on every Page class. Geb uses these to verify successful page navigation automatically.
3. **Use Modules** for reusable UI components. Navigation bars, modals, and tables should be modules embedded in Pages.
4. **Use `waitFor {}` for dynamic content** instead of `Thread.sleep()`. Geb polls the condition at configurable intervals.
5. **Use `required: false`** for optional content elements that may not be present on every page load.
6. **Use `GebReportingSpec`** as the base class to automatically capture page state (screenshots + HTML source) on test failure.
7. **Configure environments** in `GebConfig.groovy` for different browsers and execution contexts (local, CI, headless).
8. **Use Spock's `@Unroll`** with `where:` blocks for parameterized tests to test multiple data scenarios cleanly.
9. **Use `to` and `via`** for page navigation. `to LoginPage` navigates and verifies; `via LoginPage` just navigates.
10. **Keep Geb configuration separate** in `GebConfig.groovy`. Do not hardcode browser configuration in test classes.

## Anti-Patterns to Avoid

1. **Avoid raw `$()` calls in tests** — Encapsulate all selectors in Page content blocks. Raw selectors in specs break encapsulation.
2. **Avoid `Thread.sleep()`** — Use Geb's `waitFor {}` which polls intelligently. Fixed waits waste time or cause flakiness.
3. **Avoid missing `at` checkers** — Without `at` blocks, Geb cannot verify page transitions, leading to confusing failures.
4. **Avoid monolithic Page Objects** — Split large pages into Modules. A Page with 30+ content definitions needs decomposition.
5. **Avoid fragile CSS selectors** — Use `data-testid` attributes or meaningful selectors. Avoid `.btn:nth-child(3)`.
6. **Avoid test coupling** — Each spec should be independent. Do not rely on test execution order or shared browser state.
7. **Avoid hardcoded base URLs** — Use `GebConfig.groovy` and environment variables. Hardcoded URLs break portability.
8. **Avoid ignoring Geb's Navigator API** — Geb's `$()` provides powerful querying (filtering, traversal, text matching). Learn and use it fully.
9. **Avoid missing `required: false`** — Content that may not exist must use `required: false` or tests fail with `RequiredPageContentNotPresent`.
10. **Avoid testing in a single browser only** — Use Geb's environment configuration to run tests across Chrome, Firefox, and headless modes.
