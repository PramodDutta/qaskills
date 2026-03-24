---
name: Codeception Testing
description: Expert-level Codeception testing skill for PHP applications. Covers acceptance, functional, and unit testing with the Actor pattern, BDD-style syntax, Page Objects, API testing, and database helpers.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [codeception, php, acceptance-testing, functional-testing, bdd, actor-pattern, web-testing]
testingTypes: [e2e, functional, unit, integration, api]
frameworks: [codeception, phpunit]
languages: [php]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Codeception Testing Skill

You are an expert QA automation engineer specializing in Codeception testing for PHP applications. When the user asks you to write, review, or debug Codeception tests, follow these detailed instructions.

## Core Principles

1. **Actor-centric design** -- All tests use the `$I` actor object (`AcceptanceTester`, `FunctionalTester`, `UnitTester`). Write tests as user stories: `$I->amOnPage()`, `$I->see()`, `$I->click()`.
2. **Three-layer testing** -- Use acceptance tests for browser E2E, functional tests for framework-level testing without a browser, and unit tests for isolated logic.
3. **Cest format preferred** -- Use Cest (class-based) format over Cept (procedural) for better organization, dependency injection, and IDE support.
4. **Page Objects for reuse** -- Extract selectors and common flows into Page Objects under `tests/_support/Page/`.
5. **Test isolation** -- Each test method must be independent. Use `_before()` hooks for setup and database transactions for clean state.

## Project Structure

Always organize Codeception projects with this structure:

```
tests/
  Acceptance/
    LoginCest.php
    DashboardCest.php
    CheckoutCest.php
  Functional/
    UserCest.php
    ApiCest.php
  Unit/
    Services/
      PaymentServiceTest.php
    Models/
      UserTest.php
  _support/
    AcceptanceTester.php
    FunctionalTester.php
    UnitTester.php
    Page/
      Acceptance/
        LoginPage.php
        DashboardPage.php
      Functional/
        UserPage.php
    Helper/
      Acceptance.php
      Functional.php
      Api.php
    Data/
      TestDataFactory.php
  _data/
    dump.sql
    fixtures/
  _output/
codeception.yml
tests/Acceptance.suite.yml
tests/Functional.suite.yml
tests/Unit.suite.yml
```

## Setup

### Installation

```bash
composer require --dev codeception/codeception
composer require --dev codeception/module-webdriver
composer require --dev codeception/module-phpbrowser
composer require --dev codeception/module-asserts
composer require --dev codeception/module-db
composer require --dev codeception/module-rest

# Initialize project structure
php vendor/bin/codecept bootstrap

# Generate suites
php vendor/bin/codecept generate:suite acceptance
php vendor/bin/codecept generate:suite functional
php vendor/bin/codecept generate:suite api
```

### Acceptance Suite Configuration (Acceptance.suite.yml)

```yaml
actor: AcceptanceTester
modules:
  enabled:
    - WebDriver:
        url: http://localhost:8000
        browser: chrome
        window_size: 1920x1080
        capabilities:
          chromeOptions:
            args:
              - "--headless"
              - "--no-sandbox"
              - "--disable-gpu"
    - \Tests\Support\Helper\Acceptance
  step_decorators:
    - \Codeception\Step\Retry
```

### Functional Suite Configuration (Functional.suite.yml)

```yaml
actor: FunctionalTester
modules:
  enabled:
    - PhpBrowser:
        url: http://localhost:8000
    - \Tests\Support\Helper\Functional
    - Asserts
```

## Acceptance Test Patterns

### Login Test (Cest Format)

