import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Tutorial for Beginners: Complete Guide with Java and Python in 2026',
  description:
    'Master Selenium WebDriver with this complete beginner tutorial. Covers setup, locator strategies, waits, Page Object Model, handling alerts and frames, headless mode, and Grid setup with Java and Python examples.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
Selenium remains the most widely adopted browser automation framework in the world. With support for every major programming language, a massive community, and deep integration with CI/CD systems, learning Selenium in 2026 is still one of the best investments a QA engineer can make. This guide walks you through everything from initial setup to advanced patterns, with side-by-side Java and Python examples throughout.

## Table of Contents

1. Why Selenium in 2026
2. Setting Up Selenium with Java
3. Setting Up Selenium with Python
4. Your First Selenium Test
5. Understanding Locator Strategies
6. Working with Waits
7. Page Object Model Pattern
8. Handling Dropdowns
9. Handling Alerts and Popups
10. Working with Frames and iFrames
11. Managing Multiple Windows and Tabs
12. Taking Screenshots
13. Running Tests in Headless Mode
14. Setting Up Selenium Grid
15. Best Practices and Common Mistakes
16. Integrating with QA Skills

---

## 1. Why Selenium in 2026

Selenium has been around since 2004, and it continues to dominate the browser automation landscape for several important reasons. It supports Java, Python, C#, JavaScript, Ruby, and Kotlin. It works across Chrome, Firefox, Safari, and Edge. It integrates with virtually every CI/CD system, and it has the largest community of any test automation tool.

While newer tools like Playwright and Cypress have gained popularity, Selenium still powers the majority of enterprise test suites. Understanding Selenium is essential for anyone working in QA, whether you are maintaining legacy test suites or building new ones.

**When to choose Selenium:**
- Your team already uses Java or Python extensively
- You need to support older browsers or niche browser configurations
- You are working with an existing Selenium test suite
- You need maximum language and framework flexibility
- Your organization has invested in Selenium Grid infrastructure

**When to consider alternatives:**
- You are starting a greenfield project and want built-in auto-waiting
- You primarily test modern single-page applications
- You want built-in API testing capabilities alongside E2E tests

---

## 2. Setting Up Selenium with Java

### Prerequisites

You need the Java Development Kit (JDK) 11 or higher and either Maven or Gradle for dependency management. We will use Maven in this guide.

### Step 1: Create a Maven Project

