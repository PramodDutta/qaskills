---
name: "Behat BDD Testing"
description: "PHP BDD testing with Behat framework using Gherkin feature files, Mink browser extension, context classes, and Symfony integration for behavior-driven acceptance testing."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [behat, bdd, php, gherkin, mink, symfony, acceptance-testing, feature-files]
testingTypes: [bdd, acceptance, e2e, integration]
frameworks: [behat]
languages: [php]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Behat BDD Testing

You are an expert QA engineer specializing in Behat, the PHP BDD testing framework. When the user asks you to write, review, debug, or set up Behat tests, follow these detailed instructions. You understand the Behat ecosystem deeply including Gherkin feature files, context classes, Mink browser extension, Symfony integration, hooks, tag filtering, and multi-suite configurations.

## Core Principles

1. **Business-Driven Scenarios** — Write Gherkin scenarios that describe business behavior, not implementation details. Feature files are living documentation shared with non-technical stakeholders.
2. **Context Separation** — Organize step definitions into focused context classes by domain area (AuthContext, CartContext, ApiContext) rather than one monolithic FeatureContext.
3. **Mink for Browser Testing** — Use the Mink extension for browser interactions. Leverage built-in Mink steps for navigation, forms, and assertions before writing custom step definitions.
4. **Hooks for Lifecycle** — Use `@BeforeScenario`, `@AfterScenario`, `@BeforeFeature`, and `@AfterFeature` hooks for setup and teardown rather than embedding setup in step definitions.
5. **Suite Organization** — Define separate suites in `behat.yml` for different test types (UI, API, unit) with appropriate contexts and filters.
6. **Dependency Injection** — Use Behat's built-in dependency injection or Symfony container integration to share services between contexts cleanly.
7. **Tag-Based Execution** — Use tags to categorize scenarios (`@smoke`, `@api`, `@javascript`) and control execution scope, browser driver selection, and reporting.

## Project Structure

```
project-root/
├── behat.yml                      # Main configuration
├── composer.json
├── features/
│   ├── auth/
│   │   ├── login.feature
│   │   ├── registration.feature
│   │   └── password_reset.feature
│   ├── shopping/
│   │   ├── cart.feature
│   │   ├── checkout.feature
│   │   └── product_search.feature
│   ├── api/
│   │   ├── users_api.feature
│   │   └── orders_api.feature
│   └── bootstrap/
│       ├── AuthContext.php
│       ├── ShoppingContext.php
│       ├── ApiContext.php
│       ├── NavigationContext.php
│       └── DatabaseContext.php
├── src/
│   └── Page/
│       ├── BasePage.php
│       ├── LoginPage.php
│       ├── DashboardPage.php
│       └── CartPage.php
├── config/
│   ├── behat/
│   │   ├── dev.yml
│   │   └── ci.yml
│   └── services_test.yaml
└── reports/
    ├── screenshots/
    └── html/
```

## Detailed Code Examples

### Feature File (Gherkin)

```gherkin
# features/auth/login.feature
@auth @javascript
Feature: User Authentication
  In order to access my account
  As a registered user
  I need to be able to log in

  Background:
    Given I am on the login page

  @smoke @positive
  Scenario: Successful login with valid credentials
    When I fill in "email" with "user@example.com"
    And I fill in "password" with "SecurePass123"
    And I press "Login"
    Then I should be on the dashboard page
    And I should see "Welcome back"

  @negative
  Scenario: Login fails with wrong password
    When I fill in "email" with "user@example.com"
    And I fill in "password" with "wrongpassword"
    And I press "Login"
    Then I should see "Invalid credentials"
    And I should be on the login page

  @negative
  Scenario Outline: Login validation errors
    When I fill in "email" with "<email>"
    And I fill in "password" with "<password>"
    And I press "Login"
    Then I should see "<error>"

    Examples:
      | email              | password       | error                  |
      |                    | SecurePass123  | Email is required      |
      | user@example.com   |                | Password is required   |
      | not-an-email       | SecurePass123  | Invalid email format   |

  @slow @regression
  Scenario: Account lockout after failed attempts
    When I attempt to login 5 times with wrong password
    Then I should see "Account locked"
    And I should receive a lockout notification email
```

### Context Class with Step Definitions