```php
<?php

namespace Tests\Acceptance;

use Tests\Support\AcceptanceTester;
use Tests\Support\Page\Acceptance\LoginPage;

class LoginCest
{
    public function _before(AcceptanceTester $I): void
    {
        $I->amOnPage('/');
    }

    public function loginWithValidCredentials(AcceptanceTester $I): void
    {
        $I->amOnPage('/login');
        $I->fillField('#email', 'user@test.com');
        $I->fillField('#password', 'password123');
        $I->click('button[type=submit]');
        $I->waitForElement('.dashboard', 10);
        $I->see('Welcome', '.welcome-message');
        $I->seeCurrentUrlEquals('/dashboard');
    }

    public function loginShowsErrorForInvalidCredentials(AcceptanceTester $I): void
    {
        $I->amOnPage('/login');
        $I->fillField('#email', 'wrong@test.com');
        $I->fillField('#password', 'wrong');
        $I->click('button[type=submit]');
        $I->waitForElement('.error-message', 5);
        $I->see('Invalid credentials', '.error-message');
        $I->seeCurrentUrlEquals('/login');
    }

    public function loginRequiresAllFields(AcceptanceTester $I): void
    {
        $I->amOnPage('/login');
        $I->click('button[type=submit]');
        $I->see('Email is required');
        $I->see('Password is required');
    }
}
```

## Actor Methods Reference

```php
// Navigation
$I->amOnPage('/path');
$I->seeCurrentUrlEquals('/expected');
$I->seeCurrentUrlMatches('~^/users/\d+$~');
$I->seeInCurrentUrl('/partial');

// Forms
$I->fillField('#email', 'value');
$I->fillField('Email', 'value');              // by label
$I->selectOption('#role', 'Admin');
$I->checkOption('#agree');
$I->uncheckOption('#newsletter');
$I->attachFile('#avatar', 'photo.jpg');
$I->click('Submit');
$I->click('button[type=submit]');
$I->click(['css' => '.submit-btn']);

// Assertions
$I->see('text');
$I->see('text', '.selector');
$I->dontSee('error');
$I->seeElement('#element');
$I->dontSeeElement('.hidden');
$I->seeInField('#email', 'user@test.com');
$I->seeCheckboxIsChecked('#agree');
$I->seeNumberOfElements('.item', 5);
$I->seeLink('Click Here', '/url');

// Waiting (WebDriver only)
$I->waitForElement('.element', 10);
$I->waitForElementVisible('.modal', 5);
$I->waitForElementNotVisible('.spinner', 15);
$I->waitForText('Loaded', 10, '.container');
$I->wait(1);  // avoid -- only for debugging

// Grabbing values
$text = $I->grabTextFrom('.element');
$value = $I->grabValueFrom('#input');
$attr = $I->grabAttributeFrom('a', 'href');
$count = $I->grabNumRecords('users', ['status' => 'active']);

// Cookies and sessions
$I->setCookie('name', 'value');
$I->grabCookie('name');
$I->resetCookie('name');
```

## Page Object Pattern

### Login Page Object

```php
<?php

namespace Tests\Support\Page\Acceptance;

use Tests\Support\AcceptanceTester;

class LoginPage
{
    public static string $url = '/login';
    public static string $emailField = '#email';
    public static string $passwordField = '#password';
    public static string $submitButton = 'button[type=submit]';
    public static string $errorMessage = '.error-message';
    public static string $welcomeMessage = '.welcome-message';

    protected AcceptanceTester $I;

    public function __construct(AcceptanceTester $I)
    {
        $this->I = $I;
    }

    public function open(): self
    {
        $this->I->amOnPage(self::$url);
        return $this;
    }

    public function loginAs(string $email, string $password): void
    {
        $this->I->fillField(self::$emailField, $email);
        $this->I->fillField(self::$passwordField, $password);
        $this->I->click(self::$submitButton);
    }

    public function seeError(string $message): void
    {
        $this->I->waitForElement(self::$errorMessage, 5);
        $this->I->see($message, self::$errorMessage);
    }

    public function seeWelcome(): void
    {
        $this->I->waitForElement(self::$welcomeMessage, 10);
        $this->I->see('Welcome', self::$welcomeMessage);
    }
}
```

### Test Using Page Object

