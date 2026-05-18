import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Data-Driven Testing: Complete Guide with Frameworks and Examples',
  description:
    'Master data-driven testing with CSV, JSON, Excel, and database sources. Covers parameterized tests in Playwright, pytest, JUnit, TestNG, data providers, dynamic test generation, and best practices.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
Data-driven testing separates test logic from test data, allowing you to run the same test scenario with hundreds of different inputs without duplicating code. It is one of the most effective strategies for increasing test coverage while keeping your test suite manageable. This guide covers data-driven testing across all major frameworks and languages, with practical examples you can apply immediately.

## Key Takeaways

- Data-driven testing separates test logic from test data, enabling one test to cover many input combinations
- CSV, JSON, Excel, and databases each have distinct advantages as data sources depending on team workflow
- pytest parametrize, JUnit 5 ParameterizedTest, and TestNG DataProvider are the primary mechanisms in their respective ecosystems
- Playwright and Cypress support data-driven patterns through their test runner APIs and fixture systems
- Dynamic test generation from external data files keeps tests in sync with evolving business requirements
- Proper data management, including naming conventions, versioning, and cleanup, is as important as the test code itself

---

## What Is Data-Driven Testing

Data-driven testing (DDT) is a methodology where test inputs and expected outputs are stored externally -- in files, databases, or code structures -- and fed into test functions that contain only the test logic. Instead of writing ten separate tests for ten login scenarios, you write one test function and ten rows of data.

### Without Data-Driven Testing

