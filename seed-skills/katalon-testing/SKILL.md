---
name: Katalon Studio Testing
description: Comprehensive testing patterns for Katalon Studio including codeless record-and-playback, Groovy scripted testing, custom keywords, data-driven testing, cross-browser execution, and CI/CD integration with Katalon TestOps.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [katalon, katalon-studio, codeless-testing, groovy, record-playback, test-automation, cross-browser, testops, data-driven, hybrid-testing]
testingTypes: [e2e, integration, api, mobile, visual]
frameworks: [katalon]
languages: [groovy, java, typescript]
domains: [web, mobile, api, desktop]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Katalon Studio Testing Skill

You are an expert in Katalon Studio test automation. When the user asks you to create test automation with Katalon, build hybrid codeless and scripted test suites, integrate with Katalon TestOps, or optimize Katalon test execution, follow these detailed instructions.

## Core Principles

1. **Hybrid approach** -- Use codeless record-and-playback for simple flows and Groovy scripting for complex logic. Neither approach alone covers all testing needs.
2. **Object repository management** -- Maintain a centralized, well-organized Object Repository with meaningful names and multiple locator strategies for self-healing.
3. **Custom keyword libraries** -- Extract reusable logic into custom keywords to avoid duplication across test cases and improve maintainability.
4. **Data-driven test design** -- Separate test data from test logic using Katalon's built-in data file support, external Excel files, or database connections.
5. **Profile-based configuration** -- Use execution profiles to manage environment-specific settings (URLs, credentials, feature flags) without modifying test code.
6. **Parallel execution planning** -- Design tests to be independent and stateless so they can run in parallel across browsers and devices without interference.
7. **TestOps integration** -- Connect Katalon Studio to TestOps for execution scheduling, result aggregation, defect tracking, and team collaboration.

## Project Structure

```
katalon-project/
  Test Cases/
    Smoke/
      TC_Login_Valid_Credentials
      TC_Homepage_Navigation
      TC_Search_Basic
    Regression/
      Auth/
        TC_Login_Multiple_Roles
        TC_Password_Reset_Flow
        TC_Session_Management
      Checkout/
        TC_Cart_Operations
        TC_Payment_Processing
        TC_Order_History
    API/
      TC_API_User_CRUD
      TC_API_Authentication
      TC_API_Error_Handling
  Test Suites/
    TS_Smoke_Suite
    TS_Regression_Full
    TS_API_Suite
    TS_Cross_Browser
  Object Repository/
    Pages/
      LoginPage/
        input_Email
        input_Password
        button_Login
        label_ErrorMessage
      DashboardPage/
        heading_Welcome
        nav_MainMenu
        link_Settings
  Test Data/
    login_credentials.xlsx
    product_catalog.csv
    api_payloads.json
  Keywords/
    com.qa.keywords/
      WebUIKeywords.groovy
      APIKeywords.groovy
      DataKeywords.groovy
      AssertionKeywords.groovy
  Profiles/
    default.glbl
    staging.glbl
    production.glbl
  Reports/
    .gitkeep
```

## Custom Keywords Library