```php
<?php

namespace Tests\Acceptance;

use Tests\Support\AcceptanceTester;
use Tests\Support\Page\Acceptance\LoginPage;

class LoginWithPageObjectCest
{
    private LoginPage $loginPage;

    public function _before(AcceptanceTester $I): void
    {
        $this->loginPage = new LoginPage($I);
    }

    public function successfulLogin(AcceptanceTester $I): void
    {
        $this->loginPage->open()
            ->loginAs('user@test.com', 'password123');
        $this->loginPage->seeWelcome();
        $I->seeCurrentUrlEquals('/dashboard');
    }

    public function invalidLogin(AcceptanceTester $I): void
    {
        $this->loginPage->open()
            ->loginAs('bad@test.com', 'wrong');
        $this->loginPage->seeError('Invalid credentials');
    }
}
```

## API Testing

### REST API Suite Configuration (Api.suite.yml)

```yaml
actor: ApiTester
modules:
  enabled:
    - REST:
        url: http://localhost:8000/api
        depends: PhpBrowser
        part: Json
    - Asserts
```

### API Test Example

```php
<?php

namespace Tests\Api;

use Tests\Support\ApiTester;

class UserApiCest
{
    private string $authToken;

    public function _before(ApiTester $I): void
    {
        $I->haveHttpHeader('Content-Type', 'application/json');
        $I->haveHttpHeader('Accept', 'application/json');
    }

    public function getUsersList(ApiTester $I): void
    {
        $I->sendGet('/users');
        $I->seeResponseCodeIs(200);
        $I->seeResponseIsJson();
        $I->seeResponseContainsJson(['status' => 'success']);
        $I->seeResponseJsonMatchesJsonPath('$.data[*].id');
    }

    public function createUser(ApiTester $I): void
    {
        $I->sendPost('/users', [
            'name' => 'Alice',
            'email' => 'alice@test.com',
            'role' => 'user',
        ]);
        $I->seeResponseCodeIs(201);
        $I->seeResponseContainsJson([
            'name' => 'Alice',
            'email' => 'alice@test.com',
        ]);
    }

    public function deleteUserRequiresAuth(ApiTester $I): void
    {
        $I->sendDelete('/users/1');
        $I->seeResponseCodeIs(401);
    }
}
```

## Database Testing

```php
<?php

namespace Tests\Functional;

use Tests\Support\FunctionalTester;

class DatabaseCest
{
    public function userIsCreatedInDatabase(FunctionalTester $I): void
    {
        $I->haveInDatabase('users', [
            'name' => 'Alice',
            'email' => 'alice@test.com',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        $I->seeInDatabase('users', [
            'email' => 'alice@test.com',
        ]);

        $count = $I->grabNumRecords('users', ['status' => 'active']);
        $I->assertGreaterThan(0, $count);
    }

    public function deletedUserIsRemoved(FunctionalTester $I): void
    {
        $I->haveInDatabase('users', ['email' => 'temp@test.com', 'name' => 'Temp']);
        // perform delete action
        $I->dontSeeInDatabase('users', ['email' => 'temp@test.com']);
    }
}
```

## Custom Helper

```php
<?php

namespace Tests\Support\Helper;

use Codeception\Module;

class Acceptance extends Module
{
    public function loginAsAdmin(): void
    {
        $I = $this->getModule('WebDriver');
        $I->amOnPage('/login');
        $I->fillField('#email', 'admin@test.com');
        $I->fillField('#password', 'admin123');
        $I->click('button[type=submit]');
        $I->waitForElement('.dashboard', 10);
    }

    public function seeFlashMessage(string $message): void
    {
        $I = $this->getModule('WebDriver');
        $I->waitForElement('.flash-message', 5);
        $I->see($message, '.flash-message');
    }

    public function clearSession(): void
    {
        $I = $this->getModule('WebDriver');
        $I->resetCookie('PHPSESSID');
        $I->reloadPage();
    }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Codeception Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: test_db
        ports:
          - 3306:3306
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: mbstring, pdo_mysql
      - run: composer install --prefer-dist
      - run: php artisan serve &
      - run: php vendor/bin/codecept run acceptance --html
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: codeception-report
          path: tests/_output/
```

