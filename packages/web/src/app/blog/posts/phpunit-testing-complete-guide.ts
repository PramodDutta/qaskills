import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'PHPUnit Testing: Complete PHP Guide for 2026',
  description:
    'Complete guide to PHPUnit testing in PHP for 2026. Covers test setup, assertions, data providers, mocking, database testing, Laravel integration, and CI/CD best practices.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
PHPUnit has been the standard testing framework for PHP since its creation in 2004. In 2026 it remains the backbone of PHP quality assurance across frameworks like Laravel, Symfony, and standalone applications. Whether you are writing unit tests for a utility class or integration tests against a database, PHPUnit provides the tools you need.

This guide covers everything from initial setup through advanced patterns like data providers, mocking, database testing, and Laravel-specific integrations. By the end you will have a working mental model for structuring tests in any PHP project.

## Key Takeaways

- PHPUnit 11 is the current stable release and requires PHP 8.2 or higher
- Test classes extend \`TestCase\` and methods are prefixed with \`test\` or annotated with \`#[Test]\`
- Data providers let you run the same test logic against multiple input sets without duplicating code
- Mocking with \`createMock()\` and \`createStub()\` isolates units from their dependencies
- Database testing benefits from transactions that roll back after each test
- Laravel provides \`RefreshDatabase\`, HTTP testing helpers, and factory-based seeding out of the box

---

## Setting Up PHPUnit

### Installation

Install PHPUnit via Composer. For most projects you want it as a dev dependency:

\`\`\`bash
composer require --dev phpunit/phpunit ^11.0
\`\`\`

After installation, create a \`phpunit.xml\` configuration file in your project root:

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
         cacheDirectory=".phpunit.cache">
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory>tests/Feature</directory>
        </testsuite>
    </testsuites>
    <source>
        <include>
            <directory>src</directory>
        </include>
    </source>
</phpunit>
\`\`\`

### Directory Structure

A typical PHP project organizes tests to mirror the source:

\`\`\`
project/
  src/
    Calculator.php
    UserService.php
  tests/
    Unit/
      CalculatorTest.php
      UserServiceTest.php
    Feature/
      ApiEndpointTest.php
  phpunit.xml
  composer.json
\`\`\`

### Running Tests

\`\`\`bash
# Run all tests
./vendor/bin/phpunit

# Run a specific test file
./vendor/bin/phpunit tests/Unit/CalculatorTest.php

# Run a specific test method
./vendor/bin/phpunit --filter testAddition

# Run with coverage report
./vendor/bin/phpunit --coverage-html coverage/
\`\`\`

---

## Writing Your First Test Class

Every PHPUnit test class extends \`PHPUnit\\Framework\\TestCase\`. Test methods must be public and either start with \`test\` or use the \`#[Test]\` attribute.

\`\`\`php
<?php

declare(strict_types=1);

namespace Tests\\Unit;

use PHPUnit\\Framework\\TestCase;
use App\\Calculator;

class CalculatorTest extends TestCase
{
    private Calculator \$calculator;

    protected function setUp(): void
    {
        \$this->calculator = new Calculator();
    }

    public function testAddition(): void
    {
        \$result = \$this->calculator->add(2, 3);
        \$this->assertSame(5, \$result);
    }

    public function testDivisionByZeroThrowsException(): void
    {
        \$this->expectException(\\DivisionByZeroError::class);
        \$this->calculator->divide(10, 0);
    }
}
\`\`\`

### Setup and Teardown

PHPUnit provides lifecycle hooks that run around each test:

- \`setUp()\` runs before each test method
- \`tearDown()\` runs after each test method
- \`setUpBeforeClass()\` runs once before the first test in the class
- \`tearDownAfterClass()\` runs once after the last test in the class

\`\`\`php
protected function setUp(): void
{
    parent::setUp();
    \$this->connection = new DatabaseConnection('sqlite::memory:');
}

protected function tearDown(): void
{
    \$this->connection->close();
    parent::tearDown();
}
\`\`\`

---

## Assertions in Depth

PHPUnit ships with dozens of assertion methods. Choosing the right one produces better error messages when tests fail.

### Value Assertions

\`\`\`php
// Strict equality (type + value)
\$this->assertSame(42, \$result);

// Loose equality (value only)
\$this->assertEquals(42, \$result);

// Boolean checks
\$this->assertTrue(\$user->isActive());
\$this->assertFalse(\$user->isBanned());
\$this->assertNull(\$user->deletedAt());
\$this->assertNotNull(\$user->createdAt());
\`\`\`

### String Assertions

\`\`\`php
\$this->assertStringContainsString('error', \$message);
\$this->assertStringStartsWith('Hello', \$greeting);
\$this->assertStringEndsWith('.pdf', \$filename);
\$this->assertMatchesRegularExpression('/^[a-f0-9]{32}\$/', \$hash);
\`\`\`

### Array and Collection Assertions

\`\`\`php
\$this->assertCount(3, \$items);
\$this->assertContains('admin', \$roles);
\$this->assertArrayHasKey('email', \$userData);
\$this->assertEmpty(\$errors);
\`\`\`

### Exception Assertions

\`\`\`php
public function testInvalidEmailThrowsException(): void
{
    \$this->expectException(InvalidArgumentException::class);
    \$this->expectExceptionMessage('Invalid email format');
    \$this->expectExceptionCode(422);

    new Email('not-an-email');
}
\`\`\`

### Type Assertions

\`\`\`php
\$this->assertInstanceOf(User::class, \$result);
\$this->assertIsArray(\$data);
\$this->assertIsString(\$name);
\$this->assertIsInt(\$count);
\`\`\`

---

## Data Providers

Data providers eliminate duplication when you need to test the same logic with different inputs. A data provider is a public method that returns an array of arrays (or an iterator).

\`\`\`php
use PHPUnit\\Framework\\Attributes\\DataProvider;

class EmailValidatorTest extends TestCase
{
    #[DataProvider('validEmailProvider')]
    public function testValidEmails(string \$email): void
    {
        \$validator = new EmailValidator();
        \$this->assertTrue(\$validator->isValid(\$email));
    }

    public static function validEmailProvider(): array
    {
        return [
            'standard email' => ['user@example.com'],
            'with subdomain' => ['user@mail.example.com'],
            'with plus alias' => ['user+tag@example.com'],
            'numeric domain' => ['user@123.123.123.com'],
        ];
    }

    #[DataProvider('invalidEmailProvider')]
    public function testInvalidEmails(string \$email, string \$expectedError): void
    {
        \$validator = new EmailValidator();
        \$this->assertFalse(\$validator->isValid(\$email));
        \$this->assertSame(\$expectedError, \$validator->getError());
    }

    public static function invalidEmailProvider(): array
    {
        return [
            'missing at sign' => ['userexample.com', 'Missing @ symbol'],
            'missing domain' => ['user@', 'Missing domain'],
            'double dots' => ['user@example..com', 'Invalid domain format'],
        ];
    }
}
\`\`\`

Named keys in the data provider arrays make test output more readable. When a test fails, PHPUnit reports which data set caused the failure.

### Combining Data Providers

You can reference multiple data providers for a single test:

\`\`\`php
#[DataProvider('positiveNumbers')]
#[DataProvider('negativeNumbers')]
public function testAbsoluteValue(int \$input, int \$expected): void
{
    \$this->assertSame(\$expected, abs(\$input));
}

public static function positiveNumbers(): array
{
    return [[1, 1], [5, 5], [100, 100]];
}

public static function negativeNumbers(): array
{
    return [[-1, 1], [-5, 5], [-100, 100]];
}
\`\`\`

---

## Mocking and Stubbing

Mocks and stubs let you isolate the class under test from its dependencies. PHPUnit includes a built-in mocking framework.

### Creating Stubs

Stubs provide predetermined return values without verifying how they are called:

\`\`\`php
public function testGetUserReturnsFormattedName(): void
{
    \$repository = \$this->createStub(UserRepository::class);
    \$repository->method('findById')
        ->willReturn(new User(name: 'Jane Doe'));

    \$service = new UserService(\$repository);
    \$result = \$service->getDisplayName(1);

    \$this->assertSame('Jane Doe', \$result);
}
\`\`\`

### Creating Mocks

Mocks verify that specific methods are called with expected arguments:

\`\`\`php
public function testCreateUserSendsWelcomeEmail(): void
{
    \$mailer = \$this->createMock(MailerInterface::class);
    \$mailer->expects(\$this->once())
        ->method('send')
        ->with(
            \$this->equalTo('jane@example.com'),
            \$this->stringContains('Welcome')
        );

    \$service = new UserService(mailer: \$mailer);
    \$service->createUser('jane@example.com', 'Jane');
}
\`\`\`

### Consecutive Calls

\`\`\`php
\$cache = \$this->createStub(CacheInterface::class);
\$cache->method('get')
    ->willReturnOnConsecutiveCalls(null, 'cached-value');

// First call returns null (cache miss)
// Second call returns 'cached-value' (cache hit)
\`\`\`

### Callback-Based Returns

\`\`\`php
\$repository = \$this->createStub(UserRepository::class);
\$repository->method('findById')
    ->willReturnCallback(function (int \$id): ?User {
        return match (\$id) {
            1 => new User(name: 'Alice'),
            2 => new User(name: 'Bob'),
            default => null,
        };
    });
\`\`\`

### Mocking Static Methods and Final Classes

PHPUnit cannot mock static methods or final classes natively. For those cases, use wrapper interfaces or consider tools like Mockery:

\`\`\`bash
composer require --dev mockery/mockery
\`\`\`

\`\`\`php
use Mockery;

public function testWithMockery(): void
{
    \$logger = Mockery::mock(LoggerInterface::class);
    \$logger->shouldReceive('info')
        ->once()
        ->with('User created');

    \$service = new UserService(logger: \$logger);
    \$service->createUser('test@example.com');

    Mockery::close();
}
\`\`\`

---

## Database Testing

Testing database interactions requires a strategy that balances isolation with speed. Three common approaches exist.

### Approach 1: In-Memory SQLite

Fast but may miss database-specific behavior:

\`\`\`php
protected function setUp(): void
{
    \$this->pdo = new \\PDO('sqlite::memory:');
    \$this->pdo->exec('CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
    )');
    \$this->repository = new UserRepository(\$this->pdo);
}
\`\`\`

### Approach 2: Transaction Rollback

Uses a real database but wraps each test in a transaction:

\`\`\`php
protected function setUp(): void
{
    \$this->pdo = new \\PDO(\$_ENV['TEST_DATABASE_URL']);
    \$this->pdo->beginTransaction();
    \$this->repository = new UserRepository(\$this->pdo);
}

protected function tearDown(): void
{
    \$this->pdo->rollBack();
}
\`\`\`

### Approach 3: Migrate and Seed

Reset the database for each test or test suite. Slower but most accurate:

\`\`\`php
public static function setUpBeforeClass(): void
{
    shell_exec('php artisan migrate:fresh --seed --env=testing');
}
\`\`\`

### Testing Repositories

\`\`\`php
public function testFindByEmailReturnsUser(): void
{
    // Arrange
    \$this->repository->create([
        'name' => 'Jane',
        'email' => 'jane@example.com',
    ]);

    // Act
    \$user = \$this->repository->findByEmail('jane@example.com');

    // Assert
    \$this->assertNotNull(\$user);
    \$this->assertSame('Jane', \$user->name);
}

public function testFindByEmailReturnsNullForMissing(): void
{
    \$user = \$this->repository->findByEmail('nobody@example.com');
    \$this->assertNull(\$user);
}
\`\`\`

---

## Laravel Integration Testing

Laravel extends PHPUnit with testing utilities that make it simple to test controllers, middleware, queues, and more.

### HTTP Tests

\`\`\`php
use Illuminate\\Foundation\\Testing\\RefreshDatabase;

class UserControllerTest extends TestCase
{
    use RefreshDatabase;

    public function testCreateUserReturns201(): void
    {
        \$response = \$this->postJson('/api/users', [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'securepassword123',
        ]);

        \$response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['id', 'name', 'email', 'created_at'],
            ]);

        \$this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
        ]);
    }

    public function testCreateUserValidatesEmail(): void
    {
        \$response = \$this->postJson('/api/users', [
            'name' => 'Jane',
            'email' => 'not-an-email',
            'password' => 'securepassword123',
        ]);

        \$response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
\`\`\`

### Authentication in Tests

\`\`\`php
public function testOnlyAdminsCanDeleteUsers(): void
{
    \$admin = User::factory()->admin()->create();
    \$regularUser = User::factory()->create();
    \$target = User::factory()->create();

    \$this->actingAs(\$admin)
        ->deleteJson("/api/users/{\$target->id}")
        ->assertStatus(200);

    \$target2 = User::factory()->create();
    \$this->actingAs(\$regularUser)
        ->deleteJson("/api/users/{\$target2->id}")
        ->assertStatus(403);
}
\`\`\`

### Testing Jobs and Events

\`\`\`php
use Illuminate\\Support\\Facades\\Queue;
use Illuminate\\Support\\Facades\\Event;

public function testUserCreationDispatchesWelcomeJob(): void
{
    Queue::fake();

    \$this->postJson('/api/users', [
        'name' => 'Jane',
        'email' => 'jane@example.com',
        'password' => 'password123',
    ]);

    Queue::assertPushed(SendWelcomeEmail::class, function (\$job) {
        return \$job->email === 'jane@example.com';
    });
}

public function testUserCreationFiresEvent(): void
{
    Event::fake([UserCreated::class]);

    \$this->postJson('/api/users', [
        'name' => 'Jane',
        'email' => 'jane@example.com',
        'password' => 'password123',
    ]);

    Event::assertDispatched(UserCreated::class);
}
\`\`\`

### Testing with Factories

Laravel factories generate realistic test data:

\`\`\`php
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ];
    }

    public function admin(): static
    {
        return \$this->state(fn (array \$attributes) => [
            'role' => 'admin',
        ]);
    }

    public function unverified(): static
    {
        return \$this->state(fn (array \$attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
\`\`\`

---

## Code Coverage

PHPUnit integrates with Xdebug or PCOV for code coverage analysis.

### Configuration

\`\`\`xml
<phpunit>
    <source>
        <include>
            <directory>src</directory>
        </include>
        <exclude>
            <directory>src/Migrations</directory>
        </exclude>
    </source>
</phpunit>
\`\`\`

### Generating Reports

\`\`\`bash
# HTML report
./vendor/bin/phpunit --coverage-html coverage/

# Clover XML for CI tools
./vendor/bin/phpunit --coverage-clover coverage.xml

# Text summary in terminal
./vendor/bin/phpunit --coverage-text
\`\`\`

### Coverage Attributes

PHPUnit 11 uses attributes to link tests to source code:

\`\`\`php
use PHPUnit\\Framework\\Attributes\\CoversClass;

#[CoversClass(Calculator::class)]
class CalculatorTest extends TestCase
{
    // Tests here only count toward Calculator coverage
}
\`\`\`

---

## Organizing Tests for Large Projects

### Test Suites

Define multiple suites in \`phpunit.xml\`:

\`\`\`xml
<testsuites>
    <testsuite name="Unit">
        <directory>tests/Unit</directory>
    </testsuite>
    <testsuite name="Integration">
        <directory>tests/Integration</directory>
    </testsuite>
    <testsuite name="E2E">
        <directory>tests/E2E</directory>
    </testsuite>
</testsuites>
\`\`\`

Run a specific suite:

\`\`\`bash
./vendor/bin/phpunit --testsuite Unit
\`\`\`

### Grouping Tests

\`\`\`php
use PHPUnit\\Framework\\Attributes\\Group;

#[Group('slow')]
public function testComplexCalculation(): void
{
    // ...
}
\`\`\`

\`\`\`bash
# Run only fast tests (exclude slow group)
./vendor/bin/phpunit --exclude-group slow

# Run only slow tests
./vendor/bin/phpunit --group slow
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: PHP Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        php: ['8.2', '8.3', '8.4']

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: \\\${{ matrix.php }}
          extensions: mbstring, pdo_sqlite
          coverage: pcov

      - name: Install dependencies
        run: composer install --prefer-dist --no-progress

      - name: Run tests
        run: ./vendor/bin/phpunit --coverage-clover coverage.xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: coverage.xml
\`\`\`

---

## Common Anti-Patterns to Avoid

**Testing implementation details.** Tests should verify behavior, not internal method calls. If you refactor a class and all tests break despite identical behavior, your tests are too tightly coupled.

**Excessive mocking.** When a test has more mock setup than actual assertions, consider whether you are testing the wiring or the logic. Integration tests may be more valuable.

**Ignoring test isolation.** Tests that depend on execution order or shared state are fragile. Use \`setUp()\` to build fresh state for each test.

**Not testing edge cases.** Empty inputs, null values, boundary conditions, and error paths deserve dedicated tests. The happy path is only half the story.

**Slow test suites.** If your suite takes minutes, developers stop running it. Use in-memory databases for unit tests, reserve real databases for integration tests, and group slow tests so they can be excluded during development.

---

## Summary

PHPUnit remains the definitive testing tool for PHP in 2026. Mastering its test lifecycle, assertion library, data providers, and mocking system gives you everything needed to build reliable PHP applications. Combine those skills with database testing strategies and framework-specific helpers like those in Laravel, and you can write test suites that catch real bugs without slowing down development.

Start with unit tests for your core logic, add integration tests for database and API layers, and use CI to run everything on every push. The investment pays off quickly in fewer production incidents and faster iteration cycles.
`,
};