```groovy
// Keywords/com.qa.keywords/WebUIKeywords.groovy
package com.qa.keywords

import com.kms.katalon.core.annotation.Keyword
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.util.KeywordUtil
import org.openqa.selenium.WebDriver
import com.kms.katalon.core.webui.driver.DriverFactory

public class WebUIKeywords {

    @Keyword
    def loginWithCredentials(String email, String password) {
        TestObject emailField = findTestObject('Pages/LoginPage/input_Email')
        TestObject passwordField = findTestObject('Pages/LoginPage/input_Password')
        TestObject loginButton = findTestObject('Pages/LoginPage/button_Login')

        WebUI.setText(emailField, email)
        WebUI.setEncryptedText(passwordField, password)
        WebUI.click(loginButton)
        WebUI.waitForPageLoad(30)

        KeywordUtil.logInfo("Login attempted with email: ${email}")
    }

    @Keyword
    def verifyElementTextContains(TestObject testObject, String expectedText) {
        String actualText = WebUI.getText(testObject)
        if (!actualText.contains(expectedText)) {
            KeywordUtil.markFailed("Expected text '${expectedText}' not found in '${actualText}'")
        }
        KeywordUtil.logInfo("Text verification passed: found '${expectedText}'")
    }

    @Keyword
    def waitForElementAndClick(TestObject testObject, int timeout = 30) {
        WebUI.waitForElementClickable(testObject, timeout)
        WebUI.click(testObject)
        KeywordUtil.logInfo("Clicked element after waiting: ${testObject.getObjectId()}")
    }

    @Keyword
    def takeScreenshotOnFailure(String testCaseName) {
        String screenshotPath = "Reports/Screenshots/${testCaseName}_${System.currentTimeMillis()}.png"
        WebUI.takeScreenshot(screenshotPath)
        KeywordUtil.logInfo("Screenshot saved: ${screenshotPath}")
    }

    @Keyword
    def switchToNewWindow() {
        WebDriver driver = DriverFactory.getWebDriver()
        String originalHandle = driver.getWindowHandle()
        Set<String> allHandles = driver.getWindowHandles()

        for (String handle : allHandles) {
            if (!handle.equals(originalHandle)) {
                driver.switchTo().window(handle)
                KeywordUtil.logInfo("Switched to new window")
                return
            }
        }
        KeywordUtil.markWarning("No new window found to switch to")
    }

    @Keyword
    def scrollToElement(TestObject testObject) {
        WebUI.scrollToElement(testObject, 10)
        WebUI.waitForElementVisible(testObject, 10)
    }

    @Keyword
    def handleAlert(boolean accept = true) {
        if (WebUI.waitForAlert(5)) {
            if (accept) {
                WebUI.acceptAlert()
                KeywordUtil.logInfo("Alert accepted")
            } else {
                WebUI.dismissAlert()
                KeywordUtil.logInfo("Alert dismissed")
            }
        }
    }

    @Keyword
    def verifyPageURL(String expectedURL) {
        String currentURL = WebUI.getUrl()
        if (!currentURL.contains(expectedURL)) {
            KeywordUtil.markFailed("Expected URL containing '${expectedURL}' but got '${currentURL}'")
        }
    }

    @Keyword
    def clearAndType(TestObject testObject, String text) {
        WebUI.clearText(testObject)
        WebUI.sendKeys(testObject, text)
    }
}
```

## API Testing Keywords

```groovy
// Keywords/com.qa.keywords/APIKeywords.groovy
package com.qa.keywords

import com.kms.katalon.core.annotation.Keyword
import com.kms.katalon.core.testobject.RequestObject
import com.kms.katalon.core.testobject.ResponseObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.util.KeywordUtil
import groovy.json.JsonSlurper
import groovy.json.JsonOutput

public class APIKeywords {

    @Keyword
    def sendRequestAndValidate(RequestObject request, int expectedStatus) {
        ResponseObject response = WS.sendRequest(request)
        WS.verifyResponseStatusCode(response, expectedStatus)

        KeywordUtil.logInfo("Response status: ${response.getStatusCode()}")
        KeywordUtil.logInfo("Response time: ${response.getElapsedTime()}ms")

        return response
    }

    @Keyword
    def extractJsonValue(ResponseObject response, String jsonPath) {
        String body = response.getResponseBodyContent()
        def json = new JsonSlurper().parseText(body)
        def value = evaluateJsonPath(json, jsonPath)

        KeywordUtil.logInfo("Extracted '${jsonPath}': ${value}")
        return value
    }

    @Keyword
    def verifyJsonSchema(ResponseObject response, Map expectedSchema) {
        String body = response.getResponseBodyContent()
        def json = new JsonSlurper().parseText(body)

        expectedSchema.each { key, type ->
            if (!json.containsKey(key)) {
                KeywordUtil.markFailed("Missing field: ${key}")
            }
            if (json[key] != null && !json[key].getClass().getSimpleName().equalsIgnoreCase(type)) {
                KeywordUtil.markWarning("Field '${key}' expected type '${type}' but got '${json[key].getClass().getSimpleName()}'")
            }
        }
    }

    @Keyword
    def verifyResponseTime(ResponseObject response, long maxTimeMs) {
        long elapsed = response.getElapsedTime()
        if (elapsed > maxTimeMs) {
            KeywordUtil.markWarning("Response time ${elapsed}ms exceeded threshold ${maxTimeMs}ms")
        }
    }

    @Keyword
    def buildRequestWithAuth(String url, String method, String token, Map body = null) {
        RequestObject request = new RequestObject()
        request.setRestUrl(url)
        request.setRestRequestMethod(method)
        request.getHttpHeaderProperties().add(
            new com.kms.katalon.core.testobject.TestObjectProperty('Authorization', 'HEADER', "Bearer ${token}")
        )
        request.getHttpHeaderProperties().add(
            new com.kms.katalon.core.testobject.TestObjectProperty('Content-Type', 'HEADER', 'application/json')
        )

        if (body != null) {
            request.setBodyContent(new com.kms.katalon.core.testobject.impl.HttpTextBodyContent(JsonOutput.toJson(body)))
        }

        return request
    }

    private def evaluateJsonPath(def json, String path) {
        def current = json
        path.split('\\.').each { segment ->
            if (segment.contains('[')) {
                def parts = segment.split('\\[')
                current = current[parts[0]]
                def index = parts[1].replace(']', '').toInteger()
                current = current[index]
            } else {
                current = current[segment]
            }
        }
        return current
    }
}
```