Create a new Maven project with the following \`pom.xml\` dependencies:

\`\`\`xml
<dependencies>
    <!-- Selenium WebDriver -->
    <dependency>
        <groupId>org.seleniumhq.selenium</groupId>
        <artifactId>selenium-java</artifactId>
        <version>4.27.0</version>
    </dependency>

    <!-- TestNG for test execution -->
    <dependency>
        <groupId>org.testng</groupId>
        <artifactId>testng</artifactId>
        <version>7.10.2</version>
        <scope>test</scope>
    </dependency>

    <!-- WebDriverManager for automatic driver management -->
    <dependency>
        <groupId>io.github.bonigarcia</groupId>
        <artifactId>webdrivermanager</artifactId>
        <version>5.9.2</version>
    </dependency>
</dependencies>
\`\`\`

### Step 2: Verify Installation

Create a simple test class to verify everything is working:

\`\`\`java
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import io.github.bonigarcia.wdm.WebDriverManager;

public class SetupTest {
    public static void main(String[] args) {
        WebDriverManager.chromedriver().setup();
        WebDriver driver = new ChromeDriver();
        driver.get("https://www.google.com");
        System.out.println("Title: " + driver.getTitle());
        driver.quit();
    }
}
\`\`\`

Starting with Selenium 4.6+, the Selenium Manager handles driver binaries automatically. You may not even need WebDriverManager anymore, but it remains useful for advanced driver configuration.

---

## 3. Setting Up Selenium with Python

### Step 1: Install Selenium

\`\`\`bash
pip install selenium
\`\`\`

For test execution, install pytest as well:

\`\`\`bash
pip install pytest
\`\`\`

### Step 2: Verify Installation

\`\`\`python
from selenium import webdriver

driver = webdriver.Chrome()
driver.get("https://www.google.com")
print(f"Title: {driver.title}")
driver.quit()
\`\`\`

Selenium 4+ includes Selenium Manager which automatically downloads the correct browser driver. No manual chromedriver installation required.

---

## 4. Your First Selenium Test

Let us write a real test that navigates to a page, interacts with elements, and verifies results.

### Java Version (TestNG)

\`\`\`java
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

public class FirstTest {
    private WebDriver driver;

    @BeforeMethod
    public void setUp() {
        driver = new ChromeDriver();
        driver.manage().window().maximize();
    }

    @Test
    public void testSearchFunctionality() {
        driver.get("https://www.saucedemo.com/");

        WebElement username = driver.findElement(By.id("user-name"));
        WebElement password = driver.findElement(By.id("password"));
        WebElement loginButton = driver.findElement(By.id("login-button"));

        username.sendKeys("standard_user");
        password.sendKeys("secret_sauce");
        loginButton.click();

        String pageTitle = driver.findElement(
            By.className("title")
        ).getText();
        Assert.assertEquals(pageTitle, "Products");
    }

    @AfterMethod
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
\`\`\`

### Python Version (pytest)

\`\`\`python
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By


@pytest.fixture
def driver():
    d = webdriver.Chrome()
    d.maximize_window()
    yield d
    d.quit()


def test_login_functionality(driver):
    driver.get("https://www.saucedemo.com/")

    driver.find_element(By.ID, "user-name").send_keys("standard_user")
    driver.find_element(By.ID, "password").send_keys("secret_sauce")
    driver.find_element(By.ID, "login-button").click()

    page_title = driver.find_element(By.CLASS_NAME, "title").text
    assert page_title == "Products"
\`\`\`

**Key takeaways from this example:**
- Always use \`driver.quit()\` in teardown to close the browser and end the WebDriver session
- Use \`maximize_window()\` for consistent test execution
- Structure tests with setup, action, and assertion phases
- Use fixtures (pytest) or annotations (TestNG) for reusable setup and teardown

---

## 5. Understanding Locator Strategies

Choosing the right locator strategy is one of the most critical decisions in Selenium testing. A fragile locator leads to flaky tests that break whenever the UI changes.

### Locator Priority (Best to Worst)

| Priority | Locator | Resilience | Speed |
|----------|---------|------------|-------|
| 1 | ID | High | Fast |
| 2 | Name | High | Fast |
| 3 | CSS Selector | Medium-High | Fast |
| 4 | XPath | Medium | Slower |
| 5 | Link Text | Medium | Fast |
| 6 | Tag Name | Low | Fast |
| 7 | Class Name | Low | Fast |

### ID Locator

The most reliable locator when IDs are available and stable.

**Java:**
\`\`\`java
WebElement element = driver.findElement(By.id("submit-button"));
\`\`\`

**Python:**
\`\`\`python
element = driver.find_element(By.ID, "submit-button")
\`\`\`

### CSS Selectors

CSS selectors are fast and versatile. They should be your default choice when IDs are not available.

**Java:**
\`\`\`java
// By class
driver.findElement(By.cssSelector(".product-card"));

// By attribute
driver.findElement(By.cssSelector("[data-testid='checkout-btn']"));

// Nested elements
driver.findElement(By.cssSelector("div.cart > ul > li:first-child"));

// Multiple conditions
driver.findElement(By.cssSelector("input[type='email'][required]"));
\`\`\`

**Python:**
\`\`\`python
# By class
driver.find_element(By.CSS_SELECTOR, ".product-card")

# By attribute
driver.find_element(By.CSS_SELECTOR, "[data-testid='checkout-btn']")

# Nested elements
driver.find_element(By.CSS_SELECTOR, "div.cart > ul > li:first-child")

# Multiple conditions
driver.find_element(By.CSS_SELECTOR, "input[type='email'][required]")
\`\`\`

### XPath Locators

XPath is powerful for complex traversals but slower than CSS selectors. Use it when CSS selectors cannot express what you need.

**Java:**
\`\`\`java
// Absolute XPath (avoid this)
driver.findElement(By.xpath("/html/body/div/form/input"));

// Relative XPath (preferred)
driver.findElement(By.xpath("//input[@name='email']"));

// Text-based
driver.findElement(By.xpath("//button[text()='Submit']"));

// Contains text
driver.findElement(By.xpath("//span[contains(text(),'Welcome')]"));

// Parent traversal (CSS cannot do this)
driver.findElement(By.xpath("//td[text()='Price']/following-sibling::td"));
\`\`\`

**Python:**
\`\`\`python
# Relative XPath
driver.find_element(By.XPATH, "//input[@name='email']")

# Text-based
driver.find_element(By.XPATH, "//button[text()='Submit']")

# Contains text
driver.find_element(By.XPATH, "//span[contains(text(),'Welcome')]")

# Parent traversal
driver.find_element(By.XPATH, "//td[text()='Price']/following-sibling::td")
\`\`\`

### Relative Locators (Selenium 4+)

Selenium 4 introduced relative locators that find elements based on their visual position relative to other elements.

**Java:**
\`\`\`java
import static org.openqa.selenium.support.locators.RelativeLocator.with;

// Find the input field near the "Email" label
WebElement emailInput = driver.findElement(
    with(By.tagName("input")).near(By.id("email-label"))
);

// Find the element below a heading
WebElement content = driver.findElement(
    with(By.tagName("div")).below(By.tagName("h2"))
);

// Find element to the right of a label
WebElement field = driver.findElement(
    with(By.tagName("input")).toRightOf(By.xpath("//label[text()='Name']"))
);
\`\`\`

**Python:**
\`\`\`python
from selenium.webdriver.support.relative_locator import locate_with

# Find input near the email label
email_input = driver.find_element(
    locate_with(By.TAG_NAME, "input").near({By.ID: "email-label"})
)

# Find element below a heading
content = driver.find_element(
    locate_with(By.TAG_NAME, "div").below({By.TAG_NAME: "h2"})
)
\`\`\`

---

## 6. Working with Waits

Improper wait handling is the number one cause of flaky Selenium tests. Understanding the three types of waits is essential.

### Implicit Wait

Sets a global timeout for all element lookups. If an element is not found immediately, Selenium will keep trying until the timeout expires.

**Java:**
\`\`\`java
driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
\`\`\`

**Python:**
\`\`\`python
driver.implicitly_wait(10)
\`\`\`

**Warning:** Implicit waits apply globally and can mask performance issues. They also conflict with explicit waits. Most experts recommend avoiding implicit waits entirely.

### Explicit Wait

Waits for a specific condition before proceeding. This is the recommended approach for most scenarios.

**Java:**
\`\`\`java
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;

WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

// Wait for element to be visible
WebElement element = wait.until(
    ExpectedConditions.visibilityOfElementLocated(By.id("result"))
);

// Wait for element to be clickable
WebElement button = wait.until(
    ExpectedConditions.elementToBeClickable(By.id("submit"))
);

// Wait for text to be present
wait.until(
    ExpectedConditions.textToBePresentInElementLocated(
        By.id("status"), "Complete"
    )
);

// Wait for URL to contain a string
wait.until(ExpectedConditions.urlContains("/dashboard"));

// Wait for element to disappear
wait.until(
    ExpectedConditions.invisibilityOfElementLocated(By.id("spinner"))
);
\`\`\`

**Python:**
\`\`\`python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

wait = WebDriverWait(driver, 10)

# Wait for element to be visible
element = wait.until(
    EC.visibility_of_element_located((By.ID, "result"))
)

# Wait for element to be clickable
button = wait.until(
    EC.element_to_be_clickable((By.ID, "submit"))
)

# Wait for text to be present
wait.until(
    EC.text_to_be_present_in_element((By.ID, "status"), "Complete")
)

# Wait for URL to contain a string
wait.until(EC.url_contains("/dashboard"))

# Wait for element to disappear
wait.until(
    EC.invisibility_of_element_located((By.ID, "spinner"))
)
\`\`\`

### Fluent Wait

A more configurable version of explicit wait. You can set polling intervals and specify which exceptions to ignore.

**Java:**
\`\`\`java
import org.openqa.selenium.support.ui.FluentWait;

Wait<WebDriver> fluentWait = new FluentWait<>(driver)
    .withTimeout(Duration.ofSeconds(30))
    .pollingEvery(Duration.ofMillis(500))
    .ignoring(NoSuchElementException.class)
    .ignoring(StaleElementReferenceException.class);

WebElement element = fluentWait.until(d ->
    d.findElement(By.id("dynamic-content"))
);
\`\`\`

**Python:**
\`\`\`python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import (
    NoSuchElementException,
    StaleElementReferenceException
)

fluent_wait = WebDriverWait(
    driver,
    timeout=30,
    poll_frequency=0.5,
    ignored_exceptions=[
        NoSuchElementException,
        StaleElementReferenceException
    ]
)

element = fluent_wait.until(
    EC.presence_of_element_located((By.ID, "dynamic-content"))
)
\`\`\`

### Wait Strategy Comparison

| Wait Type | Scope | Configurability | Recommendation |
|-----------|-------|-----------------|----------------|
| Implicit | Global | Low | Avoid |
| Explicit | Per condition | Medium | Default choice |
| Fluent | Per condition | High | Complex scenarios |
| Thread.sleep | Global | None | Never use in tests |

---

## 7. Page Object Model Pattern

The Page Object Model (POM) is the most important design pattern for maintainable Selenium tests. It separates page-specific selectors and actions from test logic.

### Java Implementation

**LoginPage.java:**
\`\`\`java
public class LoginPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    // Locators
    private final By usernameField = By.id("user-name");
    private final By passwordField = By.id("password");
    private final By loginButton = By.id("login-button");
    private final By errorMessage = By.cssSelector("[data-test='error']");

    public LoginPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public LoginPage navigate() {
        driver.get("https://www.saucedemo.com/");
        return this;
    }

    public ProductsPage loginAs(String username, String password) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(usernameField))
            .sendKeys(username);
        driver.findElement(passwordField).sendKeys(password);
        driver.findElement(loginButton).click();
        return new ProductsPage(driver);
    }

    public String getErrorMessage() {
        return wait.until(
            ExpectedConditions.visibilityOfElementLocated(errorMessage)
        ).getText();
    }
}
\`\`\`

**LoginTest.java:**
\`\`\`java
public class LoginTest {
    private WebDriver driver;
    private LoginPage loginPage;

    @BeforeMethod
    public void setUp() {
        driver = new ChromeDriver();
        loginPage = new LoginPage(driver);
    }

    @Test
    public void testSuccessfulLogin() {
        ProductsPage products = loginPage
            .navigate()
            .loginAs("standard_user", "secret_sauce");
        Assert.assertEquals(products.getTitle(), "Products");
    }

    @Test
    public void testInvalidCredentials() {
        loginPage.navigate().loginAs("invalid", "invalid");
        String error = loginPage.getErrorMessage();
        Assert.assertTrue(error.contains("do not match"));
    }

    @AfterMethod
    public void tearDown() {
        driver.quit();
    }
}
\`\`\`

### Python Implementation

**pages/login_page.py:**
\`\`\`python
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class LoginPage:
    URL = "https://www.saucedemo.com/"

    # Locators
    USERNAME_FIELD = (By.ID, "user-name")
    PASSWORD_FIELD = (By.ID, "password")
    LOGIN_BUTTON = (By.ID, "login-button")
    ERROR_MESSAGE = (By.CSS_SELECTOR, "[data-test='error']")

    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)

    def navigate(self):
        self.driver.get(self.URL)
        return self

    def login_as(self, username, password):
        self.wait.until(
            EC.visibility_of_element_located(self.USERNAME_FIELD)
        ).send_keys(username)
        self.driver.find_element(*self.PASSWORD_FIELD).send_keys(password)
        self.driver.find_element(*self.LOGIN_BUTTON).click()
        from pages.products_page import ProductsPage
        return ProductsPage(self.driver)

    def get_error_message(self):
        return self.wait.until(
            EC.visibility_of_element_located(self.ERROR_MESSAGE)
        ).text
\`\`\`

**tests/test_login.py:**
\`\`\`python
import pytest
from selenium import webdriver
from pages.login_page import LoginPage


@pytest.fixture
def driver():
    d = webdriver.Chrome()
    d.maximize_window()
    yield d
    d.quit()


def test_successful_login(driver):
    login_page = LoginPage(driver)
    products_page = login_page.navigate().login_as(
        "standard_user", "secret_sauce"
    )
    assert products_page.get_title() == "Products"


def test_invalid_credentials(driver):
    login_page = LoginPage(driver)
    login_page.navigate().login_as("invalid", "invalid")
    error = login_page.get_error_message()
    assert "do not match" in error
\`\`\`

### POM Best Practices

1. **Return page objects from actions**: Methods that navigate to another page should return the new page object
2. **Keep locators private**: Locators are implementation details of the page
3. **Use descriptive method names**: \`loginAs()\` is better than \`fillFormAndSubmit()\`
4. **Do not include assertions in page objects**: Page objects represent the page, tests make assertions
5. **Use a base page class**: Share common functionality like wait helpers and screenshot methods

---

## 8. Handling Dropdowns

Selenium provides the \`Select\` class for working with native HTML \`<select>\` elements.

**Java:**
\`\`\`java
import org.openqa.selenium.support.ui.Select;

WebElement dropdownElement = driver.findElement(By.id("country"));
Select dropdown = new Select(dropdownElement);

// Select by visible text
dropdown.selectByVisibleText("United States");

// Select by value attribute
dropdown.selectByValue("US");

// Select by index (0-based)
dropdown.selectByIndex(2);

// Get all options
List<WebElement> options = dropdown.getOptions();

// Get selected option
String selected = dropdown.getFirstSelectedOption().getText();

// Check if multi-select
boolean isMulti = dropdown.isMultiple();
\`\`\`

**Python:**
\`\`\`python
from selenium.webdriver.support.ui import Select

dropdown_element = driver.find_element(By.ID, "country")
dropdown = Select(dropdown_element)

# Select by visible text
dropdown.select_by_visible_text("United States")

# Select by value attribute
dropdown.select_by_value("US")

# Select by index (0-based)
dropdown.select_by_index(2)

# Get all options
options = dropdown.options

# Get selected option
selected = dropdown.first_selected_option.text

# Check if multi-select
is_multi = dropdown.is_multiple
\`\`\`

For custom dropdowns built with \`<div>\` and \`<li>\` elements, you need to click the dropdown trigger and then click the desired option using standard locators.

---

## 9. Handling Alerts and Popups

Selenium supports three types of JavaScript alerts: simple alerts, confirmation dialogs, and prompts.

**Java:**
\`\`\`java
import org.openqa.selenium.Alert;

// Trigger the alert
driver.findElement(By.id("alert-button")).click();

// Switch to the alert
Alert alert = driver.switchTo().alert();

// Get alert text
String alertText = alert.getText();

// Accept the alert (click OK)
alert.accept();

// Dismiss the alert (click Cancel)
alert.dismiss();

// Type into a prompt
alert.sendKeys("My input text");
alert.accept();
\`\`\`

**Python:**
\`\`\`python
from selenium.webdriver.common.alert import Alert

# Trigger the alert
driver.find_element(By.ID, "alert-button").click()

# Switch to the alert
alert = Alert(driver)

# Get alert text
alert_text = alert.text

# Accept the alert
alert.accept()

# Dismiss the alert
alert.dismiss()

# Type into a prompt
alert.send_keys("My input text")
alert.accept()
\`\`\`

**Waiting for alerts:**

\`\`\`java
// Java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
wait.until(ExpectedConditions.alertIsPresent());
Alert alert = driver.switchTo().alert();
\`\`\`

\`\`\`python
# Python
wait = WebDriverWait(driver, 5)
wait.until(EC.alert_is_present())
alert = driver.switch_to.alert
\`\`\`

---

## 10. Working with Frames and iFrames

Frames isolate content in separate browsing contexts. You must switch to a frame before interacting with elements inside it.

**Java:**
\`\`\`java
// Switch by index
driver.switchTo().frame(0);

// Switch by name or ID
driver.switchTo().frame("iframe-name");

// Switch by WebElement
WebElement frameElement = driver.findElement(By.id("my-frame"));
driver.switchTo().frame(frameElement);

// Interact with elements inside the frame
driver.findElement(By.id("frame-input")).sendKeys("Hello");

// Switch back to the main content
driver.switchTo().defaultContent();

// Switch to parent frame (one level up)
driver.switchTo().parentFrame();
\`\`\`

**Python:**
\`\`\`python
# Switch by index
driver.switch_to.frame(0)

# Switch by name or ID
driver.switch_to.frame("iframe-name")

# Switch by WebElement
frame_element = driver.find_element(By.ID, "my-frame")
driver.switch_to.frame(frame_element)

# Interact with elements inside the frame
driver.find_element(By.ID, "frame-input").send_keys("Hello")

# Switch back to the main content
driver.switch_to.default_content()

# Switch to parent frame
driver.switch_to.parent_frame()
\`\`\`

**Nested frames pattern:**
\`\`\`java
// Java: Navigate nested frames
driver.switchTo().frame("outer-frame");
driver.switchTo().frame("inner-frame");
// Interact with inner frame content
driver.switchTo().defaultContent(); // Back to top
\`\`\`

---

## 11. Managing Multiple Windows and Tabs

When clicking a link that opens a new tab or window, you need to switch the WebDriver focus to interact with the new context.

**Java:**
\`\`\`java
// Get the current window handle
String originalWindow = driver.getWindowHandle();

// Click something that opens a new window
driver.findElement(By.id("open-new-window")).click();

// Get all window handles
Set<String> windowHandles = driver.getWindowHandles();

// Switch to the new window
for (String handle : windowHandles) {
    if (!handle.equals(originalWindow)) {
        driver.switchTo().window(handle);
        break;
    }
}

// Perform actions in the new window
System.out.println("New window title: " + driver.getTitle());

// Close the new window and switch back
driver.close();
driver.switchTo().window(originalWindow);
\`\`\`

**Python:**
\`\`\`python
# Get the current window handle
original_window = driver.current_window_handle

# Click something that opens a new window
driver.find_element(By.ID, "open-new-window").click()

# Wait for the new window
wait = WebDriverWait(driver, 10)
wait.until(EC.number_of_windows_to_be(2))

# Switch to the new window
for handle in driver.window_handles:
    if handle != original_window:
        driver.switch_to.window(handle)
        break

# Perform actions in the new window
print(f"New window title: {driver.title}")

# Close the new window and switch back
driver.close()
driver.switch_to.window(original_window)
\`\`\`

### Selenium 4: New Window API

Selenium 4 added a cleaner API for creating new windows and tabs:

\`\`\`java
// Java: Open a new tab
driver.switchTo().newWindow(WindowType.TAB);
driver.get("https://example.com");

// Open a new window
driver.switchTo().newWindow(WindowType.WINDOW);
\`\`\`

\`\`\`python
# Python: Open a new tab
driver.switch_to.new_window("tab")
driver.get("https://example.com")

# Open a new window
driver.switch_to.new_window("window")
\`\`\`

---

## 12. Taking Screenshots

Screenshots are essential for debugging test failures. Capture them on failure in your test teardown.

**Java:**
\`\`\`java
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.apache.commons.io.FileUtils;

// Full page screenshot
File screenshot = ((TakesScreenshot) driver)
    .getScreenshotAs(OutputType.FILE);
FileUtils.copyFile(
    screenshot,
    new File("screenshots/failure.png")
);

// Element screenshot
WebElement element = driver.findElement(By.id("error-panel"));
File elementScreenshot = element.getScreenshotAs(OutputType.FILE);
FileUtils.copyFile(
    elementScreenshot,
    new File("screenshots/error-panel.png")
);

// Screenshot as Base64 (useful for reports)
String base64 = ((TakesScreenshot) driver)
    .getScreenshotAs(OutputType.BASE64);
\`\`\`

**Python:**
\`\`\`python
# Full page screenshot
driver.save_screenshot("screenshots/failure.png")

# Element screenshot
element = driver.find_element(By.ID, "error-panel")
element.screenshot("screenshots/error-panel.png")

# Screenshot as Base64
base64_img = driver.get_screenshot_as_base64()

# Screenshot as PNG bytes
png_bytes = driver.get_screenshot_as_png()
\`\`\`

### Automatic Screenshot on Failure

**Java (TestNG listener):**
\`\`\`java
public class ScreenshotListener implements ITestListener {
    @Override
    public void onTestFailure(ITestResult result) {
        WebDriver driver = ((BaseTest) result.getInstance()).getDriver();
        File screenshot = ((TakesScreenshot) driver)
            .getScreenshotAs(OutputType.FILE);
        String filename = result.getName() + "_"
            + System.currentTimeMillis() + ".png";
        FileUtils.copyFile(screenshot, new File("screenshots/" + filename));
    }
}
\`\`\`

**Python (pytest conftest.py):**
\`\`\`python
# conftest.py
@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.failed and "driver" in item.funcargs:
        driver = item.funcargs["driver"]
        driver.save_screenshot(
            f"screenshots/{item.name}_{int(time.time())}.png"
        )
\`\`\`

---

## 13. Running Tests in Headless Mode

Headless mode runs the browser without a visible UI. This is faster and essential for CI/CD environments.

**Java:**
\`\`\`java
import org.openqa.selenium.chrome.ChromeOptions;

ChromeOptions options = new ChromeOptions();
options.addArguments("--headless=new");
options.addArguments("--window-size=1920,1080");
options.addArguments("--disable-gpu");
options.addArguments("--no-sandbox");

WebDriver driver = new ChromeDriver(options);
\`\`\`

**Python:**
\`\`\`python
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument("--headless=new")
options.add_argument("--window-size=1920,1080")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")

driver = webdriver.Chrome(options=options)
\`\`\`

**Firefox headless:**
\`\`\`java
// Java
FirefoxOptions options = new FirefoxOptions();
options.addArguments("--headless");
WebDriver driver = new FirefoxDriver(options);
\`\`\`

\`\`\`python
# Python
from selenium.webdriver.firefox.options import Options

options = Options()
options.add_argument("--headless")
driver = webdriver.Firefox(options=options)
\`\`\`

**Important notes:**
- Use \`--headless=new\` for Chrome (the new headless mode matches headed behavior more closely)
- Always set a window size in headless mode, otherwise the viewport defaults to a small size
- Some tests may behave differently in headless mode, especially around animations and visual rendering

---

## 14. Setting Up Selenium Grid

Selenium Grid allows you to run tests in parallel across multiple machines and browsers.

### Grid 4 Architecture

Selenium Grid 4 introduced a simplified architecture with these components:
- **Router**: Receives test requests and routes them
- **Distributor**: Assigns sessions to available nodes
- **Session Map**: Tracks active sessions
- **Node**: Runs the actual browser instances

### Standalone Mode (Quick Start)

For local development, run Grid in standalone mode:

\`\`\`bash
# Download Selenium Server
wget https://github.com/SeleniumHQ/selenium/releases/download/selenium-4.27.0/selenium-server-4.27.0.jar

# Run in standalone mode
java -jar selenium-server-4.27.0.jar standalone
\`\`\`

Grid will be available at \`http://localhost:4444\`.

### Docker Compose Setup

For CI/CD and team environments, use Docker:

\`\`\`yaml
# docker-compose.yml
version: "3"
services:
  selenium-hub:
    image: selenium/hub:4.27.0
    ports:
      - "4442:4442"
      - "4443:4443"
      - "4444:4444"

  chrome-node:
    image: selenium/node-chrome:4.27.0
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4
    shm_size: "2gb"

  firefox-node:
    image: selenium/node-firefox:4.27.0
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4
    shm_size: "2gb"
\`\`\`

\`\`\`bash
docker-compose up -d
\`\`\`

### Connecting Tests to Grid

**Java:**
\`\`\`java
ChromeOptions options = new ChromeOptions();
WebDriver driver = new RemoteWebDriver(
    new URL("http://localhost:4444"),
    options
);
\`\`\`

**Python:**
\`\`\`python
options = webdriver.ChromeOptions()
driver = webdriver.Remote(
    command_executor="http://localhost:4444",
    options=options
)
\`\`\`

---

## 15. Best Practices and Common Mistakes

### Do This

- **Use explicit waits** instead of implicit waits or Thread.sleep
- **Follow the Page Object Model** for any test suite with more than a few tests
- **Use data-testid attributes** for test-specific selectors when possible
- **Run tests in parallel** using Grid or TestNG/pytest-xdist
- **Take screenshots on failure** for easier debugging
- **Clean up after tests**: Always call \`driver.quit()\` in teardown
- **Use headless mode in CI** for faster execution
- **Version your driver separately** from your tests

### Avoid This

- **Do not use Thread.sleep()**: It slows tests and creates false stability
- **Do not use absolute XPaths**: They break on any DOM change
- **Do not share state between tests**: Each test should be independent
- **Do not hard-code test data**: Use data providers or factories
- **Do not ignore StaleElementReferenceException**: It indicates a page has re-rendered
- **Do not mix implicit and explicit waits**: This causes unpredictable timeout behavior

### Flaky Test Prevention Checklist

1. Replace all \`Thread.sleep()\` with explicit waits
2. Use stable locators (data-testid, ID, or semantic CSS selectors)
3. Wait for loading spinners to disappear before assertions
4. Handle dynamic content with fluent waits
5. Ensure test data isolation (each test creates its own data)
6. Set appropriate timeouts for your environment
7. Add retry logic for known infrastructure flakiness (with caution)

---

## 16. Integrating with QA Skills

Supercharge your AI coding agent with Selenium expertise by installing the Selenium QA skill:

\`\`\`bash
npx @qaskills/cli add selenium-e2e
\`\`\`

This gives your AI agent deep knowledge of Selenium patterns including POM, wait strategies, and cross-browser configuration. Browse all available testing skills at [qaskills.sh/skills](/skills).

---

## Summary

Selenium WebDriver remains a foundational tool for test automation in 2026. This guide covered the essential topics every beginner needs: environment setup for Java and Python, locator strategies from basic to advanced, the three types of waits, the Page Object Model pattern, handling complex UI elements like dropdowns and alerts, working with frames and multiple windows, screenshots and headless execution, and Grid setup for parallel testing.

The key to success with Selenium is building a solid foundation of locator strategies and wait handling, then layering on design patterns like POM as your test suite grows. Start with explicit waits from day one, always use the Page Object Model, and invest in your CI/CD pipeline early.

**Next steps:**
- Practice with the [SauceDemo](https://www.saucedemo.com/) test application
- Build a small test suite using the Page Object Model
- Set up Selenium Grid with Docker for parallel execution
- Explore QA Skills for AI-powered testing assistance at [qaskills.sh](/skills)
`,
};
