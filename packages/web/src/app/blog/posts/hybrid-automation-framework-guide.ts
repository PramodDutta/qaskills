import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Hybrid Test Automation Framework: Complete Architecture and Implementation',
  description:
    'Complete guide to building a hybrid test automation framework combining data-driven, keyword-driven, and Page Object Model patterns. Covers architecture layers, Playwright and TestNG implementation, Excel integration, and parallel execution.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
A hybrid test automation framework combines the strengths of multiple framework patterns -- data-driven, keyword-driven, and Page Object Model -- into a single cohesive architecture. Instead of choosing one approach and accepting its limitations, a hybrid framework lets you use data-driven testing for parameterized scenarios, keyword-driven testing for non-technical test creation, and the Page Object Model for maintainable browser automation. The result is a framework that is flexible enough to handle any test type, accessible to both technical and non-technical team members, and maintainable as your test suite grows.

This guide walks you through the complete architecture and implementation of a hybrid framework. You will learn what a hybrid framework is and why it exists, understand each architectural layer from configuration through reporting, implement it with Playwright and TestNG, integrate Excel-based test data, build custom annotations for test metadata, configure parallel execution, and see how the pieces fit together in a production environment.

---

## Key Takeaways

- **A hybrid framework combines data-driven, keyword-driven, and Page Object Model patterns** into a unified architecture that leverages the strengths of each approach
- **The architecture has six layers**: configuration, test data, page objects, keywords/actions, test execution, and utility/reporting -- each with a single responsibility
- **Data-driven testing** separates test data from test logic, enabling the same test to run with hundreds of data combinations from Excel, CSV, JSON, or database sources
- **Keyword-driven testing** maps natural-language keywords to reusable action functions, allowing non-technical team members to create tests by specifying sequences of keywords
- **Page Object Model** encapsulates page elements and interactions in dedicated classes, so when the UI changes you update one class instead of dozens of tests
- **Excel integration** with Apache POI (Java) or xlsx libraries (TypeScript) lets QA teams manage test data in familiar spreadsheet tools
- **Parallel execution** using TestNG suites or Playwright sharding distributes tests across threads or machines, reducing execution time proportionally
- **Custom annotations and metadata** tag tests with priority, module, test type, and environment information for flexible filtering and reporting

---

## What Is a Hybrid Framework?

A hybrid test automation framework is an architecture that combines two or more framework patterns. The most common combination is:

1. **Data-Driven Framework** -- test data is externalized in spreadsheets, JSON files, CSV files, or databases, and the framework reads this data at runtime to parameterize test execution
2. **Keyword-Driven Framework** -- test actions are defined as keywords (e.g., "navigate," "click," "enterText," "verifyText"), and tests are specified as sequences of keywords with parameters
3. **Page Object Model (POM)** -- each page or component of the application under test is represented by a class containing element locators and interaction methods

Each pattern has its own strengths:

- Data-driven eliminates test duplication when you need to verify the same workflow with different inputs
- Keyword-driven makes tests accessible to non-technical team members and enables test creation without code
- POM makes tests maintainable by isolating UI changes to a single class per page

By combining all three, the hybrid framework handles any testing scenario your team encounters.

### Why Not Just Pick One?

Pure data-driven frameworks become unwieldy when you need complex interaction sequences -- your data files end up encoding logic through special columns and flags.

Pure keyword-driven frameworks struggle with complex assertions and conditional logic -- the keyword abstraction becomes leaky when you need programmatic control.

Pure POM frameworks lack a clean mechanism for test data parameterization and are not accessible to non-technical team members.

The hybrid approach avoids these limitations by using each pattern where it excels.

---

## Architecture Layers

A production-grade hybrid framework is organized into six layers, each with a distinct responsibility.

### Layer 1: Configuration Layer

The configuration layer manages all external settings -- environment URLs, browser preferences, timeouts, database connections, and feature flags.