## Data-Driven Test Case

```groovy
// Test Cases/Regression/Auth/TC_Login_Multiple_Roles.groovy
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.model.FailureHandling
import com.qa.keywords.WebUIKeywords as CustomWebUI
import internal.GlobalVariable

// Read test data from external file
def testData = findTestData('Test Data/login_credentials')
def customUI = new CustomWebUI()

for (int row = 1; row <= testData.getRowNumbers(); row++) {
    String email = testData.getValue('email', row)
    String password = testData.getValue('password', row)
    String expectedRole = testData.getValue('role', row)
    String expectedPage = testData.getValue('expected_page', row)

    WebUI.comment("Testing login for role: ${expectedRole}")

    // Navigate to login page
    WebUI.openBrowser('')
    WebUI.navigateToUrl(GlobalVariable.BASE_URL + '/login')
    WebUI.maximizeWindow()

    // Perform login
    customUI.loginWithCredentials(email, password)

    // Verify redirect based on role
    customUI.verifyPageURL(expectedPage)

    // Role-specific verifications
    switch (expectedRole) {
        case 'admin':
            WebUI.verifyElementPresent(findTestObject('Pages/DashboardPage/nav_AdminPanel'), 10)
            break
        case 'user':
            WebUI.verifyElementPresent(findTestObject('Pages/DashboardPage/heading_Welcome'), 10)
            break
        case 'guest':
            WebUI.verifyElementPresent(findTestObject('Pages/GuestPage/heading_LimitedAccess'), 10)
            break
    }

    // Cleanup
    WebUI.closeBrowser()
}
```

## Test Suite Configuration

```groovy
// Test Suites/TS_Cross_Browser configuration
// This is configured via Katalon Studio UI but here is the equivalent settings

/*
Test Suite: TS_Cross_Browser
Execution Information:
  - Run configuration: Parallel
  - Max concurrent instances: 3

Test Cases:
  1. Test Cases/Smoke/TC_Login_Valid_Credentials
  2. Test Cases/Smoke/TC_Homepage_Navigation
  3. Test Cases/Smoke/TC_Search_Basic

Environments:
  - Chrome (latest)
  - Firefox (latest)
  - Edge (latest)

Retry:
  - Retry failed test cases: 1 time
  - Retry immediately

Mail Settings:
  - Send email on: Failure
  - Recipients: qa-team@company.com
*/
```

## TestOps Integration Script

```groovy
// Scripts/katalon-testops-upload.groovy
import com.kms.katalon.core.configuration.RunConfiguration

// Configure TestOps integration
def projectDir = RunConfiguration.getProjectDir()
def reportDir = "${projectDir}/Reports"

// TestOps configuration is set in Project Settings
// Project Settings > Katalon TestOps > Enable Integration
// Organization: your-org
// Project: your-project
// Team: your-team

// Execution results are automatically uploaded to TestOps
// when the integration is enabled and API key is configured

println "Report directory: ${reportDir}"
println "TestOps integration: ${RunConfiguration.getExecutionProperty('katalon.testops.enabled', 'false')}"
```

## CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/katalon-tests.yml
name: Katalon Test Execution
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Katalon
        uses: katalon-studio/katalon-studio-github-action@v3
        with:
          version: '9.0.0'
          projectPath: '${{ github.workspace }}'
          args: >-
            -testSuitePath="Test Suites/TS_Smoke_Suite"
            -browserType="Chrome (headless)"
            -retry=1
            -statusDelay=30
            -apiKey=${{ secrets.KATALON_API_KEY }}

      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: katalon-reports
          path: Reports/
```

## Test Listeners for Common Operations

```groovy
// Test Listeners/TestListener.groovy
import com.kms.katalon.core.annotation.AfterTestCase
import com.kms.katalon.core.annotation.BeforeTestCase
import com.kms.katalon.core.annotation.AfterTestSuite
import com.kms.katalon.core.context.TestCaseContext
import com.kms.katalon.core.context.TestSuiteContext
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.util.KeywordUtil

class TestListener {

    @BeforeTestCase
    def beforeTestCase(TestCaseContext testCaseContext) {
        KeywordUtil.logInfo("Starting test: ${testCaseContext.getTestCaseId()}")
        // Set implicit wait for all tests
        WebUI.openBrowser('')
        WebUI.maximizeWindow()
    }

