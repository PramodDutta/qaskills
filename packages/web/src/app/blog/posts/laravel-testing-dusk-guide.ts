import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Laravel Testing with Dusk: Complete PHP E2E Guide',
  description:
    'Master Laravel Dusk for end-to-end browser testing in PHP. Learn setup, authentication testing, form handling, JavaScript execution, database assertions, and CI/CD integration with ChromeDriver.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
## Introduction to Laravel Dusk

Laravel Dusk provides an expressive, easy-to-use browser automation and testing API for your PHP applications. Unlike traditional HTTP testing tools that simulate requests without a real browser, Dusk operates a real Google Chrome instance through ChromeDriver, giving you the ability to test JavaScript-heavy applications, SPAs, and complex user flows exactly as your users experience them.

In this comprehensive guide, we will walk through everything you need to know about Laravel Dusk, from initial setup to advanced testing patterns, database assertions, and CI/CD integration.

## Why Choose Dusk for E2E Testing?

Before diving in, it is worth understanding where Dusk fits in the PHP testing ecosystem. Laravel ships with built-in HTTP testing through PHPUnit, which is excellent for API endpoints and simple page loads. However, HTTP tests cannot interact with JavaScript, wait for AJAX calls, or test complex UI flows like drag-and-drop or file uploads.

Dusk fills that gap. It provides a fluent API that feels native to Laravel, integrates with your existing test suite, and supports the full range of browser interactions. Compared to standalone tools like Selenium or Cypress, Dusk has the advantage of deep Laravel integration, meaning you can use model factories, database transactions, and authentication helpers directly.

### Key Benefits

- **Real browser testing** with Google Chrome and ChromeDriver
- **Fluent API** designed specifically for Laravel applications
- **Authentication helpers** that bypass the login form for faster tests
- **Database integration** with migrations, seeders, and the DatabaseMigrations trait
- **Screenshot capture** on test failure for easy debugging
- **Waiting mechanisms** for AJAX and JavaScript-rendered content
- **Page objects** for organizing complex test logic
- **CI/CD ready** with headless Chrome support

## Setting Up Laravel Dusk

### Installation

Getting started with Dusk requires just a few commands. First, install the package via Composer:

\`\`\`bash
composer require laravel/dusk --dev
\`\`\`

After installation, run the Dusk install command to scaffold the necessary files:

\`\`\`bash
php artisan dusk:install
\`\`\`

This creates a \`tests/Browser\` directory with an example test, a \`DuskTestCase.php\` base class, and a \`screenshots\` directory for failure captures. Dusk also downloads the appropriate ChromeDriver binary for your operating system.

### Configuration

The \`DuskTestCase.php\` file configures how Chrome is launched. By default, it starts Chrome in headless mode:

\`\`\`php
use Laravel\\Dusk\\TestCase as BaseTestCase;
use Facebook\\WebDriver\\Chrome\\ChromeOptions;
use Facebook\\WebDriver\\Remote\\RemoteWebDriver;
use Facebook\\WebDriver\\Remote\\DesiredCapabilities;

abstract class DuskTestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function driver(): RemoteWebDriver
    {
        \$options = (new ChromeOptions)->addArguments([
            '--disable-gpu',
            '--headless=new',
            '--window-size=1920,1080',
            '--no-sandbox',
            '--disable-dev-shm-usage',
        ]);

        return RemoteWebDriver::create(
            'http://localhost:9515',
            DesiredCapabilities::chrome()->setCapability(
                ChromeOptions::CAPABILITY_W3C, \$options
            )
        );
    }
}
\`\`\`

### Environment Setup

Dusk uses a \`.env.dusk.local\` file when running tests. Create this file to configure a testing database and application URL:

\`\`\`env
APP_URL=http://localhost:8001
DB_DATABASE=your_app_testing
SESSION_DRIVER=file
\`\`\`

Start the application server before running tests:

\`\`\`bash
php artisan serve --port=8001 &
php artisan dusk
\`\`\`

## Writing Your First Dusk Test

### Creating a Test

Generate a new Dusk test using Artisan:

\`\`\`bash
php artisan dusk:make LoginTest
\`\`\`

This creates \`tests/Browser/LoginTest.php\`:

\`\`\`php
namespace Tests\\Browser;

use Laravel\\Dusk\\Browser;
use Tests\\DuskTestCase;

class LoginTest extends DuskTestCase
{
    public function test_user_can_login(): void
    {
        \$this->browse(function (Browser \$browser) {
            \$browser->visit('/login')
                ->type('email', 'user@example.com')
                ->type('password', 'password')
                ->press('Log in')
                ->assertPathIs('/dashboard')
                ->assertSee('Welcome back');
        });
    }
}
\`\`\`

### Running Tests

Execute all Dusk tests with:

\`\`\`bash
php artisan dusk
\`\`\`

Run a specific test file:

\`\`\`bash
php artisan dusk tests/Browser/LoginTest.php
\`\`\`

Run a specific test method:

\`\`\`bash
php artisan dusk --filter test_user_can_login
\`\`\`

## Authentication Testing

One of Dusk's most powerful features is its authentication helpers. Instead of navigating through login forms for every test, you can authenticate programmatically.

### Using loginAs

\`\`\`php
use App\\Models\\User;

public function test_dashboard_shows_user_projects(): void
{
    \$user = User::factory()->create();

    \$this->browse(function (Browser \$browser) use (\$user) {
        \$browser->loginAs(\$user)
            ->visit('/dashboard')
            ->assertSee('My Projects')
            ->assertSee(\$user->name);
    });
}
\`\`\`

The \`loginAs\` method sets the session cookie directly, skipping the login form entirely. This makes tests significantly faster and more reliable.

### Testing Registration Flows

For the registration flow itself, test the full form interaction:

\`\`\`php
public function test_user_can_register(): void
{
    \$this->browse(function (Browser \$browser) {
        \$browser->visit('/register')
            ->type('name', 'Jane Doe')
            ->type('email', 'jane@example.com')
            ->type('password', 'SecurePass123!')
            ->type('password_confirmation', 'SecurePass123!')
            ->press('Create Account')
            ->assertPathIs('/dashboard')
            ->assertAuthenticated();
    });
}
\`\`\`

### Testing Authorization

Test that unauthorized users are redirected appropriately:

\`\`\`php
public function test_guests_cannot_access_admin(): void
{
    \$this->browse(function (Browser \$browser) {
        \$browser->visit('/admin')
            ->assertPathIs('/login');
    });
}

public function test_regular_users_see_403_on_admin(): void
{
    \$user = User::factory()->create(['role' => 'user']);

    \$this->browse(function (Browser \$browser) use (\$user) {
        \$browser->loginAs(\$user)
            ->visit('/admin')
            ->assertSee('403')
            ->assertSee('Forbidden');
    });
}
\`\`\`

## Form Handling and Interactions

Dusk provides a rich set of methods for interacting with forms, covering every common input type.

### Text Inputs and Textareas

\`\`\`php
\$browser->type('title', 'My New Post')
    ->type('body', 'This is the content of my post...')
    ->append('body', ' with additional text')
    ->clear('title')
    ->type('title', 'Updated Title');
\`\`\`

### Select Dropdowns

\`\`\`php
// Select by value
\$browser->select('category', 'technology');

// Select a random option
\$browser->select('category');
\`\`\`

### Checkboxes and Radio Buttons

\`\`\`php
\$browser->check('agree_terms')
    ->uncheck('subscribe_newsletter')
    ->radio('plan', 'premium');
\`\`\`

### File Uploads

\`\`\`php
\$browser->attach('avatar', __DIR__ . '/fixtures/photo.jpg');

// Multiple files
\$browser->attach('documents[]', [
    __DIR__ . '/fixtures/doc1.pdf',
    __DIR__ . '/fixtures/doc2.pdf',
]);
\`\`\`

### Date and Time Inputs

\`\`\`php
\$browser->type('start_date', '2026-03-24')
    ->type('start_time', '09:00');
\`\`\`

### Complex Form Test Example

\`\`\`php
public function test_user_can_create_event(): void
{
    \$user = User::factory()->create();

    \$this->browse(function (Browser \$browser) use (\$user) {
        \$browser->loginAs(\$user)
            ->visit('/events/create')
            ->type('title', 'Laravel Meetup')
            ->type('description', 'Monthly Laravel community meetup')
            ->select('category', 'meetup')
            ->type('date', '2026-04-15')
            ->type('time', '18:00')
            ->type('location', '123 Main St')
            ->check('is_public')
            ->attach('banner', __DIR__ . '/fixtures/banner.jpg')
            ->press('Create Event')
            ->assertPathIs('/events')
            ->assertSee('Laravel Meetup')
            ->assertSee('Event created successfully');
    });
}
\`\`\`

## JavaScript Execution and Waiting

### Executing JavaScript

Dusk lets you run arbitrary JavaScript in the browser context:

\`\`\`php
\$browser->script('window.scrollTo(0, document.body.scrollHeight)');

// Get a return value
\$result = \$browser->script('return document.title');

// Multiple scripts
\$browser->script([
    'window.localStorage.setItem("theme", "dark")',
    'document.body.classList.add("dark-mode")',
]);
\`\`\`

### Waiting for Elements

Modern applications often load content asynchronously. Dusk provides several waiting methods:

\`\`\`php
// Wait for text to appear (default 5 seconds)
\$browser->waitForText('Data loaded');

// Wait for an element
\$browser->waitFor('.results-table');

// Wait for an element to disappear
\$browser->waitUntilMissing('.loading-spinner');

// Wait with custom timeout (in seconds)
\$browser->waitFor('.slow-content', 15);

// Wait for a JavaScript expression to be true
\$browser->waitUntil('window.appReady === true');

// Wait for a route (Vue/React)
\$browser->waitForRoute('dashboard');

// Pause for a fixed duration (use sparingly)
\$browser->pause(1000);
\`\`\`

### Handling Modals and Dialogs

\`\`\`php
// Accept a JavaScript confirm dialog
\$browser->press('Delete')
    ->acceptDialog();

// Dismiss a dialog
\$browser->press('Delete')
    ->dismissDialog();

// Type into a prompt
\$browser->press('Rename')
    ->typeInDialog('New Name')
    ->acceptDialog();
\`\`\`

### Working with Frames

\`\`\`php
\$browser->withinFrame('#payment-iframe', function (Browser \$browser) {
    \$browser->type('card-number', '4242424242424242')
        ->type('expiry', '12/28')
        ->type('cvc', '123')
        ->press('Pay');
});
\`\`\`

## Page Objects

Page objects encapsulate the structure and behavior of a page, keeping tests clean and maintainable.

### Creating a Page Object

\`\`\`bash
php artisan dusk:page CreateProject
\`\`\`

This creates \`tests/Browser/Pages/CreateProject.php\`:

\`\`\`php
namespace Tests\\Browser\\Pages;

use Laravel\\Dusk\\Browser;
use Laravel\\Dusk\\Page;

class CreateProject extends Page
{
    public function url(): string
    {
        return '/projects/create';
    }

    public function assert(Browser \$browser): void
    {
        \$browser->assertPathIs(\$this->url())
            ->assertSee('Create New Project');
    }

    public function elements(): array
    {
        return [
            '@name' => '#project-name',
            '@description' => '#project-description',
            '@framework' => 'select[name="framework"]',
            '@submit' => 'button[type="submit"]',
        ];
    }

    public function fillProjectForm(
        Browser \$browser,
        string \$name,
        string \$description,
        string \$framework
    ): void {
        \$browser->type('@name', \$name)
            ->type('@description', \$description)
            ->select('@framework', \$framework)
            ->click('@submit');
    }
}
\`\`\`

### Using Page Objects in Tests

\`\`\`php
use Tests\\Browser\\Pages\\CreateProject;

public function test_user_can_create_project(): void
{
    \$user = User::factory()->create();

    \$this->browse(function (Browser \$browser) use (\$user) {
        \$browser->loginAs(\$user)
            ->visit(new CreateProject)
            ->fillProjectForm(
                'My Laravel App',
                'A web application built with Laravel',
                'laravel'
            )
            ->assertSee('Project created successfully');
    });
}
\`\`\`

## Database Assertions and Test Data

### Using DatabaseMigrations

The \`DatabaseMigrations\` trait resets the database between each test:

\`\`\`php
use Illuminate\\Foundation\\Testing\\DatabaseMigrations;

class ProjectTest extends DuskTestCase
{
    use DatabaseMigrations;

    public function test_projects_are_listed(): void
    {
        \$user = User::factory()
            ->has(Project::factory()->count(3))
            ->create();

        \$this->browse(function (Browser \$browser) use (\$user) {
            \$browser->loginAs(\$user)
                ->visit('/projects')
                ->assertSee(\$user->projects->first()->name);
        });
    }
}
\`\`\`

### Asserting Database State After Actions

While Dusk focuses on browser assertions, you can combine it with PHPUnit database assertions:

\`\`\`php
public function test_creating_project_persists_to_database(): void
{
    \$user = User::factory()->create();

    \$this->browse(function (Browser \$browser) use (\$user) {
        \$browser->loginAs(\$user)
            ->visit('/projects/create')
            ->type('name', 'Test Project')
            ->type('description', 'A test project')
            ->press('Create')
            ->assertSee('Project created');
    });

    \$this->assertDatabaseHas('projects', [
        'name' => 'Test Project',
        'user_id' => \$user->id,
    ]);
}
\`\`\`

### Seeding Test Data

\`\`\`php
public function test_admin_can_see_all_users(): void
{
    \$this->seed(UserSeeder::class);
    \$admin = User::factory()->create(['role' => 'admin']);

    \$this->browse(function (Browser \$browser) use (\$admin) {
        \$browser->loginAs(\$admin)
            ->visit('/admin/users')
            ->assertSee('Showing 25 users');
    });
}
\`\`\`

## Advanced Patterns

### Multiple Browser Instances

Test real-time features with multiple browser windows:

\`\`\`php
public function test_live_chat_between_users(): void
{
    \$alice = User::factory()->create(['name' => 'Alice']);
    \$bob = User::factory()->create(['name' => 'Bob']);

    \$this->browse(function (Browser \$first, Browser \$second) use (\$alice, \$bob) {
        \$first->loginAs(\$alice)
            ->visit('/chat/general');

        \$second->loginAs(\$bob)
            ->visit('/chat/general');

        \$first->type('message', 'Hello from Alice!')
            ->press('Send');

        \$second->waitForText('Hello from Alice!')
            ->assertSee('Alice');

        \$second->type('message', 'Hi Alice!')
            ->press('Send');

        \$first->waitForText('Hi Alice!')
            ->assertSee('Bob');
    });
}
\`\`\`

### Component Testing with Dusk Selectors

Use the \`dusk\` attribute in your Blade templates for stable selectors:

\`\`\`html
<button dusk="submit-order">Place Order</button>
<div dusk="order-total">{{ \$total }}</div>
\`\`\`

Then reference them in tests:

\`\`\`php
\$browser->click('@submit-order')
    ->waitFor('@order-confirmation')
    ->assertSeeIn('@order-total', '\$99.99');
\`\`\`

### Custom Assertions

Extend the Browser class with custom assertions:

\`\`\`php
// In DuskTestCase.php
Browser::macro('assertHasNotification', function (string \$message) {
    /** @var Browser \$this */
    return \$this->waitFor('.notification')
        ->assertSeeIn('.notification', \$message);
});

// In tests
\$browser->press('Save')
    ->assertHasNotification('Changes saved successfully');
\`\`\`

### Testing API-Driven UIs

For SPAs or Livewire components that fetch data via API:

\`\`\`php
public function test_search_filters_results(): void
{
    Project::factory()->create(['name' => 'Laravel Blog']);
    Project::factory()->create(['name' => 'React Dashboard']);
    \$user = User::factory()->create();

    \$this->browse(function (Browser \$browser) use (\$user) {
        \$browser->loginAs(\$user)
            ->visit('/projects')
            ->waitFor('.project-list')
            ->type('search', 'Laravel')
            ->waitUntilMissing('.loading')
            ->waitFor('.project-card')
            ->assertSee('Laravel Blog')
            ->assertDontSee('React Dashboard');
    });
}
\`\`\`

## Screenshots and Debugging

### Automatic Failure Screenshots

Dusk automatically captures screenshots when a test fails. They are stored in \`tests/Browser/screenshots/\`. The naming convention includes the test class and method name for easy identification.

### Manual Screenshots

Capture screenshots at any point in your test for debugging:

\`\`\`php
\$browser->screenshot('before-submit')
    ->press('Submit')
    ->screenshot('after-submit');
\`\`\`

### Console Log Access

Access browser console output for debugging JavaScript issues:

\`\`\`php
\$browser->visit('/app')
    ->waitFor('#loaded');

\$logs = \$browser->driver->manage()->getLog('browser');
foreach (\$logs as \$log) {
    dump(\$log['message']);
}
\`\`\`

### Storing Page Source

Save the HTML source for inspection:

\`\`\`php
\$browser->storeSource('page-debug');
\`\`\`

## CI/CD Integration with ChromeDriver

### GitHub Actions Configuration

Here is a complete GitHub Actions workflow for running Dusk tests:

\`\`\`yaml
name: Dusk Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  dusk:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: testing
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: mbstring, pdo_mysql

      - name: Install dependencies
        run: composer install --no-progress --prefer-dist

      - name: Install Chrome
        uses: browser-actions/setup-chrome@latest

      - name: Start ChromeDriver
        run: |
          chromedriver --port=9515 &

      - name: Prepare Dusk
        run: |
          cp .env.dusk.ci .env
          php artisan key:generate
          php artisan migrate

      - name: Start application
        run: |
          php artisan serve --port=8001 &
          sleep 3

      - name: Run Dusk tests
        run: php artisan dusk

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: dusk-screenshots
          path: tests/Browser/screenshots/

      - name: Upload console logs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: dusk-console
          path: tests/Browser/console/
\`\`\`

### Docker-Based CI

For Docker-based CI environments:

\`\`\`dockerfile
FROM php:8.3-cli

RUN apt-get update && apt-get install -y \\
    chromium \\
    chromium-driver \\
    zip unzip git

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

RUN composer install --no-dev --optimize-autoloader

ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_BIN=/usr/bin/chromedriver
\`\`\`

### ChromeDriver Version Management

Keep ChromeDriver in sync with Chrome. In your \`DuskTestCase.php\`:

\`\`\`php
public static function prepare(): void
{
    if (! static::runningInSail()) {
        static::startChromeDriver(['--port=9515']);
    }
}
\`\`\`

For CI, you may want to pin a specific ChromeDriver version. Dusk provides a command to update it:

\`\`\`bash
php artisan dusk:chrome-driver --detect
\`\`\`

## Best Practices

### Test Organization

Organize your Dusk tests by feature area. Keep them separate from your unit and feature tests:

\`\`\`
tests/
  Browser/
    Auth/
      LoginTest.php
      RegistrationTest.php
    Projects/
      CreateProjectTest.php
      EditProjectTest.php
    Admin/
      UserManagementTest.php
    Pages/
      CreateProject.php
      Dashboard.php
    screenshots/
    console/
\`\`\`

### Selector Strategy

Prefer \`dusk\` attributes over CSS classes or IDs. CSS classes change with styling updates, but \`dusk\` attributes are dedicated to testing:

\`\`\`html
<!-- Fragile -->
<button class="btn btn-primary submit-btn">Save</button>

<!-- Robust -->
<button dusk="save-project">Save</button>
\`\`\`

In production, you can strip \`dusk\` attributes using a middleware or build step to keep your HTML clean.

### Waiting Over Pausing

Never use \`pause()\` as a primary waiting strategy. It is slow and flaky. Always prefer Dusk's built-in waiting methods:

\`\`\`php
// Bad
\$browser->press('Save')->pause(3000)->assertSee('Saved');

// Good
\$browser->press('Save')->waitForText('Saved');
\`\`\`

### Keep Tests Independent

Each test should set up its own data and not depend on other tests. Use the \`DatabaseMigrations\` trait and model factories to ensure a clean state.

### Limit Dusk Test Scope

Dusk tests are slower than unit or HTTP tests. Reserve them for scenarios that truly require a browser: JavaScript interactions, complex multi-step workflows, real-time features, and visual regressions. Cover business logic in faster unit and feature tests.

## Conclusion

Laravel Dusk bridges the gap between unit testing and manual QA by providing automated end-to-end browser testing that integrates seamlessly with the Laravel ecosystem. Its fluent API, authentication helpers, and page objects make writing browser tests almost as pleasant as writing Laravel code itself.

By combining Dusk with your existing PHPUnit tests, you can build a comprehensive testing strategy that covers everything from individual functions to complete user journeys. With proper CI/CD integration, you can catch regressions before they reach production and ship with confidence.

Start with the critical user paths in your application, such as login, registration, checkout, and core workflows, then expand your Dusk test suite as your application grows.
`,
};