\`\`\`python
def test_login_valid_admin():
    login("admin@example.com", "admin123")
    assert_dashboard_visible()

def test_login_valid_user():
    login("user@example.com", "user123")
    assert_dashboard_visible()

def test_login_invalid_email():
    login("invalid", "password")
    assert_error("Invalid email format")

def test_login_empty_password():
    login("user@example.com", "")
    assert_error("Password is required")

# ... 20 more nearly identical functions
\`\`\`

### With Data-Driven Testing

\`\`\`python
@pytest.mark.parametrize("email,password,expected_result,expected_message", [
    ("admin@example.com", "admin123", "success", "Welcome"),
    ("user@example.com", "user123", "success", "Welcome"),
    ("invalid", "password", "error", "Invalid email format"),
    ("user@example.com", "", "error", "Password is required"),
    # Add as many rows as needed without touching test logic
])
def test_login(page, email, password, expected_result, expected_message):
    login_page = LoginPage(page)
    login_page.open().login(email, password)

    if expected_result == "success":
        assert_text_visible(page, expected_message)
    else:
        login_page.assert_error(expected_message)
\`\`\`

The second approach is dramatically easier to maintain. Adding a new test case means adding a single row of data. The test logic stays unchanged.

---

## Why Data-Driven Testing Matters

### Coverage Multiplication

A single test function with 50 data rows tests 50 scenarios. Writing 50 individual tests would take 50 times longer and be 50 times harder to maintain.

### Separation of Concerns

Test logic (what to do) is separated from test data (what to test with). This means QA engineers can add test cases by editing data files without touching code, and developers can refactor test logic without breaking data.

### Business-Friendly

Non-technical stakeholders can review and contribute test data in CSV or Excel format. This brings domain expertise directly into the testing process.

### Regression Prevention

When a bug is found, adding a new data row that reproduces the bug takes seconds. The regression test is permanent and runs on every build.

For AI coding agents, installing a data-driven testing skill ensures generated tests use parameterized patterns:

\`\`\`bash
npx @qaskills/cli add data-driven-testing
\`\`\`

---

## Data Sources

### CSV Files

CSV is the simplest format for tabular test data. It is easy to edit in any text editor or spreadsheet application.

\`\`\`csv
email,password,expected_result,expected_message
admin@example.com,admin123,success,Welcome Admin
user@example.com,user123,success,Welcome User
invalid-email,password,error,Invalid email format
admin@example.com,,error,Password is required
,admin123,error,Email is required
admin@example.com,wrong,error,Invalid credentials
\`\`\`

#### Reading CSV in Python

\`\`\`python
import csv
import pytest


def load_csv_data(filename):
    with open(f"data/{filename}", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader)


login_data = load_csv_data("login_data.csv")


@pytest.mark.parametrize(
    "test_data",
    login_data,
    ids=[row["email"] or "empty_email" for row in login_data],
)
def test_login_from_csv(page, test_data):
    login_page = LoginPage(page)
    login_page.open().login(test_data["email"], test_data["password"])

    if test_data["expected_result"] == "success":
        assert test_data["expected_message"] in page.text_content("body")
    else:
        assert login_page.get_error_message() == test_data["expected_message"]
\`\`\`

#### Reading CSV in TypeScript

\`\`\`typescript
import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { parse } from 'csv-parse/sync';

interface LoginTestData {
  email: string;
  password: string;
  expected_result: string;
  expected_message: string;
}

const csvPath = path.join(__dirname, '../data/login_data.csv');
const records: LoginTestData[] = parse(fs.readFileSync(csvPath), {
  columns: true,
  skip_empty_lines: true,
});

for (const data of records) {
  test(\`login with \${data.email || 'empty email'}\`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(data.email);
    await page.getByLabel('Password').fill(data.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    if (data.expected_result === 'success') {
      await expect(page.getByText(data.expected_message)).toBeVisible();
    } else {
      await expect(page.getByTestId('error-message')).toContainText(
        data.expected_message
      );
    }
  });
}
\`\`\`

### JSON Files

JSON supports nested structures, arrays, and typed values, making it more expressive than CSV.

\`\`\`json
{
  "loginTests": [
    {
      "name": "valid admin login",
      "email": "admin@example.com",
      "password": "admin123",
      "expectedResult": "success",
      "expectedRole": "admin"
    },
    {
      "name": "SQL injection attempt",
      "email": "admin' OR '1'='1",
      "password": "anything",
      "expectedResult": "error",
      "expectedMessage": "Invalid email format"
    },
    {
      "name": "XSS attempt in email",
      "email": "<script>alert('xss')</script>",
      "password": "password",
      "expectedResult": "error",
      "expectedMessage": "Invalid email format"
    }
  ]
}
\`\`\`

#### Reading JSON in Python

\`\`\`python
import json
import pytest


def load_json_data(filename):
    with open(f"data/{filename}") as f:
        return json.load(f)


test_cases = load_json_data("login_tests.json")["loginTests"]


@pytest.mark.parametrize(
    "test_case",
    test_cases,
    ids=[tc["name"] for tc in test_cases],
)
def test_login_from_json(page, test_case):
    login_page = LoginPage(page)
    login_page.open().login(test_case["email"], test_case["password"])

    if test_case["expectedResult"] == "success":
        assert DashboardPage(page).is_loaded()
    else:
        assert test_case["expectedMessage"] in login_page.get_error_message()
\`\`\`

### Excel Files

Excel is popular when test data is managed by business analysts or QA leads who prefer spreadsheet interfaces.

#### Reading Excel in Python

\`\`\`python
import openpyxl
import pytest


def load_excel_data(filename, sheet_name="Sheet1"):
    wb = openpyxl.load_workbook(f"data/{filename}")
    sheet = wb[sheet_name]
    headers = [cell.value for cell in sheet[1]]
    data = []
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if any(cell is not None for cell in row):
            data.append(dict(zip(headers, row)))
    return data


product_data = load_excel_data("products.xlsx", "TestCases")


@pytest.mark.parametrize(
    "test_data",
    product_data,
    ids=[str(d.get("test_name", i)) for i, d in enumerate(product_data)],
)
def test_product_creation(page, test_data):
    product_page = ProductPage(page)
    product_page.open()
    product_page.create_product(
        name=test_data["name"],
        price=test_data["price"],
        category=test_data["category"],
    )

    if test_data["expected_result"] == "success":
        assert product_page.is_product_visible(test_data["name"])
    else:
        assert test_data["expected_error"] in product_page.get_error()
\`\`\`

#### Reading Excel in Java

\`\`\`java
import org.apache.poi.xssf.usermodel.*;
import java.io.FileInputStream;
import java.util.*;

public class ExcelReader {
    public static List<Map<String, String>> readExcel(
        String filePath, String sheetName
    ) {
        List<Map<String, String>> data = new ArrayList<>();
        try (FileInputStream fis = new FileInputStream(filePath);
             XSSFWorkbook workbook = new XSSFWorkbook(fis)) {

            XSSFSheet sheet = workbook.getSheet(sheetName);
            XSSFRow headerRow = sheet.getRow(0);
            List<String> headers = new ArrayList<>();

            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                headers.add(headerRow.getCell(i).getStringCellValue());
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                XSSFRow row = sheet.getRow(i);
                if (row == null) continue;

                Map<String, String> rowData = new HashMap<>();
                for (int j = 0; j < headers.size(); j++) {
                    XSSFCell cell = row.getCell(j);
                    rowData.put(headers.get(j),
                        cell != null ? cell.toString() : "");
                }
                data.add(rowData);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to read Excel: " + e.getMessage());
        }
        return data;
    }
}
\`\`\`

### Database Sources

For applications where test data lives in a database, you can query it directly:

\`\`\`python
import psycopg2
import pytest


def load_db_test_data():
    conn = psycopg2.connect(
        host="localhost",
        database="testdata",
        user="testuser",
        password="testpass",
    )
    cursor = conn.cursor()
    cursor.execute("""
        SELECT email, password, expected_result, expected_message
        FROM login_test_cases
        WHERE active = true
        ORDER BY priority
    """)
    columns = [desc[0] for desc in cursor.description]
    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    return rows


db_test_data = load_db_test_data()


@pytest.mark.parametrize("test_data", db_test_data,
    ids=[d["email"] for d in db_test_data])
def test_login_from_db(page, test_data):
    login_page = LoginPage(page)
    login_page.open().login(test_data["email"], test_data["password"])
    # Assert based on expected result
\`\`\`

---

## Parameterized Tests by Framework

### pytest (Python)

\`\`\`python
import pytest

# Basic parametrize
@pytest.mark.parametrize("input_val,expected", [
    (1, 2),
    (2, 4),
    (3, 6),
    (0, 0),
    (-1, -2),
])
def test_double(input_val, expected):
    assert input_val * 2 == expected


# Multiple parameter sets with IDs
@pytest.mark.parametrize(
    "browser,viewport",
    [
        ("chromium", {"width": 1920, "height": 1080}),
        ("chromium", {"width": 375, "height": 667}),
        ("firefox", {"width": 1920, "height": 1080}),
    ],
    ids=["chrome-desktop", "chrome-mobile", "firefox-desktop"],
)
def test_responsive_layout(browser, viewport):
    # Test with different browser/viewport combinations
    pass


# Stacking parametrize decorators (creates cartesian product)
@pytest.mark.parametrize("user_role", ["admin", "editor", "viewer"])
@pytest.mark.parametrize("action", ["create", "read", "update", "delete"])
def test_permissions(user_role, action):
    # Tests 12 combinations: 3 roles x 4 actions
    pass


# Indirect parametrize (passes values to fixtures)
@pytest.fixture
def user(request):
    return create_user(role=request.param)


@pytest.mark.parametrize("user", ["admin", "editor"], indirect=True)
def test_dashboard_access(user):
    assert user.can_access_dashboard()
\`\`\`

### JUnit 5 (Java)

\`\`\`java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import java.util.stream.Stream;

class DataDrivenTests {

    // ValueSource for simple values
    @ParameterizedTest
    @ValueSource(strings = {"admin@test.com", "user@test.com", "editor@test.com"})
    void testValidEmails(String email) {
        assertTrue(isValidEmail(email));
    }

    // CsvSource for inline tabular data
    @ParameterizedTest
    @CsvSource({
        "admin@test.com, admin123, true",
        "user@test.com, user123, true",
        "invalid, password, false",
        "'', password, false",
    })
    void testLogin(String email, String password, boolean shouldSucceed) {
        LoginResult result = loginService.login(email, password);
        assertEquals(shouldSucceed, result.isSuccess());
    }

    // CsvFileSource for external CSV files
    @ParameterizedTest
    @CsvFileSource(resources = "/test-data/login_data.csv", numLinesToSkip = 1)
    void testLoginFromFile(String email, String password, String expected) {
        LoginResult result = loginService.login(email, password);
        assertEquals(expected, result.getStatus());
    }

    // MethodSource for complex objects
    @ParameterizedTest
    @MethodSource("provideLoginTestData")
    void testLoginWithMethodSource(LoginTestCase testCase) {
        LoginResult result = loginService.login(
            testCase.getEmail(), testCase.getPassword()
        );
        assertEquals(testCase.getExpectedResult(), result.getStatus());
    }

    static Stream<LoginTestCase> provideLoginTestData() {
        return Stream.of(
            new LoginTestCase("admin@test.com", "admin123", "success"),
            new LoginTestCase("invalid", "pass", "error"),
            new LoginTestCase("", "", "error")
        );
    }

    // EnumSource
    @ParameterizedTest
    @EnumSource(UserRole.class)
    void testAllRolesCanLogin(UserRole role) {
        User user = createUser(role);
        assertTrue(loginService.login(user).isSuccess());
    }
}
\`\`\`

### TestNG (Java)

\`\`\`java
import org.testng.annotations.*;

public class DataDrivenTestNG {

    @DataProvider(name = "loginData")
    public Object[][] loginDataProvider() {
        return new Object[][] {
            {"admin@test.com", "admin123", true},
            {"user@test.com", "user123", true},
            {"invalid", "password", false},
            {"", "password", false},
        };
    }

    @Test(dataProvider = "loginData")
    public void testLogin(String email, String password, boolean expected) {
        LoginResult result = loginService.login(email, password);
        Assert.assertEquals(result.isSuccess(), expected);
    }

    // External data provider class
    @Test(dataProvider = "excelData", dataProviderClass = ExcelDataProvider.class)
    public void testFromExcel(Map<String, String> testData) {
        // Test using data from Excel
    }

    // Parallel data provider
    @DataProvider(name = "parallelData", parallel = true)
    public Object[][] parallelDataProvider() {
        return new Object[][] {
            {"scenario1"},
            {"scenario2"},
            {"scenario3"},
        };
    }

    @Test(dataProvider = "parallelData")
    public void testParallelExecution(String scenario) {
        // Runs in parallel
    }
}
\`\`\`

### Playwright (TypeScript)

\`\`\`typescript
import { test, expect } from '@playwright/test';

// Inline data array
const loginCases = [
  { email: 'admin@test.com', password: 'admin123', shouldPass: true },
  { email: 'invalid', password: 'pass', shouldPass: false },
  { email: '', password: '', shouldPass: false },
];

for (const testCase of loginCases) {
  test(\`login with \${testCase.email || 'empty email'}\`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(testCase.email);
    await page.getByLabel('Password').fill(testCase.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    if (testCase.shouldPass) {
      await expect(page).toHaveURL(/dashboard/);
    } else {
      await expect(page.getByTestId('error')).toBeVisible();
    }
  });
}

// From JSON file
import testData from '../data/login-tests.json';

for (const scenario of testData.scenarios) {
  test(\`\${scenario.name}\`, async ({ page }) => {
    // Use scenario data
  });
}
\`\`\`

### Cypress

\`\`\`typescript
// From fixture file
describe('Login scenarios', () => {
  beforeEach(() => {
    cy.fixture('loginData').as('loginData');
  });

  it('should test all login scenarios', function () {
    this.loginData.forEach(
      (scenario: {
        email: string;
        password: string;
        expected: string;
        message: string;
      }) => {
        cy.visit('/login');
        cy.get('[data-testid="email"]').clear().type(scenario.email);
        cy.get('[data-testid="password"]').clear().type(scenario.password);
        cy.get('[data-testid="submit"]').click();

        if (scenario.expected === 'success') {
          cy.url().should('include', '/dashboard');
        } else {
          cy.get('[data-testid="error"]').should('contain', scenario.message);
        }
      }
    );
  });
});

// Dynamic test generation from fixture
describe('Product search', () => {
  const searchTerms = [
    { query: 'laptop', minResults: 5 },
    { query: 'nonexistent-product-xyz', minResults: 0 },
    { query: 'phone case', minResults: 10 },
  ];

  searchTerms.forEach(({ query, minResults }) => {
    it(\`should return at least \${minResults} results for "\${query}"\`, () => {
      cy.visit('/products');
      cy.get('[data-testid="search"]').type(\`\${query}{enter}\`);

      if (minResults === 0) {
        cy.get('[data-testid="no-results"]').should('be.visible');
      } else {
        cy.get('[data-testid="product-card"]').should(
          'have.length.gte',
          minResults
        );
      }
    });
  });
});
\`\`\`

---

## Dynamic Test Generation

Dynamic test generation creates tests at runtime based on external data sources. This is particularly powerful when business rules change frequently and test cases need to stay in sync.

### Python: Generating Tests from API Response

\`\`\`python
import requests
import pytest


def get_product_categories():
    """Fetch categories from the API to generate tests dynamically."""
    response = requests.get("http://localhost:3000/api/categories")
    return response.json()


categories = get_product_categories()


@pytest.mark.parametrize(
    "category",
    categories,
    ids=[c["name"] for c in categories],
)
def test_category_page_loads(page, category):
    page.goto(f"http://localhost:3000/categories/{category['slug']}")
    assert page.title() != ""
    assert page.get_by_role("heading").text_content() == category["name"]
\`\`\`

### TypeScript: Generating Tests from File System

\`\`\`typescript
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Generate tests for every page in the sitemap
const sitemapDir = path.join(__dirname, '../data/pages');
const pages = fs
  .readdirSync(sitemapDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(sitemapDir, f), 'utf-8')));

for (const pageData of pages) {
  test(\`\${pageData.name} page loads correctly\`, async ({ page }) => {
    const response = await page.goto(pageData.url);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test(\`\${pageData.name} has valid meta tags\`, async ({ page }) => {
    await page.goto(pageData.url);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(10);
    expect(title.length).toBeLessThan(70);

    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(description).toBeTruthy();
  });
}
\`\`\`

---

## Data Management Best Practices

### File Organization

\`\`\`
data/
  login/
    valid_credentials.csv
    invalid_credentials.csv
    edge_cases.csv
  products/
    create_product.json
    search_queries.json
  users/
    user_roles.json
    registration_data.xlsx
\`\`\`

### Naming Conventions

Use descriptive names that indicate the test scenario, not just the feature:

- \`login_valid_credentials.csv\` (good)
- \`login_data.csv\` (too vague)
- \`test_data_1.csv\` (terrible)

### Data Versioning

Commit test data files to version control alongside test code. When a test data change causes a failure, the commit history tells you exactly what changed and why.

### Environment-Specific Data

\`\`\`json
{
  "development": {
    "baseUrl": "http://localhost:3000",
    "users": [
      {"email": "dev-admin@test.com", "password": "devpass"}
    ]
  },
  "staging": {
    "baseUrl": "https://staging.example.com",
    "users": [
      {"email": "staging-admin@test.com", "password": "stagingpass"}
    ]
  }
}
\`\`\`

### Data Cleanup

Always clean up test data after tests complete. Data left behind by one test run can cause the next run to fail.

\`\`\`python
@pytest.fixture(autouse=True)
def cleanup_test_data(request):
    created_ids = []
    yield created_ids
    # Cleanup: delete all entities created during the test
    for entity_id in created_ids:
        requests.delete(f"http://localhost:3000/api/entities/{entity_id}")
\`\`\`

### Sensitive Data Handling

Never commit passwords, API keys, or personal information in test data files. Use environment variables or a secrets manager:

\`\`\`python
import os

@pytest.fixture
def admin_credentials():
    return {
        "email": os.getenv("TEST_ADMIN_EMAIL", "admin@test.com"),
        "password": os.getenv("TEST_ADMIN_PASSWORD", "defaultpass"),
    }
\`\`\`

---

## Advanced Patterns

### Cross-Browser Data-Driven Matrix

\`\`\`typescript
const browsers = ['chromium', 'firefox', 'webkit'] as const;
const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

for (const browser of browsers) {
  for (const viewport of viewports) {
    test(\`homepage renders on \${browser} at \${viewport.name}\`, async ({
      playwright,
    }) => {
      const browserInstance = await playwright[browser].launch();
      const context = await browserInstance.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.new_page();
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await context.close();
      await browserInstance.close();
    });
  }
}
\`\`\`

### Negative Testing Data Sets

Include boundary values, special characters, and malicious inputs:

\`\`\`json
{
  "negativeTests": [
    {"input": "", "error": "Field is required"},
    {"input": " ", "error": "Field cannot be blank"},
    {"input": "a", "error": "Minimum 2 characters"},
    {"input": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "error": "Maximum 50 characters"},
    {"input": "<script>alert(1)</script>", "error": "Invalid characters"},
    {"input": "DROP TABLE users;--", "error": "Invalid characters"},
    {"input": "null", "error": null},
    {"input": "undefined", "error": null},
    {"input": "\\n\\r\\t", "error": "Invalid characters"}
  ]
}
\`\`\`

### Combining Data Sources

\`\`\`python
import csv
import json
import pytest


def load_all_login_data():
    """Combine data from multiple sources."""
    all_data = []

    # CSV data
    with open("data/login/valid_credentials.csv", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["source"] = "csv"
            all_data.append(row)

    # JSON data
    with open("data/login/edge_cases.json") as f:
        edge_cases = json.load(f)
        for case in edge_cases:
            case["source"] = "json"
            all_data.append(case)

    return all_data


combined_data = load_all_login_data()


@pytest.mark.parametrize("test_data", combined_data,
    ids=[f"{d['source']}-{d.get('name', d.get('email', 'unknown'))}"
         for d in combined_data])
def test_login_comprehensive(page, test_data):
    # Single test function using data from multiple sources
    pass
\`\`\`

---

## Common Pitfalls

### 1. Too Much Data in One File

If your CSV has 500 rows, split it into logical groups: valid cases, invalid cases, boundary cases, security cases.

### 2. Hardcoded Expected Results

Avoid hardcoding expected values that depend on environment or time:

\`\`\`python
# BAD: breaks if timestamp changes
{"expected_date": "2026-05-18T10:30:00Z"}

# GOOD: use relative or pattern-based expectations
{"expected_date_pattern": "\\\\d{4}-\\\\d{2}-\\\\d{2}T\\\\d{2}:\\\\d{2}:\\\\d{2}Z"}
\`\`\`

### 3. No Test IDs

Always provide meaningful test IDs. Without them, failure reports show cryptic parameter indices:

\`\`\`python
# BAD: "test_login[0]", "test_login[1]"
@pytest.mark.parametrize("email,password", data)

# GOOD: "test_login[admin-login]", "test_login[empty-email]"
@pytest.mark.parametrize("email,password", data,
    ids=["admin-login", "empty-email", "sql-injection"])
\`\`\`

### 4. Shared State Between Data Rows

Each data row should be independent. If row 3 depends on row 2 having run first, your tests are fragile and cannot run in parallel.

---

## Best Practices Summary

1. **Start with inline parametrize, graduate to files.** Do not over-engineer with external files when 5 inline test cases are sufficient.

2. **Use JSON for complex data, CSV for simple tabular data.** Match the format to the complexity of your test data.

3. **Always provide meaningful test IDs.** Every parameterized test case should have a human-readable identifier.

4. **Separate positive, negative, and boundary test data.** Group logically rather than mixing everything in one file.

5. **Version control your test data.** Test data is code. Treat it with the same rigor.

6. **Clean up after tests.** Use fixtures or teardown hooks to remove test data created during execution.

7. **Keep data files small and focused.** One file per feature area, not one monolithic file for the entire application.

8. **Use environment variables for sensitive data.** Never commit real credentials to test data files.

9. **Validate data files in CI.** Add a pre-test step that validates the structure and format of test data files.

10. **Document the data format.** A header comment or README explaining each column prevents confusion.

---

## Integrating with AI Agents

Data-driven testing skills help AI agents generate parameterized tests automatically:

\`\`\`bash
npx @qaskills/cli add data-driven-testing
\`\`\`

Browse all QA skills at [qaskills.sh/skills](/skills).

---

## Conclusion

Data-driven testing is the most efficient way to maximize test coverage without multiplying test code. By separating test logic from test data, you create suites that are easy to extend, easy to maintain, and accessible to the entire team -- including non-technical stakeholders who can contribute test cases through CSV or Excel files.

Choose the right data source for your needs: CSV for simple cases, JSON for structured data, Excel for business-managed test cases, and databases for dynamic or large-scale data. Use the parametrization features built into your framework -- pytest parametrize, JUnit 5 ParameterizedTest, TestNG DataProvider, or Playwright's loop-based generation -- to turn data rows into individual, independently reportable test cases.

The investment in data-driven infrastructure pays off exponentially. Once the test function exists, adding a new scenario is a single row of data. That is the kind of leverage that makes test automation genuinely sustainable at scale.
`,
};