    @AfterTestCase
    def afterTestCase(TestCaseContext testCaseContext) {
        // Capture screenshot on failure
        if (testCaseContext.getTestCaseStatus() == 'FAILED') {
            String screenshotName = testCaseContext.getTestCaseId().replace('/', '_')
            String path = "Reports/Screenshots/${screenshotName}_${System.currentTimeMillis()}.png"
            WebUI.takeScreenshot(path)
            KeywordUtil.logInfo("Failure screenshot saved: ${path}")
        }

        // Always close browser after each test
        WebUI.closeBrowser()
        KeywordUtil.logInfo("Completed: ${testCaseContext.getTestCaseId()} - ${testCaseContext.getTestCaseStatus()}")
    }

    @AfterTestSuite
    def afterTestSuite(TestSuiteContext testSuiteContext) {
        KeywordUtil.logInfo("Suite completed: ${testSuiteContext.getTestSuiteId()}")
        KeywordUtil.logInfo("Total: ${testSuiteContext.getNumberOfTotalTestCases()}")
        KeywordUtil.logInfo("Passed: ${testSuiteContext.getNumberOfPassedTestCases()}")
        KeywordUtil.logInfo("Failed: ${testSuiteContext.getNumberOfFailedTestCases()}")
    }
}
```

## Object Repository Best Practices

The Object Repository is the foundation of maintainable Katalon test automation. Organize test objects into folders that mirror your application's page structure. Each test object should have a meaningful name that describes the element's purpose, not its technical implementation.

For each test object, configure multiple locator strategies in priority order. Start with ID or name attributes, then add CSS selectors, and finally XPath as a fallback. Katalon's Self-Healing feature uses these alternative locators when the primary one fails, automatically adapting to UI changes.

Use parameterized test objects for dynamic elements. If you have a table with rows that can be identified by an index or a data value, create a parameterized object that accepts the identifier as a variable. This avoids creating separate test objects for each row.

Regularly audit the Object Repository for orphaned objects that are no longer referenced by any test case. Orphaned objects add clutter and confusion. Katalon does not automatically detect unused objects, so schedule quarterly cleanup sessions.

## Best Practices

1. **Use Object Repository for all elements** -- Never hardcode selectors in test scripts. Always use the Object Repository so changes propagate automatically.
2. **Create custom keywords for repeated actions** -- If you find yourself writing the same 3+ steps in multiple test cases, extract them into a custom keyword.
3. **Use execution profiles for environment management** -- Store URLs, credentials, and feature flags in profiles, not in test code or global variables.
4. **Enable self-healing in Katalon** -- Turn on Smart Wait and Self-Healing to handle dynamic elements without manual intervention.
5. **Design tests for parallel execution** -- Each test case should be independent. Do not rely on test execution order or shared state between tests.
6. **Version control your Katalon project** -- Use git for your Katalon project. Exclude Reports and Drivers folders from version control.
7. **Use test listeners for common setup/teardown** -- Implement test listeners for screenshots on failure, browser cleanup, and logging instead of duplicating in each test.
8. **Organize Object Repository by page** -- Group test objects by page or feature for easy navigation and maintenance.
9. **Add meaningful comments in Groovy scripts** -- Katalon projects are often maintained by team members with varying Groovy experience. Clear comments help.
10. **Schedule nightly regression runs via TestOps** -- Use TestOps scheduling to run full regression suites overnight and review results each morning.

## Anti-Patterns

1. **Recording all tests without refactoring** -- Recorded tests contain redundant steps and hardcoded data. Always refactor recordings into reusable keywords.
2. **Using Thread.sleep() for synchronization** -- Katalon provides WebUI.waitForElement* methods. Using Thread.sleep creates brittle, slow tests.
3. **Storing sensitive data in profiles** -- Passwords, API keys, and tokens should use Katalon's encrypted text or external secret management, not plain text profiles.
4. **Ignoring Katalon's built-in assertions** -- Writing custom assertion logic when WebUI.verify* methods cover the need adds unnecessary complexity.
5. **Running all tests in a single suite** -- Monolithic test suites are slow and hard to debug. Break them into Smoke, Regression, and API suites.
6. **Not using data-driven testing** -- Copying test cases with different data creates maintenance nightmares. Use Test Data files for parameterized testing.
7. **Skipping test case cleanup** -- Tests that do not clean up after themselves (logout, delete test data) cause cascading failures in subsequent tests.
8. **Hardcoding XPath selectors** -- XPath is fragile against DOM changes. Prefer ID, CSS, or Katalon's smart locators.
9. **Not configuring retry for flaky tests** -- Some tests are legitimately flaky due to network or timing issues. Configure 1-2 retries to reduce false failures.
10. **Ignoring TestOps analytics** -- TestOps provides failure trends, flaky test detection, and execution insights. Not reviewing these means missing optimization opportunities.
