import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide: Concise Java UI Testing Guide',
  description:
    'Learn Selenide for concise Java UI testing with smart waits, fluent API, collections, page objects, automatic screenshots, and Allure reporting integration.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
## Introduction to Selenide

Selenide is a concise, elegant wrapper around Selenium WebDriver for Java and Kotlin. Created by Andrei Solntsev, Selenide addresses the most common pain points of raw Selenium: verbose syntax, manual waits, and complex setup. Where Selenium requires dozens of lines to perform a simple action with proper waiting and error handling, Selenide achieves the same in one or two lines.

The framework provides smart waits that automatically handle timing issues, a fluent API that reads like natural language, automatic screenshots on failure, and seamless integration with popular reporting tools like Allure. Selenide is not a replacement for Selenium but rather an enhancement layer that makes Selenium-based testing dramatically more productive.

In this guide, we will compare Selenide to raw Selenium, explore its concise API in depth, cover collections, page objects, configuration, and show how to integrate with Allure for comprehensive test reporting.

---

## Selenide vs Selenium: A Direct Comparison

The best way to understand Selenide's value is to see the same test written in both frameworks.

### Raw Selenium

\`\`\`java
// Selenium: Login test
public class LoginTestSelenium {
    private WebDriver driver;
    private WebDriverWait wait;

    @BeforeEach
    void setUp() {
        WebDriverManager.chromedriver().setup();
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new");
        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        driver.manage().window().setSize(
            new Dimension(1440, 900));
    }

    @Test
    void userCanLogin() {
        driver.get("https://example.com/login");

        wait.until(ExpectedConditions
            .visibilityOfElementLocated(By.id("email")));
        WebElement emailField = driver.findElement(
            By.id("email"));
        emailField.clear();
        emailField.sendKeys("alice@example.com");

        WebElement passwordField = driver.findElement(
            By.id("password"));
        passwordField.clear();
        passwordField.sendKeys("SecurePass123!");

        WebElement loginButton = driver.findElement(
            By.cssSelector("[data-testid='login-button']"));
        wait.until(ExpectedConditions
            .elementToBeClickable(loginButton));
        loginButton.click();

        wait.until(ExpectedConditions
            .visibilityOfElementLocated(
                By.className("welcome-message")));
        WebElement welcome = driver.findElement(
            By.className("welcome-message"));
        assertEquals("Welcome, Alice", welcome.getText());
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
\`\`\`

### Selenide

\`\`\`java
// Selenide: Same login test
public class LoginTestSelenide {
    @Test
    void userCanLogin() {
        open("https://example.com/login");

        $("#email").setValue("alice@example.com");
        $("#password").setValue("SecurePass123!");
        $("[data-testid='login-button']").click();

        $(".welcome-message")
            .shouldHave(text("Welcome, Alice"));
    }
}
\`\`\`

The Selenide version is dramatically shorter and more readable. There is no driver setup, no explicit waits, no teardown code, and no null checks. Selenide handles all of this automatically.

---

## Setting Up Selenide

### Maven Configuration

\`\`\`xml
<dependencies>
    <dependency>
        <groupId>com.codeborne</groupId>
        <artifactId>selenide</artifactId>
        <version>7.2.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.10.2</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>io.qameta.allure</groupId>
        <artifactId>allure-selenide</artifactId>
        <version>2.25.0</version>
        <scope>test</scope>
    </dependency>
</dependencies>
\`\`\`

### Gradle Configuration

\`\`\`groovy
dependencies {
    testImplementation 'com.codeborne:selenide:7.2.0'
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.2'
    testImplementation 'io.qameta.allure:allure-selenide:2.25.0'
}

test {
    useJUnitPlatform()
    systemProperty 'selenide.browser', 'chrome'
    systemProperty 'selenide.headless', 'true'
}
\`\`\`

### Configuration Options

Selenide can be configured through system properties, a configuration file, or programmatically:

\`\`\`java
import com.codeborne.selenide.Configuration;

// Programmatic configuration
Configuration.browser = "chrome";
Configuration.headless = true;
Configuration.baseUrl = "https://example.com";
Configuration.timeout = 8000; // milliseconds
Configuration.browserSize = "1440x900";
Configuration.screenshots = true;
Configuration.savePageSource = false;
Configuration.reportsFolder = "build/reports/tests";
Configuration.downloadsFolder = "build/downloads";

// Or via system properties
// -Dselenide.browser=chrome
// -Dselenide.headless=true
// -Dselenide.baseUrl=https://example.com
\`\`\`

---

## The Selenide API

### Element Selection

Selenide provides short, expressive methods for finding elements:

\`\`\`java
import static com.codeborne.selenide.Selenide.*;
import static com.codeborne.selenide.Selectors.*;

// CSS selectors (most common)
\$("#email")                          // by ID
\$(".product-card")                   // by class
\$("[data-testid='submit']")          // by attribute
\$("input[type='email']")             // by CSS selector

// By text content
\$(byText("Add to Cart"))             // exact text
\$(withText("Add to"))                // partial text

// By various attributes
\$(byId("email"))
\$(byName("username"))
\$(byClassName("error-message"))
\$(byAttribute("role", "alert"))

// XPath (when CSS is insufficient)
\$(byXpath("//div[@class='menu']//a"))

// Chaining selectors
\$(".product-card").\$(".price")
\$("#sidebar").\$(".nav-link", 2)     // third nav-link
\`\`\`

### Element Actions

\`\`\`java
// Input actions
\$("#email").setValue("alice@example.com");
\$("#email").append(" extra text");
\$("#search").pressEnter();
\$("#field").pressTab();
\$("#field").pressEscape();
\$("#field").clear();

// Click actions
\$(".submit-button").click();
\$(".menu-item").doubleClick();
\$(".card").contextClick();          // right-click
\$(".item").hover();

// Scrolling
\$(".footer").scrollTo();
\$(".element").scrollIntoView(true);
\$(".container").scrollIntoView(
    "{behavior: 'smooth', block: 'center'}");

// Drag and drop
\$(".source").dragAndDrop(
    DragAndDropOptions.to(\$(".target")));

// File upload
\$("input[type='file']").uploadFile(
    new File("test-data/report.pdf"));
\$("input[type='file']").uploadFromClasspath(
    "test-data/avatar.png");

// Select dropdowns
\$("select#country").selectOption("United States");
\$("select#country").selectOptionByValue("US");
\$("select#country").selectOptionContainingText("United");
\`\`\`

### Assertions (Conditions)

Selenide assertions are called conditions. They automatically wait for the condition to be satisfied:

\`\`\`java
import static com.codeborne.selenide.Condition.*;

// Visibility
\$(".welcome").shouldBe(visible);
\$(".spinner").shouldBe(hidden);
\$(".spinner").shouldNotBe(visible);
\$(".modal").should(appear);
\$(".toast").should(disappear);

// Text content
\$("h1").shouldHave(text("Dashboard"));
\$("h1").shouldHave(exactText("My Dashboard"));
\$("h1").shouldHave(textCaseSensitive("Dashboard"));
\$(".status").shouldHave(
    matchText("Order #\\\\d+ confirmed"));
\$(".message").shouldNotHave(text("Error"));

// Attributes and properties
\$("input").shouldHave(value("alice@example.com"));
\$("input").shouldHave(attribute("placeholder", "Email"));
\$(".card").shouldHave(cssClass("active"));
\$("button").shouldBe(enabled);
\$("button").shouldBe(disabled);
\$("input").shouldBe(readonly);
\$("input").shouldBe(focused);
\$("input[type='checkbox']").shouldBe(checked);

// Existence in DOM
\$(".element").should(exist);
\$(".element").shouldNot(exist);

// CSS values
\$(".alert").shouldHave(
    cssValue("background-color", "rgb(255, 0, 0)"));

// Custom timeout for specific assertion
\$(".slow-load").shouldBe(visible,
    Duration.ofSeconds(30));
\`\`\`

### Getting Element Properties

\`\`\`java
// Read values (no waiting, returns current state)
String text = \$("h1").getText();
String value = \$("input").getValue();
String attr = \$("a").getAttribute("href");
String css = \$(".box").getCssValue("color");
String name = \$("input").name();
boolean isDisplayed = \$(".element").isDisplayed();
boolean exists = \$(".element").exists();
\`\`\`

---

## Collections

Selenide provides a powerful API for working with collections of elements:

\`\`\`java
import static com.codeborne.selenide.CollectionCondition.*;

// Select collections
ElementsCollection products = \$\$(".product-card");
ElementsCollection rows = \$\$("table tbody tr");

// Collection assertions
\$\$(".product-card").shouldHave(size(5));
\$\$(".product-card").shouldHave(sizeGreaterThan(0));
\$\$(".product-card").shouldHave(sizeLessThan(20));
\$\$(".product-card").shouldHave(
    sizeGreaterThanOrEqual(1));

// Text assertions on collections
\$\$(".nav-link").shouldHave(texts(
    "Home", "Products", "About", "Contact"));
\$\$(".nav-link").shouldHave(exactTexts(
    "Home", "Products", "About Us", "Contact"));
\$\$(".error").shouldHave(
    itemWithText("Email is required"));

// Filtering collections
\$\$(".product-card")
    .filterBy(text("Wireless"))
    .shouldHave(size(2));

\$\$(".product-card")
    .excludeWith(cssClass("out-of-stock"))
    .shouldHave(sizeGreaterThan(0));

// Accessing specific elements
\$\$(".product-card").first()
    .shouldHave(text("Featured Product"));
\$\$(".product-card").last()
    .shouldHave(text("Last Product"));
\$\$(".product-card").get(2)
    .shouldHave(text("Third Product"));

// Iterating
\$\$(".product-card").forEach(card -> {
    card.\$(".price").shouldBe(visible);
    card.\$(".name").shouldBe(visible);
});

// Mapping to values
List<String> names = \$\$(".product-card .name")
    .texts();
List<String> prices = \$\$(".product-card .price")
    .attributes("data-price");

// Snapshot (freezes collection for assertions)
ElementsCollection snapshot = \$\$(".item").snapshot();
\`\`\`

---

## Smart Waits

Selenide's automatic waiting is one of its defining features. Unlike raw Selenium where you must explicitly wait for conditions, Selenide waits are built into every operation.

### How Smart Waits Work

When you write \`\$(".element").shouldBe(visible)\`, Selenide:

1. Looks for the element in the DOM
2. If not found, waits and retries
3. If found but not visible, waits and retries
4. Continues until the condition is met or the timeout expires
5. On timeout, throws a clear error with the element selector, expected condition, and actual state

### Configuring Timeouts

\`\`\`java
// Global default timeout
Configuration.timeout = 8000; // 8 seconds

// Per-assertion timeout
\$(".slow-element").shouldBe(visible,
    Duration.ofSeconds(30));

// For collections
\$\$(".results").shouldHave(sizeGreaterThan(0),
    Duration.ofSeconds(15));

// Polling interval (how often to retry)
Configuration.pollingInterval = 200; // milliseconds
\`\`\`

### Waiting for Custom Conditions

\`\`\`java
// Wait for a specific condition
Wait().until(webdriver ->
    \$(".counter").getText().equals("10"));

// Custom condition
Condition loaded = new Condition("loaded") {
    @Override
    public boolean apply(Driver driver,
            WebElement element) {
        return element.getAttribute("data-loaded")
            .equals("true");
    }
};

\$(".content").shouldBe(loaded);
\`\`\`

---

## Page Objects with Selenide

Selenide simplifies the Page Object pattern by eliminating factory initialization:

\`\`\`java
import com.codeborne.selenide.SelenideElement;
import static com.codeborne.selenide.Selenide.*;
import static com.codeborne.selenide.Condition.*;

public class LoginPage {
    private final SelenideElement emailField = \$("#email");
    private final SelenideElement passwordField =
        \$("#password");
    private final SelenideElement loginButton =
        \$("[data-testid='login-button']");
    private final SelenideElement errorMessage =
        \$(".error-message");
    private final SelenideElement welcomeMessage =
        \$(".welcome-message");

    public LoginPage open() {
        Selenide.open("/login");
        return this;
    }

    public DashboardPage loginAs(
            String email, String password) {
        emailField.setValue(email);
        passwordField.setValue(password);
        loginButton.click();
        welcomeMessage.shouldBe(visible);
        return new DashboardPage();
    }

    public LoginPage loginExpectingError(
            String email, String password) {
        emailField.setValue(email);
        passwordField.setValue(password);
        loginButton.click();
        errorMessage.shouldBe(visible);
        return this;
    }

    public String getErrorMessage() {
        return errorMessage.getText();
    }
}
\`\`\`

\`\`\`java
public class DashboardPage {
    private final SelenideElement welcomeMessage =
        \$(".welcome-message");
    private final SelenideElement userMenu =
        \$(".user-menu");
    private final SelenideElement notificationBadge =
        \$(".notification-badge");

    public String getWelcomeText() {
        return welcomeMessage.getText();
    }

    public DashboardPage shouldShowWelcome(String name) {
        welcomeMessage.shouldHave(
            text("Welcome, " + name));
        return this;
    }

    public int getNotificationCount() {
        if (notificationBadge.exists()) {
            return Integer.parseInt(
                notificationBadge.getText());
        }
        return 0;
    }
}
\`\`\`

### Using Page Objects in Tests

\`\`\`java
class LoginTests {
    private final LoginPage loginPage = new LoginPage();

    @Test
    void successfulLogin() {
        loginPage.open()
            .loginAs("alice@example.com", "SecurePass123!")
            .shouldShowWelcome("Alice");
    }

    @Test
    void failedLoginShowsError() {
        loginPage.open()
            .loginExpectingError(
                "alice@example.com", "wrong-password");

        assertThat(loginPage.getErrorMessage())
            .isEqualTo("Invalid email or password");
    }
}
\`\`\`

### Page Components

For reusable UI components that appear on multiple pages:

\`\`\`java
public class NavigationBar {
    private final SelenideElement root = \$("nav.main-nav");

    public void navigateTo(String section) {
        root.\$(byText(section)).click();
    }

    public void search(String query) {
        root.\$(".search-input").setValue(query).pressEnter();
    }

    public String getCurrentSection() {
        return root.\$(".active").getText();
    }
}

public class ProductsPage {
    private final NavigationBar nav = new NavigationBar();
    private final ElementsCollection products =
        \$\$(".product-card");

    public void searchProducts(String query) {
        nav.search(query);
    }

    public void selectProduct(String name) {
        products.findBy(text(name)).click();
    }
}
\`\`\`

---

## Automatic Screenshots

Selenide automatically captures screenshots on test failure. This is enabled by default and requires no configuration.

### Screenshot Configuration

\`\`\`java
// Enable/disable screenshots
Configuration.screenshots = true;

// Set screenshot directory
Configuration.reportsFolder = "build/reports/selenide";

// Save page source alongside screenshots
Configuration.savePageSource = true;
\`\`\`

### Manual Screenshots

\`\`\`java
// Take a screenshot at any point
String path = Screenshots.takeScreenShot("step-name");

// Full page screenshot
screenshot("checkout-page");

// Element screenshot
\$(".product-card").screenshot();
\`\`\`

### JUnit 5 Integration for Screenshots

\`\`\`java
import com.codeborne.selenide.junit5.ScreenShooterExtension;

@ExtendWith(ScreenShooterExtension.class)
class ProductTests {
    // Screenshots automatically captured on failure

    @Test
    void productPageShowsDetails() {
        open("/products/123");
        \$("h1").shouldHave(text("Product Details"));
        \$(".price").shouldBe(visible);
    }
}
\`\`\`

---

## Allure Reporting Integration

Allure produces rich, interactive test reports with step details, attachments, and categorization.

### Setup

\`\`\`java
// In your test base class or BeforeAll
@BeforeAll
static void setupAllure() {
    SelenideLogger.addListener(
        "AllureSelenide",
        new AllureSelenide()
            .screenshots(true)
            .savePageSource(false)
            .includeSelenideSteps(true)
    );
}
\`\`\`

### Annotated Tests

\`\`\`java
import io.qameta.allure.*;

@Epic("E-Commerce")
@Feature("Shopping Cart")
class CartTests {

    @Test
    @Story("Add items to cart")
    @Description("Verify that users can add products to "
        + "their shopping cart from the catalog page")
    @Severity(SeverityLevel.CRITICAL)
    @Link(name = "JIRA-1234",
        url = "https://jira.example.com/browse/JIRA-1234")
    void addProductToCart() {
        step("Open the product catalog", () -> {
            open("/products");
        });

        step("Search for a wireless mouse", () -> {
            \$(".search-input").setValue("Wireless Mouse")
                .pressEnter();
        });

        step("Add the first result to the cart", () -> {
            \$\$(".product-card").first()
                .\$(".add-to-cart").click();
        });

        step("Verify cart shows one item", () -> {
            \$(".cart-badge").shouldHave(text("1"));
        });

        step("Open the cart", () -> {
            \$(".cart-icon").click();
        });

        step("Verify the product is in the cart", () -> {
            \$\$(".cart-item").shouldHave(size(1));
            \$(".cart-item").shouldHave(
                text("Wireless Mouse"));
        });
    }
}
\`\`\`

### Generating Allure Reports

\`\`\`bash
# Run tests and collect results
mvn clean test

# Generate the report
mvn allure:serve    # opens in browser
mvn allure:report   # generates static HTML
\`\`\`

### Custom Allure Attachments

\`\`\`java
@Attachment(value = "Page screenshot",
    type = "image/png")
public byte[] saveScreenshot() {
    return Screenshots.takeScreenShotAsBytes();
}

@Attachment(value = "Browser logs",
    type = "text/plain")
public String saveBrowserLogs() {
    return String.join("\\n",
        Selenide.getWebDriverLogs(
            LogType.BROWSER));
}
\`\`\`

---

## Advanced Features

### File Downloads

\`\`\`java
// Configure downloads directory
Configuration.downloadsFolder = "build/downloads";

// Download a file
File report = \$("a.download-report").download();
assertThat(report.getName()).endsWith(".pdf");
assertThat(report.length())
    .isGreaterThan(0);

// Download with timeout
File largeFile = \$("a.download-dataset")
    .download(Duration.ofSeconds(60));
\`\`\`

### Frames and Windows

\`\`\`java
// Switch to iframe
switchTo().frame("payment-frame");
\$("#card-number").setValue("4111111111111111");
switchTo().defaultContent();

// New windows
String mainWindow = WebDriverRunner.getWebDriver()
    .getWindowHandle();
\$("a.external-link").click();
switchTo().window(1);
\$("h1").shouldHave(text("External Page"));
switchTo().window(mainWindow);
\`\`\`

### Browser Management

\`\`\`java
// Execute JavaScript
executeJavaScript(
    "window.scrollTo(0, document.body.scrollHeight)");
long scrollY = executeJavaScript(
    "return window.scrollY");

// Manage cookies
WebDriverRunner.getWebDriver().manage()
    .addCookie(new Cookie("session", "abc123"));
WebDriverRunner.getWebDriver().manage()
    .deleteAllCookies();

// Local storage
localStorage().setItem("theme", "dark");
String theme = localStorage().getItem("theme");
localStorage().removeItem("theme");

// Session storage
sessionStorage().setItem("token", "xyz");
\`\`\`

### Proxy Support

\`\`\`java
Configuration.proxyEnabled = true;
Configuration.proxyHost = "localhost";
Configuration.proxyPort = 8888;

// Or use Selenide's built-in proxy
// for network interception
Configuration.proxyEnabled = true;

// In tests, intercept requests
// (requires BrowserMobProxy setup)
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: Selenide UI Tests

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

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Chrome
        uses: browser-actions/setup-chrome@v1

      - name: Run Selenide tests
        run: mvn clean test
        env:
          SELENIDE_BROWSER: chrome
          SELENIDE_HEADLESS: 'true'

      - name: Generate Allure report
        if: always()
        run: mvn allure:report

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-reports
          path: |
            build/reports/
            target/site/allure-maven-plugin/
\`\`\`

---

## Selenide vs Other Frameworks

### When to Choose Selenide

Selenide is the best choice when:

- You want maximum productivity with minimum boilerplate
- Your team uses Java or Kotlin
- You need reliable, non-flaky tests with automatic waiting
- You value readable test code that serves as documentation
- You want automatic screenshots without configuration

### When to Consider Alternatives

Consider Playwright or Cypress when:

- You need cross-browser testing beyond Chrome and Firefox
- Your team primarily works in JavaScript or TypeScript
- You need built-in API testing capabilities
- You require network interception for complex mocking scenarios

---

## Best Practices

### Use Data-TestId Attributes

\`\`\`java
// Prefer stable test selectors
\$("[data-testid='submit-order']").click();

// Avoid fragile selectors
\$(".btn.btn-primary.mt-3").click();          // CSS class
\$(byXpath("//div[3]/form/button[2]")).click(); // position
\`\`\`

### Keep Tests Independent

Each test should set up its own state and not depend on other tests:

\`\`\`java
@Test
void addProductToCart() {
    // Arrange
    open("/products");

    // Act
    \$\$(".product-card").first()
        .\$("[data-testid='add-to-cart']").click();

    // Assert
    \$(".cart-badge").shouldHave(text("1"));
}
\`\`\`

### Use Soft Assertions for Multiple Checks

\`\`\`java
import com.codeborne.selenide.junit5.SoftAssertsExtension;

@ExtendWith(SoftAssertsExtension.class)
class ProductPageTests {

    @Test
    void productPageShowsAllDetails() {
        open("/products/wireless-mouse");

        // All assertions run even if some fail
        \$("h1").shouldHave(text("Wireless Mouse"));
        \$(".price").shouldHave(text("\$29.99"));
        \$(".rating").shouldBe(visible);
        \$(".description").shouldNotBe(empty);
        \$(".add-to-cart").shouldBe(enabled);
    }
}
\`\`\`

---

## Conclusion

Selenide transforms Java UI testing from a verbose, error-prone chore into a concise, reliable practice. By handling browser setup, smart waits, and screenshot capture automatically, it lets you focus on what matters: describing and verifying application behavior.

The framework's concise API, combined with powerful collection support, clean page objects, and seamless Allure integration, makes it one of the best choices for Java teams doing browser-based testing. If you are writing Selenium tests in Java and fighting with explicit waits, stale element exceptions, and screenshot configuration, Selenide is the upgrade your test suite needs.
`,
};