\`\`\`
config/
  config.properties       # Default configuration
  config.dev.properties   # Dev environment overrides
  config.staging.properties # Staging environment overrides
  config.prod.properties  # Production environment overrides
  browsers.json           # Browser capability definitions
\`\`\`

Example \`config.properties\`:

\`\`\`properties
# Application
base.url=https://staging.example.com
api.base.url=https://api.staging.example.com

# Browser
browser=chrome
headless=true
window.width=1920
window.height=1080

# Timeouts (milliseconds)
implicit.wait=10000
explicit.wait=15000
page.load.timeout=30000

# Test Data
test.data.source=excel
test.data.path=src/test/resources/testdata

# Reporting
report.output.path=target/reports
screenshot.on.failure=true
video.recording=false

# Parallel Execution
parallel.threads=4
parallel.mode=methods
\`\`\`

Configuration reader class:

\`\`\`java
public class ConfigManager {
    private static final Properties properties = new Properties();
    private static String environment;

    static {
        environment = System.getProperty("env", "staging");
        loadProperties("config/config.properties");
        loadProperties("config/config." + environment + ".properties");
    }

    private static void loadProperties(String path) {
        try (InputStream input = ConfigManager.class
                .getClassLoader().getResourceAsStream(path)) {
            if (input != null) {
                properties.load(input);
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to load config: " + path, e);
        }
    }

    public static String get(String key) {
        String envVar = System.getenv(key.toUpperCase().replace('.', '_'));
        if (envVar != null) return envVar;
        return properties.getProperty(key);
    }

    public static int getInt(String key) {
        return Integer.parseInt(get(key));
    }

    public static boolean getBoolean(String key) {
        return Boolean.parseBoolean(get(key));
    }
}
\`\`\`

This configuration reader supports:
- Default values from properties files
- Environment-specific overrides
- System property overrides (\`-Dbase.url=...\`)
- Environment variable overrides

### Layer 2: Test Data Layer

The test data layer manages all external data sources -- Excel files, CSV, JSON, and database connections.

\`\`\`
testdata/
  login/
    valid-credentials.xlsx
    invalid-credentials.xlsx
  checkout/
    payment-methods.xlsx
    shipping-addresses.json
  users/
    test-users.csv
\`\`\`

#### Excel Data Reader (Java with Apache POI)

\`\`\`java
public class ExcelReader {
    private final Workbook workbook;

    public ExcelReader(String filePath) {
        try (FileInputStream fis = new FileInputStream(filePath)) {
            this.workbook = WorkbookFactory.create(fis);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read Excel file: " + filePath, e);
        }
    }

    public List<Map<String, String>> readSheet(String sheetName) {
        Sheet sheet = workbook.getSheet(sheetName);
        if (sheet == null) {
            throw new RuntimeException("Sheet not found: " + sheetName);
        }

        List<Map<String, String>> data = new ArrayList<>();
        Row headerRow = sheet.getRow(0);
        List<String> headers = new ArrayList<>();

        for (Cell cell : headerRow) {
            headers.add(cell.getStringCellValue().trim());
        }

        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;

            Map<String, String> rowData = new LinkedHashMap<>();
            for (int j = 0; j < headers.size(); j++) {
                Cell cell = row.getCell(j);
                rowData.put(headers.get(j), getCellValueAsString(cell));
            }
            data.add(rowData);
        }
        return data;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getDateCellValue().toString();
                }
                yield String.valueOf((long) cell.getNumericCellValue());
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> "";
        };
    }

    public Object[][] toDataProvider(String sheetName) {
        List<Map<String, String>> data = readSheet(sheetName);
        Object[][] result = new Object[data.size()][1];
        for (int i = 0; i < data.size(); i++) {
            result[i][0] = data.get(i);
        }
        return result;
    }
}
\`\`\`

#### JSON Data Reader

\`\`\`java
public class JsonDataReader {
    private static final ObjectMapper mapper = new ObjectMapper();

    public static <T> T read(String filePath, Class<T> type) {
        try {
            return mapper.readValue(
                new File(filePath), type);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read JSON: " + filePath, e);
        }
    }

    public static List<Map<String, Object>> readAsList(String filePath) {
        try {
            return mapper.readValue(
                new File(filePath),
                new TypeReference<>() {});
        } catch (IOException e) {
            throw new RuntimeException("Failed to read JSON list: " + filePath, e);
        }
    }
}
\`\`\`

### Layer 3: Page Object Layer

The page object layer encapsulates all UI element locators and interaction methods.

\`\`\`
pages/
  BasePage.java
  LoginPage.java
  DashboardPage.java
  CheckoutPage.java
  components/
    NavigationBar.java
    SearchWidget.java
    CartSidebar.java
\`\`\`

#### Base Page

\`\`\`java
public abstract class BasePage {
    protected final Page page;
    protected final ConfigManager config;

    public BasePage(Page page) {
        this.page = page;
        this.config = ConfigManager.getInstance();
    }

    protected void click(String selector) {
        page.locator(selector).click();
    }

    protected void fill(String selector, String text) {
        page.locator(selector).fill(text);
    }

    protected String getText(String selector) {
        return page.locator(selector).textContent();
    }

    protected boolean isVisible(String selector) {
        return page.locator(selector).isVisible();
    }

    protected void waitForUrl(String urlPattern) {
        page.waitForURL(urlPattern);
    }

    protected void selectOption(String selector, String value) {
        page.locator(selector).selectOption(value);
    }

    protected void uploadFile(String selector, String filePath) {
        page.locator(selector).setInputFiles(Paths.get(filePath));
    }

    public void takeScreenshot(String name) {
        page.screenshot(new Page.ScreenshotOptions()
            .setPath(Paths.get("target/screenshots/" + name + ".png"))
            .setFullPage(true));
    }
}
\`\`\`

#### Concrete Page Object

\`\`\`java
public class LoginPage extends BasePage {
    // Locators
    private static final String EMAIL_INPUT = "#email";
    private static final String PASSWORD_INPUT = "#password";
    private static final String LOGIN_BUTTON = "#login-btn";
    private static final String ERROR_MESSAGE = ".error-message";
    private static final String REMEMBER_ME = "#remember-me";

    public LoginPage(Page page) {
        super(page);
    }

    public LoginPage navigate() {
        page.navigate(config.get("base.url") + "/login");
        return this;
    }

    public LoginPage enterEmail(String email) {
        fill(EMAIL_INPUT, email);
        return this;
    }

    public LoginPage enterPassword(String password) {
        fill(PASSWORD_INPUT, password);
        return this;
    }

    public LoginPage checkRememberMe() {
        click(REMEMBER_ME);
        return this;
    }

    public DashboardPage clickLogin() {
        click(LOGIN_BUTTON);
        return new DashboardPage(page);
    }

    public LoginPage clickLoginExpectingError() {
        click(LOGIN_BUTTON);
        return this;
    }

    public String getErrorMessage() {
        return getText(ERROR_MESSAGE);
    }

    public boolean isErrorDisplayed() {
        return isVisible(ERROR_MESSAGE);
    }

    // Fluent composite method
    public DashboardPage loginAs(String email, String password) {
        return navigate()
            .enterEmail(email)
            .enterPassword(password)
            .clickLogin();
    }
}
\`\`\`

### Layer 4: Keyword/Action Layer

The keyword layer maps natural-language actions to page object methods. This is what makes the framework accessible to non-technical team members.

\`\`\`java
public class KeywordEngine {
    private final Page page;
    private final Map<String, BasePage> pageRegistry = new HashMap<>();

    public KeywordEngine(Page page) {
        this.page = page;
        registerPages();
    }

    private void registerPages() {
        pageRegistry.put("LoginPage", new LoginPage(page));
        pageRegistry.put("DashboardPage", new DashboardPage(page));
        pageRegistry.put("CheckoutPage", new CheckoutPage(page));
    }

    public void executeKeyword(String pageName, String action, String... params) {
        BasePage pageObject = pageRegistry.get(pageName);
        if (pageObject == null) {
            throw new RuntimeException("Page not registered: " + pageName);
        }

        try {
            Method method;
            if (params.length > 0) {
                Class<?>[] paramTypes = new Class[params.length];
                Arrays.fill(paramTypes, String.class);
                method = pageObject.getClass().getMethod(action, paramTypes);
                method.invoke(pageObject, (Object[]) params);
            } else {
                method = pageObject.getClass().getMethod(action);
                method.invoke(pageObject);
            }
        } catch (NoSuchMethodException e) {
            throw new RuntimeException(
                "Action not found: " + pageName + "." + action, e);
        } catch (InvocationTargetException | IllegalAccessException e) {
            throw new RuntimeException(
                "Failed to execute: " + pageName + "." + action, e);
        }
    }

    public void executeFromExcel(String testCaseSheet) {
        ExcelReader reader = new ExcelReader(
            ConfigManager.get("test.data.path") + "/keywords.xlsx");
        List<Map<String, String>> steps = reader.readSheet(testCaseSheet);

        for (Map<String, String> step : steps) {
            String pageName = step.get("Page");
            String action = step.get("Action");
            String param1 = step.getOrDefault("Param1", "");
            String param2 = step.getOrDefault("Param2", "");

            List<String> params = new ArrayList<>();
            if (!param1.isEmpty()) params.add(param1);
            if (!param2.isEmpty()) params.add(param2);

            executeKeyword(pageName, action, params.toArray(new String[0]));
        }
    }
}
\`\`\`

The Excel sheet for keyword-driven tests looks like:

| Page | Action | Param1 | Param2 |
|---|---|---|---|
| LoginPage | navigate | | |
| LoginPage | enterEmail | alice@example.com | |
| LoginPage | enterPassword | SecurePass123! | |
| LoginPage | clickLogin | | |
| DashboardPage | verifyWelcomeMessage | Welcome, Alice | |

Non-technical team members can add new test cases by adding rows to the spreadsheet without writing any code.

### Layer 5: Test Execution Layer

The test execution layer contains the actual test classes that orchestrate page objects, data providers, and keywords.

\`\`\`java
public class BaseTest {
    protected static Playwright playwright;
    protected static Browser browser;
    protected Page page;
    protected BrowserContext context;

    @BeforeSuite
    public void globalSetup() {
        playwright = Playwright.create();
        BrowserType.LaunchOptions options = new BrowserType.LaunchOptions()
            .setHeadless(ConfigManager.getBoolean("headless"));

        String browserName = ConfigManager.get("browser");
        browser = switch (browserName) {
            case "firefox" -> playwright.firefox().launch(options);
            case "webkit" -> playwright.webkit().launch(options);
            default -> playwright.chromium().launch(options);
        };
    }

    @BeforeMethod
    public void setUp() {
        context = browser.newContext(new Browser.NewContextOptions()
            .setViewportSize(
                ConfigManager.getInt("window.width"),
                ConfigManager.getInt("window.height")));
        page = context.newPage();
    }

    @AfterMethod
    public void tearDown(ITestResult result) {
        if (result.getStatus() == ITestResult.FAILURE) {
            takeScreenshotOnFailure(result.getName());
        }
        context.close();
    }

    @AfterSuite
    public void globalTeardown() {
        browser.close();
        playwright.close();
    }

    private void takeScreenshotOnFailure(String testName) {
        if (ConfigManager.getBoolean("screenshot.on.failure")) {
            page.screenshot(new Page.ScreenshotOptions()
                .setPath(Paths.get("target/screenshots/" + testName + ".png"))
                .setFullPage(true));
        }
    }
}
\`\`\`

#### Data-Driven Test Example

\`\`\`java
public class LoginTest extends BaseTest {

    @DataProvider(name = "validCredentials")
    public Object[][] validCredentials() {
        ExcelReader reader = new ExcelReader("src/test/resources/testdata/login/valid-credentials.xlsx");
        return reader.toDataProvider("ValidLogins");
    }

    @DataProvider(name = "invalidCredentials")
    public Object[][] invalidCredentials() {
        ExcelReader reader = new ExcelReader("src/test/resources/testdata/login/invalid-credentials.xlsx");
        return reader.toDataProvider("InvalidLogins");
    }

    @Test(dataProvider = "validCredentials",
          groups = {"smoke", "login"},
          description = "Verify login with valid credentials")
    public void testValidLogin(Map<String, String> data) {
        LoginPage loginPage = new LoginPage(page);
        DashboardPage dashboard = loginPage.loginAs(
            data.get("email"), data.get("password"));

        assertThat(dashboard.getWelcomeMessage())
            .contains(data.get("expectedName"));
    }

    @Test(dataProvider = "invalidCredentials",
          groups = {"regression", "login"},
          description = "Verify error messages for invalid credentials")
    public void testInvalidLogin(Map<String, String> data) {
        LoginPage loginPage = new LoginPage(page);
        loginPage.navigate()
            .enterEmail(data.get("email"))
            .enterPassword(data.get("password"))
            .clickLoginExpectingError();

        assertThat(loginPage.getErrorMessage())
            .isEqualTo(data.get("expectedError"));
    }
}
\`\`\`

#### Keyword-Driven Test Example

\`\`\`java
public class KeywordDrivenTest extends BaseTest {

    @Test(groups = {"smoke"},
          description = "Execute login flow from keyword spreadsheet")
    public void testLoginViaKeywords() {
        KeywordEngine engine = new KeywordEngine(page);
        engine.executeFromExcel("LoginFlow");
    }

    @Test(groups = {"regression"},
          description = "Execute checkout flow from keyword spreadsheet")
    public void testCheckoutViaKeywords() {
        KeywordEngine engine = new KeywordEngine(page);
        engine.executeFromExcel("CheckoutFlow");
    }
}
\`\`\`

### Layer 6: Utility and Reporting Layer

\`\`\`
utils/
  WaitUtils.java
  DateUtils.java
  RandomDataGenerator.java
  RetryAnalyzer.java
reporting/
  AllureReportManager.java
  ExtentReportManager.java
  TestListener.java
\`\`\`

#### Retry Analyzer

\`\`\`java
public class RetryAnalyzer implements IRetryAnalyzer {
    private int retryCount = 0;
    private static final int MAX_RETRIES = 2;

    @Override
    public boolean retry(ITestResult result) {
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            return true;
        }
        return false;
    }
}
\`\`\`

#### Test Listener for Reporting

\`\`\`java
public class TestListener implements ITestListener {

    @Override
    public void onTestStart(ITestResult result) {
        Allure.step("Starting test: " + result.getName());
    }

    @Override
    public void onTestSuccess(ITestResult result) {
        Allure.step("Test passed: " + result.getName());
    }

    @Override
    public void onTestFailure(ITestResult result) {
        Allure.step("Test failed: " + result.getName());
        Allure.addAttachment("Failure Screenshot",
            new ByteArrayInputStream(captureScreenshot(result)));
        Allure.addAttachment("Page Source",
            getPageSource(result));
    }

    private byte[] captureScreenshot(ITestResult result) {
        Page page = ((BaseTest) result.getInstance()).page;
        return page.screenshot(new Page.ScreenshotOptions().setFullPage(true));
    }

    private String getPageSource(ITestResult result) {
        Page page = ((BaseTest) result.getInstance()).page;
        return page.content();
    }
}
\`\`\`

---

## Complete Project Structure

\`\`\`
hybrid-framework/
  src/
    main/
      java/
        com/example/
          config/
            ConfigManager.java
          data/
            ExcelReader.java
            JsonDataReader.java
            CsvReader.java
          pages/
            BasePage.java
            LoginPage.java
            DashboardPage.java
            CheckoutPage.java
            components/
              NavigationBar.java
              SearchWidget.java
          keywords/
            KeywordEngine.java
          utils/
            WaitUtils.java
            DateUtils.java
            RandomDataGenerator.java
    test/
      java/
        com/example/
          tests/
            BaseTest.java
            LoginTest.java
            CheckoutTest.java
            KeywordDrivenTest.java
          listeners/
            TestListener.java
            RetryAnalyzer.java
      resources/
        config/
          config.properties
          config.staging.properties
        testdata/
          login/
            valid-credentials.xlsx
            invalid-credentials.xlsx
          checkout/
            payment-methods.xlsx
          keywords/
            keywords.xlsx
        testng/
          smoke-suite.xml
          regression-suite.xml
          parallel-suite.xml
  pom.xml
  README.md
\`\`\`

---

## Parallel Execution Configuration

### TestNG Parallel Suite

\`\`\`xml
<!-- parallel-suite.xml -->
<suite name="Parallel Suite" parallel="methods" thread-count="4">
    <listeners>
        <listener class-name="com.example.listeners.TestListener"/>
    </listeners>

    <test name="Smoke Tests">
        <groups>
            <run>
                <include name="smoke"/>
            </run>
        </groups>
        <classes>
            <class name="com.example.tests.LoginTest"/>
            <class name="com.example.tests.CheckoutTest"/>
        </classes>
    </test>

    <test name="Regression Tests">
        <groups>
            <run>
                <include name="regression"/>
            </run>
        </groups>
        <classes>
            <class name="com.example.tests.LoginTest"/>
            <class name="com.example.tests.CheckoutTest"/>
            <class name="com.example.tests.KeywordDrivenTest"/>
        </classes>
    </test>
</suite>
\`\`\`

### Thread Safety

When running in parallel, each thread must have its own browser context. Use \`ThreadLocal\` or TestNG's dependency injection:

\`\`\`java
public class BaseTest {
    private static final ThreadLocal<Page> pageThreadLocal = new ThreadLocal<>();
    private static final ThreadLocal<BrowserContext> contextThreadLocal = new ThreadLocal<>();

    @BeforeMethod
    public void setUp() {
        BrowserContext context = browser.newContext();
        Page page = context.newPage();
        contextThreadLocal.set(context);
        pageThreadLocal.set(page);
    }

    protected Page getPage() {
        return pageThreadLocal.get();
    }

    @AfterMethod
    public void tearDown() {
        contextThreadLocal.get().close();
        contextThreadLocal.remove();
        pageThreadLocal.remove();
    }
}
\`\`\`

---

## TypeScript/Playwright Implementation

If your team uses TypeScript, here is how the same hybrid architecture maps to Playwright:

### Configuration

\`\`\`typescript
// config/config.ts
import * as dotenv from 'dotenv';

dotenv.config({ path: \`.env.\${process.env.ENV || 'staging'}\` });

export const config = {
  baseUrl: process.env.BASE_URL || 'https://staging.example.com',
  headless: process.env.HEADLESS !== 'false',
  timeout: parseInt(process.env.TIMEOUT || '30000'),
  retries: parseInt(process.env.RETRIES || '2'),
  workers: parseInt(process.env.WORKERS || '4'),
};
\`\`\`

### Page Object

\`\`\`typescript
// pages/login.page.ts
import { Page, expect } from '@playwright/test';
import { config } from '../config/config';

export class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto(\`\${config.baseUrl}/login\`);
  }

  async login(email: string, password: string) {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    await this.page.click('#login-btn');
  }

  async getErrorMessage(): Promise<string> {
    return await this.page.textContent('.error-message') || '';
  }

  async expectDashboard() {
    await expect(this.page).toHaveURL(/\\/dashboard/);
  }
}
\`\`\`

### Data-Driven Test

\`\`\`typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { readExcel } from '../utils/excel-reader';

const validCredentials = readExcel('testdata/login/valid-credentials.xlsx', 'ValidLogins');

for (const data of validCredentials) {
  test(\`Login with \${data.email}\`, async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(data.email, data.password);
    await loginPage.expectDashboard();
  });
}
\`\`\`

### Playwright Config for Parallel Execution

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { config } from './config/config';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: config.workers,
  retries: config.retries,
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['allure-playwright'],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],
  use: {
    baseURL: config.baseUrl,
    headless: config.headless,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chrome', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
\`\`\`

---

## Custom Annotations for Test Metadata

Custom annotations let you tag tests with metadata for filtering and reporting.

\`\`\`java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface TestInfo {
    String module();
    String priority() default "medium";
    String[] tags() default {};
    String testType() default "functional";
}
\`\`\`

Usage:

\`\`\`java
@Test
@TestInfo(module = "auth", priority = "critical", tags = {"smoke", "login"}, testType = "e2e")
public void testValidLogin(Map<String, String> data) {
    // test implementation
}
\`\`\`

Read annotations in the test listener for reporting:

\`\`\`java
@Override
public void onTestStart(ITestResult result) {
    TestInfo info = result.getMethod().getConstructorOrMethod()
        .getMethod().getAnnotation(TestInfo.class);
    if (info != null) {
        Allure.label("module", info.module());
        Allure.label("priority", info.priority());
        Allure.label("testType", info.testType());
        for (String tag : info.tags()) {
            Allure.label("tag", tag);
        }
    }
}
\`\`\`

---

## Reporting Integration

### Allure Report

Add Allure to your Maven project:

\`\`\`xml
<dependency>
    <groupId>io.qameta.allure</groupId>
    <artifactId>allure-testng</artifactId>
    <version>2.27.0</version>
</dependency>
\`\`\`

Enhance test methods with Allure annotations:

\`\`\`java
@Epic("Authentication")
@Feature("Login")
@Story("Valid Login")
@Severity(SeverityLevel.CRITICAL)
@Test(dataProvider = "validCredentials")
public void testValidLogin(Map<String, String> data) {
    Allure.step("Navigate to login page");
    LoginPage loginPage = new LoginPage(page);
    loginPage.navigate();

    Allure.step("Enter credentials and submit");
    DashboardPage dashboard = loginPage.loginAs(
        data.get("email"), data.get("password"));

    Allure.step("Verify dashboard is displayed");
    assertThat(dashboard.getWelcomeMessage())
        .contains(data.get("expectedName"));
}
\`\`\`

Generate the report:

\`\`\`bash
mvn test
mvn allure:serve
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: Hybrid Framework Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-suite: [smoke, regression]
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
          cache: 'maven'

      - name: Install Playwright browsers
        run: mvn exec:java -e -D exec.mainClass=com.microsoft.playwright.CLI -D exec.args="install --with-deps"

      - name: Run tests
        run: mvn test -Dsurefire.suiteXmlFiles=src/test/resources/testng/\${{ matrix.test-suite }}-suite.xml -Denv=staging

      - name: Generate Allure report
        if: always()
        run: mvn allure:report

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: \${{ matrix.test-suite }}-report
          path: target/site/allure-maven-plugin/
\`\`\`

---

## Best Practices

1. **Keep page objects thin** -- page objects should contain locators and simple interaction methods, not test logic or assertions
2. **Use meaningful test data** -- test data in Excel should be realistic, not "test123" and "abc@xyz.com"
3. **Version control your test data** -- Excel files and JSON test data belong in the repository alongside the test code
4. **Do not over-engineer the keyword layer** -- start with direct page object calls and add keyword abstraction only when non-technical team members need it
5. **Use fluent APIs** -- return \`this\` from page object methods to enable method chaining
6. **Isolate tests** -- each test should set up its own state and clean up after itself
7. **Configure timeouts at the framework level** -- do not hardcode waits in individual tests
8. **Log meaningful information** -- every action should produce a log entry that helps debug failures
9. **Run smoke tests on every commit** -- reserve full regression for nightly or pre-release runs
10. **Review the framework architecture quarterly** -- as your application evolves, your framework should evolve with it

---

## Conclusion

A hybrid test automation framework gives you the best of all worlds: data-driven flexibility, keyword-driven accessibility, and Page Object Model maintainability. The six-layer architecture -- configuration, test data, page objects, keywords, test execution, and utilities -- provides clean separation of concerns that scales with your test suite.

Start by building the configuration and page object layers. Add data-driven capabilities through Excel readers. Introduce the keyword engine when non-technical team members need to create tests. Configure parallel execution to keep feedback fast. Layer in Allure reporting for visibility into test results.

The framework is not the goal -- test coverage and fast feedback are. Build the minimum framework that lets your team write, run, and maintain tests effectively, and extend it as your needs grow.
`,
};