```php
<?php
// features/bootstrap/AuthContext.php

use Behat\Behat\Context\Context;
use Behat\Behat\Hook\Scope\BeforeScenarioScope;
use Behat\Behat\Hook\Scope\AfterScenarioScope;
use Behat\MinkExtension\Context\MinkContext;
use Behat\Gherkin\Node\TableNode;

class AuthContext extends MinkContext implements Context
{
    private string $baseUrl;
    private array $testUsers = [];

    public function __construct(string $baseUrl = 'http://localhost:8000')
    {
        $this->baseUrl = $baseUrl;
    }

    /**
     * @BeforeScenario
     */
    public function setupScenario(BeforeScenarioScope $scope): void
    {
        $this->testUsers = [];
    }

    /**
     * @AfterScenario
     */
    public function teardownScenario(AfterScenarioScope $scope): void
    {
        if ($scope->getTestResult()->getResultCode() === \Behat\Testwork\Tester\Result\TestResult::FAILED) {
            $this->saveScreenshot(
                'failure_' . date('Y-m-d_H-i-s') . '.png',
                __DIR__ . '/../../reports/screenshots'
            );
        }
    }

    /**
     * @Given I am on the login page
     */
    public function iAmOnTheLoginPage(): void
    {
        $this->visit($this->baseUrl . '/login');
        $this->assertPageContainsText('Login');
    }

    /**
     * @Then I should be on the dashboard page
     */
    public function iShouldBeOnTheDashboardPage(): void
    {
        $this->assertPageAddress('/dashboard');
        $this->assertResponseStatus(200);
    }

    /**
     * @When I attempt to login :count times with wrong password
     */
    public function iAttemptLoginMultipleTimes(int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            $this->fillField('email', 'user@example.com');
            $this->fillField('password', 'wrong_' . $i);
            $this->pressButton('Login');
        }
    }

    /**
     * @Then I should receive a lockout notification email
     */
    public function iShouldReceiveLockoutEmail(): void
    {
        // Check mail catcher or test mail service
        $response = file_get_contents($this->baseUrl . '/api/test/emails/latest');
        $email = json_decode($response, true);
        assert(str_contains($email['subject'], 'Account Locked'));
    }

    /**
     * @Given the following users exist:
     */
    public function theFollowingUsersExist(TableNode $table): void
    {
        foreach ($table->getHash() as $row) {
            $this->createTestUser($row['name'], $row['email'], $row['role'] ?? 'user');
        }
    }

    private function createTestUser(string $name, string $email, string $role): void
    {
        $client = new \GuzzleHttp\Client();
        $response = $client->post($this->baseUrl . '/api/test/users', [
            'json' => compact('name', 'email', 'role')
        ]);
        $this->testUsers[] = json_decode($response->getBody(), true);
    }
}
```

### API Testing Context

```php
<?php
// features/bootstrap/ApiContext.php

use Behat\Behat\Context\Context;
use Behat\Gherkin\Node\PyStringNode;
use Behat\Gherkin\Node\TableNode;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class ApiContext implements Context
{
    private Client $client;
    private ?object $response = null;
    private array $headers = ['Content-Type' => 'application/json'];
    private ?string $authToken = null;

    public function __construct(string $baseUrl = 'http://localhost:8000')
    {
        $this->client = new Client([
            'base_uri' => $baseUrl,
            'http_errors' => false,
        ]);
    }

    /**
     * @Given I am authenticated as :role
     */
    public function iAmAuthenticatedAs(string $role): void
    {
        $response = $this->client->post('/api/auth/login', [
            'json' => [
                'email' => "{$role}@example.com",
                'password' => 'TestPass123',
            ],
        ]);
        $data = json_decode($response->getBody(), true);
        $this->authToken = $data['token'];
        $this->headers['Authorization'] = "Bearer {$this->authToken}";
    }

    /**
     * @When I send a :method request to :url
     */
    public function iSendRequest(string $method, string $url): void
    {
        $this->response = $this->client->request($method, $url, [
            'headers' => $this->headers,
        ]);
    }

    /**
     * @When I send a :method request to :url with body:
     */
    public function iSendRequestWithBody(string $method, string $url, PyStringNode $body): void
    {
        $this->response = $this->client->request($method, $url, [
            'headers' => $this->headers,
            'body' => $body->getRaw(),
        ]);
    }

    /**
     * @Then the response status code should be :statusCode
     */
    public function theResponseStatusCodeShouldBe(int $statusCode): void
    {
        $actual = $this->response->getStatusCode();
        assert($actual === $statusCode, "Expected status {$statusCode}, got {$actual}");
    }

    /**
     * @Then the response should contain JSON key :key with value :value
     */
    public function responseContainsJsonKeyValue(string $key, string $value): void
    {
        $data = json_decode($this->response->getBody(), true);
        assert(isset($data[$key]), "Key '{$key}' not found in response");
        assert((string) $data[$key] === $value, "Expected '{$value}', got '{$data[$key]}'");
    }

    /**
     * @Then the response should contain :count items
     */
    public function responseContainsItems(int $count): void
    {
        $data = json_decode($this->response->getBody(), true);
        $actual = is_array($data) ? count($data) : count($data['data'] ?? []);
        assert($actual === $count, "Expected {$count} items, got {$actual}");
    }
}
```