## Best Practices

1. **Use Cest format exclusively** -- Cest classes provide better structure, IDE autocompletion, dependency injection, and `_before`/`_after` hooks over procedural Cept files.
2. **One assertion focus per test** -- Each test method should verify one specific behavior. Use descriptive method names like `loginShowsErrorForInvalidCredentials`.
3. **Page Objects for selectors** -- Never scatter CSS selectors across test files. Centralize them in Page Objects for single-point maintenance.
4. **Environment-specific configs** -- Use `codeception.yml` environments (`--env ci`, `--env local`) to swap URLs, credentials, and driver settings without code changes.
5. **Database transactions for isolation** -- Enable the `Db` module with `cleanup: true` to wrap each test in a transaction and rollback after.
6. **Custom helpers for domain logic** -- Move repetitive flows (login, seed data, verify flash messages) into Helper modules instead of duplicating in tests.
7. **Use waitFor methods** -- Always use `waitForElement` or `waitForText` instead of `wait()` for dynamic content. Hard waits mask timing issues.
8. **Group tests with @group annotation** -- Tag tests with `@group smoke`, `@group regression` for selective CI execution: `codecept run --group smoke`.
9. **Capture artifacts on failure** -- Configure HTML reports and screenshots in `_output/` and upload them in CI for debugging.
10. **Keep acceptance tests focused** -- Acceptance tests are slow. Test critical user paths only. Push detailed logic validation to functional and unit layers.

## Anti-Patterns

1. **Using Cept format for complex tests** -- Procedural Cept files lack structure. They cannot use `_before` hooks, dependency injection, or proper test organization.
2. **Hardcoded selectors in test methods** -- Selectors like `$I->click('#btn-submit-v2')` scattered across tests break when HTML changes. Use Page Objects.
3. **Tests that depend on execution order** -- Methods like `testCreateUser` followed by `testDeleteUser` that share state create fragile, unparallelizable suites.
4. **Mixing test layers** -- Running database queries in acceptance tests or browser interactions in unit tests. Each layer has a purpose.
5. **Ignoring the Actor pattern** -- Writing raw PHP assertions instead of using `$I->see()`, `$I->seeInDatabase()` loses Codeception's reporting and retry capabilities.
6. **Sleeping instead of waiting** -- `$I->wait(5)` wastes time on fast pages and is insufficient on slow ones. Always wait for specific conditions.
7. **Testing third-party services directly** -- Acceptance tests should not hit external payment APIs or email services. Mock them at the application level.
8. **Monolithic test classes** -- A single Cest file with 50 test methods is hard to maintain. Split by feature or user journey.
9. **Not using data providers** -- Repeating the same test with different inputs manually. Use Codeception's `@dataProvider` or `@example` annotations.
10. **Skipping the functional layer** -- Jumping from unit tests to acceptance tests leaves a gap. Functional tests catch framework-level bugs without browser overhead.

## Run Commands

```bash
# Run all suites
php vendor/bin/codecept run

# Run specific suite
php vendor/bin/codecept run acceptance
php vendor/bin/codecept run functional
php vendor/bin/codecept run unit

# Run specific test
php vendor/bin/codecept run acceptance LoginCest
php vendor/bin/codecept run acceptance LoginCest:loginWithValidCredentials

# Run with options
php vendor/bin/codecept run --steps           # Show step-by-step output
php vendor/bin/codecept run --html            # Generate HTML report
php vendor/bin/codecept run --group smoke     # Run tagged group
php vendor/bin/codecept run --env ci          # Use CI environment config
php vendor/bin/codecept run -f                # Fail fast on first error
```
