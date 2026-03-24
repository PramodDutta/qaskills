---
name: Laravel Dusk Testing
description: Expert-level Laravel Dusk browser testing skill for PHP/Laravel applications. Covers Chrome-based E2E testing, browser assertions, Page Objects, component testing, authentication helpers, and database integration.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [laravel-dusk, php, laravel, browser-testing, e2e, chrome, acceptance-testing]
testingTypes: [e2e, acceptance, integration]
frameworks: [laravel-dusk, laravel, phpunit]
languages: [php]
domains: [web, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Laravel Dusk Testing Skill

You are an expert QA automation engineer specializing in Laravel Dusk browser testing for PHP/Laravel applications. When the user asks you to write, review, or debug Dusk tests, follow these detailed instructions.

## Core Principles

1. **Laravel-native testing** -- Dusk integrates deeply with Laravel. Use `loginAs()`, database factories, and artisan commands within tests for realistic setups.
2. **Chrome-powered reliability** -- Dusk uses ChromeDriver directly, not WebDriver protocol layers. This gives fast, stable browser automation with automatic ChromeDriver management.
3. **Fluent browser API** -- Chain browser methods: `$browser->visit()->type()->press()->assertSee()`. Each method returns the browser instance for readable flows.
4. **Page Objects for encapsulation** -- Use Dusk Page classes with `$elements` shortcuts and `assert()` methods to encapsulate page-specific logic.
5. **Test isolation** -- Each test gets a fresh browser session. Use `DatabaseMigrations` or `RefreshDatabase` traits for clean database state.

## Project Structure

Always organize Laravel Dusk projects with this structure:

```
tests/
  Browser/
    LoginTest.php
    DashboardTest.php
    CheckoutTest.php
    Components/
      DatePickerComponent.php
      ModalComponent.php
    Pages/
      LoginPage.php
      DashboardPage.php
      BasePage.php
  DuskTestCase.php
  .env.dusk.local
  .env.dusk.testing
```

## Setup

### Installation

```bash
composer require --dev laravel/dusk
php artisan dusk:install
```

This creates `tests/Browser/`, `tests/DuskTestCase.php`, and downloads ChromeDriver.

### Environment (.env.dusk.local)

```
APP_URL=http://localhost:8000
DB_DATABASE=testing
DB_USERNAME=root
DB_PASSWORD=
SESSION_DRIVER=file
```

### DuskTestCase Configuration

```php
<?php

namespace Tests;

use Facebook\WebDriver\Chrome\ChromeOptions;
use Facebook\WebDriver\Remote\DesiredCapabilities;
use Facebook\WebDriver\Remote\RemoteWebDriver;
use Laravel\Dusk\TestCase as BaseTestCase;

abstract class DuskTestCase extends BaseTestCase
{
    protected function driver(): RemoteWebDriver
    {
        $options = (new ChromeOptions)->addArguments([
            '--disable-gpu',
            '--headless=new',
            '--no-sandbox',
            '--window-size=1920,1080',
        ]);

        return RemoteWebDriver::create(
            'http://localhost:9515',
            DesiredCapabilities::chrome()->setCapability(
                ChromeOptions::CAPABILITY, $options
            )
        );
    }
}
```

## Basic Test Patterns

### Login Test

```php
<?php

namespace Tests\Browser;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

class LoginTest extends DuskTestCase
{
    use DatabaseMigrations;

    public function test_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'user@test.com',
        ]);

        $this->browse(function (Browser $browser) use ($user) {
            $browser->visit('/login')
                ->type('#email', $user->email)
                ->type('#password', 'password')
                ->press('Log in')
                ->assertPathIs('/dashboard')
                ->assertSee('Welcome');
        });
    }

    public function test_login_shows_error_for_invalid_credentials(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/login')
                ->type('#email', 'wrong@test.com')
                ->type('#password', 'wrong')
                ->press('Log in')
                ->assertPathIs('/login')
                ->assertSee('Invalid credentials');
        });
    }

    public function test_login_requires_all_fields(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/login')
                ->press('Log in')
                ->assertSee('The email field is required')
                ->assertSee('The password field is required');
        });
    }
}
```

### Authentication Shortcut

```php
public function test_dashboard_shows_user_data(): void
{
    $user = User::factory()->create();

    $this->browse(function (Browser $browser) use ($user) {
        $browser->loginAs($user)
            ->visit('/dashboard')
            ->assertSee($user->name)
            ->assertSee('Your Projects');
    });
}
```

## Browser Methods Reference

```php
// Navigation
$browser->visit('/path');
$browser->visitRoute('users.show', ['user' => 1]);
$browser->back();
$browser->forward();
$browser->refresh();

// Forms
$browser->type('#email', 'user@test.com');
$browser->type('#email', '');                  // clear field
$browser->typeSlowly('#search', 'query', 100); // ms between keystrokes
$browser->append('#field', ' more text');
$browser->select('#role', 'admin');
$browser->check('#agree');
$browser->uncheck('#newsletter');
$browser->radio('#plan', 'premium');
$browser->attach('#avatar', __DIR__.'/fixtures/photo.jpg');
$browser->press('Submit');
$browser->pressAndWaitFor('Submit', 10);
$browser->click('.button');
$browser->clickLink('More Info');

// Assertions
$browser->assertSee('text');
$browser->assertDontSee('error');
$browser->assertSeeIn('.selector', 'text');
$browser->assertPathIs('/dashboard');
$browser->assertPathBeginsWith('/users');
$browser->assertPathIsNot('/login');
$browser->assertRouteIs('dashboard');
$browser->assertTitle('Dashboard');
$browser->assertTitleContains('Dash');
$browser->assertUrlIs('http://localhost/dashboard');
$browser->assertPresent('#element');
$browser->assertMissing('.hidden');
$browser->assertVisible('.modal');
$browser->assertNotVisible('.spinner');
$browser->assertEnabled('#submit');
$browser->assertDisabled('#submit');
$browser->assertInputValue('#email', 'user@test.com');
$browser->assertChecked('#agree');
$browser->assertNotChecked('#newsletter');
$browser->assertSelected('#role', 'admin');
$browser->assertSourceHas('<meta name="csrf">');

// Waiting
$browser->waitFor('.element');
$browser->waitFor('.element', 10);            // seconds
$browser->waitUntilMissing('.spinner');
$browser->waitForText('Loaded', 10);
$browser->waitForTextIn('.container', 'Done');
$browser->waitForLink('Next');
$browser->waitForLocation('/dashboard');
$browser->waitForRoute('dashboard');
$browser->waitUntilEnabled('#submit');
$browser->waitUntilDisabled('#submit');
$browser->pause(1000);                         // ms, avoid in production tests

// JavaScript
$browser->script('document.querySelector(".btn").click()');
$result = $browser->script('return document.title');
```

## Page Object Pattern

### Generate Page

```bash
php artisan dusk:page LoginPage
```

### Login Page Object

```php
<?php

namespace Tests\Browser\Pages;

use Laravel\Dusk\Browser;
use Laravel\Dusk\Page;

class LoginPage extends Page
{
    public function url(): string
    {
        return '/login';
    }

    public function assert(Browser $browser): void
    {
        $browser->assertPathIs($this->url())
            ->assertSee('Log in');
    }

    public function elements(): array
    {
        return [
            '@email' => '#email',
            '@password' => '#password',
            '@submit' => 'button[type="submit"]',
            '@error' => '.error-message',
            '@forgot' => 'a[href="/forgot-password"]',
        ];
    }

    public function loginAs(Browser $browser, string $email, string $password): void
    {
        $browser->type('@email', $email)
            ->type('@password', $password)
            ->press('@submit');
    }

    public function assertHasError(Browser $browser, string $message): void
    {
        $browser->waitFor('@error')
            ->assertSeeIn('@error', $message);
    }
}
```

### Test Using Page Object

```php
<?php

namespace Tests\Browser;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;
use Tests\Browser\Pages\LoginPage;
use Tests\Browser\Pages\DashboardPage;
use Tests\DuskTestCase;

class LoginWithPageTest extends DuskTestCase
{
    use DatabaseMigrations;

    public function test_successful_login(): void
    {
        $user = User::factory()->create();

        $this->browse(function (Browser $browser) use ($user) {
            $browser->visit(new LoginPage)
                ->loginAs($user->email, 'password')
                ->on(new DashboardPage)
                ->assertSee('Welcome');
        });
    }

    public function test_invalid_login(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit(new LoginPage)
                ->loginAs('bad@test.com', 'wrong')
                ->assertHasError('Invalid credentials');
        });
    }
}
```

## Component Testing

### Generate Component

```bash
php artisan dusk:component DatePicker
```

### DatePicker Component

```php
<?php

namespace Tests\Browser\Components;

use Laravel\Dusk\Browser;
use Laravel\Dusk\Component as BaseComponent;

class DatePickerComponent extends BaseComponent
{
    public function selector(): string
    {
        return '.date-picker';
    }

    public function assert(Browser $browser): void
    {
        $browser->assertVisible($this->selector());
    }

    public function elements(): array
    {
        return [
            '@input' => 'input.date-input',
            '@calendar' => '.calendar-dropdown',
            '@next-month' => '.next-month',
            '@prev-month' => '.prev-month',
        ];
    }

    public function selectDate(Browser $browser, int $day): void
    {
        $browser->click('@input')
            ->waitFor('@calendar')
            ->click("td[data-day='{$day}']");
    }
}
```

### Using Components in Tests

```php
public function test_date_selection(): void
{
    $this->browse(function (Browser $browser) {
        $browser->visit('/events/create')
            ->within(new DatePickerComponent, function (Browser $browser) {
                $browser->selectDate(15);
            })
            ->press('Create Event')
            ->assertSee('Event created');
    });
}
```

## Multiple Browser Testing

```php
public function test_real_time_chat(): void
{
    $alice = User::factory()->create();
    $bob = User::factory()->create();

    $this->browse(function (Browser $first, Browser $second) use ($alice, $bob) {
        $first->loginAs($alice)
            ->visit('/chat')
            ->waitForText('Chat Room');

        $second->loginAs($bob)
            ->visit('/chat')
            ->waitForText('Chat Room');

        $first->type('#message', 'Hello Bob!')
            ->press('Send');

        $second->waitForText('Hello Bob!')
            ->assertSee('Hello Bob!');
    });
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Laravel Dusk Tests
on: [push, pull_request]

jobs:
  dusk:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: testing
        ports:
          - 3306:3306
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: mbstring, pdo_mysql
      - run: composer install --prefer-dist
      - run: cp .env.dusk.testing .env
      - run: php artisan key:generate
      - run: php artisan migrate
      - name: Start Chrome
        run: google-chrome-stable --headless --disable-gpu --remote-debugging-port=9222 &
      - name: Run Dusk
        run: php artisan dusk --env=testing
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: dusk-screenshots
          path: tests/Browser/screenshots/
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: dusk-console
          path: tests/Browser/console/
```

## Best Practices

1. **Use loginAs() for authenticated tests** -- Skip the login form when testing non-auth features. `$browser->loginAs($user)` is faster and more reliable.
2. **Use Page element shortcuts** -- Define `@email` shortcuts in `elements()` arrays instead of repeating CSS selectors in tests.
3. **Separate .env.dusk files** -- Create `.env.dusk.local` and `.env.dusk.testing` for environment-specific config (database, APP_URL, drivers).
4. **Use DatabaseMigrations trait** -- Ensures each test starts with a fresh database. Pair with factories for consistent, readable test data.
5. **Wait explicitly for dynamic content** -- Use `waitFor`, `waitForText`, `waitForLocation` instead of `pause()`. Hard waits mask timing issues.
6. **Test with multiple browsers** -- Dusk supports multiple browser instances for testing real-time features, WebSockets, and collaborative flows.
7. **Component classes for reusable widgets** -- Extract date pickers, modals, and dropdowns into Component classes for reuse across tests.
8. **Upload screenshots and console on failure** -- Configure CI to upload `tests/Browser/screenshots/` and `tests/Browser/console/` as artifacts.
9. **Run headless in CI** -- Add `--headless=new` to ChromeOptions in `DuskTestCase::driver()` for CI environments.
10. **Group tests by feature** -- Organize tests into subdirectories by feature area. Run subsets with `php artisan dusk tests/Browser/Auth`.

## Anti-Patterns

1. **Logging in via the form for every test** -- Use `loginAs()` for non-auth tests. Login form tests should be in a dedicated LoginTest class.
2. **Hardcoded pause() calls** -- `$browser->pause(3000)` wastes time and is unreliable. Use Dusk's `waitFor*` methods that resolve immediately when conditions are met.
3. **Not using element shortcuts** -- Repeating `#user-email-input` across tests. Define `@email => '#user-email-input'` in the Page's `elements()` method.
4. **Testing with real external services** -- Dusk tests should mock payment providers, email services, and third-party APIs at the application level.
5. **Single massive test class** -- One `BrowserTest.php` with 40 methods. Split by feature into `LoginTest`, `DashboardTest`, `CheckoutTest`.
6. **Not cleaning database between tests** -- Without `DatabaseMigrations` or `RefreshDatabase`, tests accumulate data and become order-dependent.
7. **Asserting on flash messages without waiting** -- Flash messages that appear via JavaScript need `waitForText` before `assertSee`.
8. **Ignoring console errors** -- Dusk captures browser console output in `tests/Browser/console/`. Unreviewed JS errors hide real bugs.
9. **Using raw ChromeDriver commands** -- Bypassing Dusk's API with raw WebDriver calls defeats the purpose of the fluent API and loses Dusk's waiting behavior.
10. **Not using Dusk Pages for complex flows** -- Inline selectors and assertions in test methods for multi-step flows become unmaintainable. Use Page Objects.

## Run Commands

```bash
# Run all Dusk tests
php artisan dusk

# Run specific test file
php artisan dusk tests/Browser/LoginTest.php

# Run specific method
php artisan dusk --filter test_login_with_valid_credentials

# Run with specific environment
php artisan dusk --env=testing

# Run in groups
php artisan dusk --group auth

# Update ChromeDriver
php artisan dusk:chrome-driver

# Start the app for Dusk
php artisan serve --port=8000 &
php artisan dusk
```