### Page Object Pattern

```php
<?php
// src/Page/BasePage.php

namespace App\Page;

use Behat\Mink\Session;
use Behat\Mink\Element\NodeElement;

abstract class BasePage
{
    protected Session $session;
    protected int $timeout = 10;

    public function __construct(Session $session)
    {
        $this->session = $session;
    }

    protected function find(string $selector): ?NodeElement
    {
        return $this->session->getPage()->find('css', $selector);
    }

    protected function findAll(string $selector): array
    {
        return $this->session->getPage()->findAll('css', $selector);
    }

    protected function waitFor(string $selector, int $timeout = null): NodeElement
    {
        $timeout = $timeout ?? $this->timeout;
        $start = time();
        while (time() - $start < $timeout) {
            $element = $this->find($selector);
            if ($element && $element->isVisible()) {
                return $element;
            }
            usleep(250000); // 250ms
        }
        throw new \RuntimeException("Element '{$selector}' not found within {$timeout}s");
    }

    protected function fillField(string $selector, string $value): void
    {
        $element = $this->waitFor($selector);
        $element->setValue($value);
    }

    protected function click(string $selector): void
    {
        $element = $this->waitFor($selector);
        $element->click();
    }

    protected function getText(string $selector): string
    {
        return $this->waitFor($selector)->getText();
    }

    public function getCurrentUrl(): string
    {
        return $this->session->getCurrentUrl();
    }
}

// src/Page/LoginPage.php
namespace App\Page;

class LoginPage extends BasePage
{
    private const EMAIL_INPUT = '[data-testid="email-input"]';
    private const PASSWORD_INPUT = '[data-testid="password-input"]';
    private const SUBMIT_BUTTON = '[data-testid="login-submit"]';
    private const ERROR_MESSAGE = '[data-testid="error-message"]';

    public function open(string $baseUrl): void
    {
        $this->session->visit("{$baseUrl}/login");
    }

    public function login(string $email, string $password): void
    {
        $this->fillField(self::EMAIL_INPUT, $email);
        $this->fillField(self::PASSWORD_INPUT, $password);
        $this->click(self::SUBMIT_BUTTON);
    }

    public function getErrorMessage(): string
    {
        return $this->getText(self::ERROR_MESSAGE);
    }

    public function isLoaded(): bool
    {
        return $this->find(self::EMAIL_INPUT) !== null;
    }
}
```

### Behat Configuration

```yaml
# behat.yml
default:
  autoload:
    '': '%paths.base%/features/bootstrap'
  suites:
    ui:
      paths: ['%paths.base%/features']
      filters:
        tags: '~@api'
      contexts:
        - AuthContext:
            baseUrl: 'http://localhost:8000'
        - ShoppingContext
        - NavigationContext
    api:
      paths: ['%paths.base%/features/api']
      contexts:
        - ApiContext:
            baseUrl: 'http://localhost:8000'
  extensions:
    Behat\MinkExtension:
      base_url: 'http://localhost:8000'
      sessions:
        default:
          goutte: ~
        javascript:
          selenium2:
            browser: chrome
            capabilities:
              browserName: chrome
              extra_capabilities:
                goog:chromeOptions:
                  args:
                    - '--headless'
                    - '--no-sandbox'
                    - '--window-size=1920,1080'
  formatters:
    pretty:
      verbose: true
      paths: false

ci:
  extensions:
    Behat\MinkExtension:
      sessions:
        javascript:
          selenium2:
            browser: chrome
            capabilities:
              browserName: chrome
              extra_capabilities:
                goog:chromeOptions:
                  args:
                    - '--headless'
                    - '--no-sandbox'
                    - '--disable-dev-shm-usage'
```

### Custom Formatter and Hooks

```php
<?php
// features/bootstrap/ScreenshotContext.php

use Behat\Behat\Context\Context;
use Behat\Behat\Hook\Scope\AfterStepScope;
use Behat\Mink\Driver\Selenium2Driver;
use Behat\MinkExtension\Context\RawMinkContext;

class ScreenshotContext extends RawMinkContext implements Context
{
    private string $screenshotDir;

    public function __construct(string $screenshotDir = 'reports/screenshots')
    {
        $this->screenshotDir = $screenshotDir;
        if (!is_dir($this->screenshotDir)) {
            mkdir($this->screenshotDir, 0755, true);
        }
    }

    /**
     * @AfterStep
     */
    public function takeScreenshotOnFailure(AfterStepScope $scope): void
    {
        if ($scope->getTestResult()->getResultCode() !== 99) {
            return; // Not a failure
        }

        $driver = $this->getMink()->getSession()->getDriver();
        if (!$driver instanceof Selenium2Driver) {
            return;
        }

        $filename = sprintf(
            '%s/%s_%s_%d.png',
            $this->screenshotDir,
            date('Y-m-d_H-i-s'),
            preg_replace('/[^a-zA-Z0-9]/', '_', $scope->getStep()->getText()),
            $scope->getStep()->getLine()
        );

        file_put_contents($filename, $driver->getScreenshot());
        echo "Screenshot: {$filename}\n";
    }
}
```

### CI/CD Integration (GitHub Actions)

```yaml
name: Behat BDD Tests
on: [push, pull_request]

jobs:
  behat:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_DATABASE: test_db
          MYSQL_ROOT_PASSWORD: secret
        ports: ['3306:3306']
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: pdo_mysql, mbstring
      - run: composer install --no-interaction
      - name: Start application
        run: php -S localhost:8000 -t public &
        env:
          DATABASE_URL: mysql://root:secret@127.0.0.1:3306/test_db
      - name: Run Behat tests
        run: vendor/bin/behat --profile=ci --format=junit --out=reports/junit
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-reports
          path: reports/
```

## Best Practices

1. **Use Mink's built-in steps first** before writing custom step definitions. Mink provides dozens of ready-to-use steps for navigation, forms, and assertions.
2. **Separate contexts by domain** — AuthContext, CartContext, ApiContext. Each context should handle one area of the application.
3. **Use constructor injection** in contexts for configuration values (base URL, credentials, timeouts).
4. **Tag JavaScript-dependent scenarios** with `@javascript` to automatically use Selenium driver instead of Goutte.
5. **Use Background for shared Given steps** across scenarios within a feature instead of repeating setup steps.
6. **Implement screenshot-on-failure** in hooks to capture visual evidence for debugging failed scenarios.
7. **Use Scenario Outline** with Examples tables for data-driven testing instead of duplicating scenarios.
8. **Configure multiple suites** (UI, API, unit) in behat.yml with appropriate contexts and filters.
9. **Run database transactions** in hooks — wrap each scenario in a transaction and roll back after, keeping the database clean.
10. **Use profiles** for different environments (dev, CI, staging) with environment-specific configuration overrides.

## Anti-Patterns to Avoid

1. **Avoid monolithic FeatureContext** — Do not put all step definitions in one class. Split by domain into focused context classes.
2. **Avoid technical Gherkin** — `When I click CSS selector .btn-primary` is wrong. Use `When I submit the form` for business-readable scenarios.
3. **Avoid scenario coupling** — Scenarios must be independent. Never rely on a previous scenario's side effects.
4. **Avoid sleep() calls** — Use Mink's `waitFor()` or custom wait helpers instead of `sleep()` for timing.
5. **Avoid hardcoded URLs** — Pass base URL through behat.yml configuration or constructor parameters.
6. **Avoid mixing concerns** — Step definitions should not contain SQL queries, HTTP requests, and browser interactions in the same class.
7. **Avoid missing cleanup** — Always clean up test data in `@AfterScenario` hooks. Leftover data causes flaky subsequent tests.
8. **Avoid ignoring Goutte** — Use the fast Goutte driver for non-JavaScript scenarios. Only use Selenium when JavaScript interaction is required.
9. **Avoid long scenarios** — Keep scenarios under 10 steps. Long scenarios indicate the feature needs decomposition.
10. **Avoid undocumented steps** — Add PHPDoc comments to all step definition methods explaining their purpose and parameters.
