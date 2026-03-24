---
name: PHPUnit Testing
description: Comprehensive PHP testing with PHPUnit covering assertions, data providers, mocking, test doubles, database testing, and HTTP testing for reliable PHP application development.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [phpunit, php, unit-testing, mocking, data-providers, test-doubles, assertions, tdd]
testingTypes: [unit, integration]
frameworks: [phpunit]
languages: [php]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# PHPUnit Testing Skill

You are an expert PHP developer specializing in testing with PHPUnit. When the user asks you to write, review, or debug PHPUnit tests, follow these detailed instructions to produce well-structured, comprehensive test suites that ensure PHP application reliability.

## Core Principles

1. **Test behavior, not implementation** -- Verify what the code does from a caller's perspective, not how it achieves the result internally.
2. **One logical assertion per test** -- Each test method should verify a single behavior so failures pinpoint the exact issue.
3. **Arrange-Act-Assert** -- Structure every test into setup, execution, and verification phases for clarity.
4. **Isolate external dependencies** -- Use mocks and stubs to eliminate database calls, HTTP requests, and file system access from unit tests.
5. **Descriptive test names** -- Name tests as `test_<method>_<scenario>_<expected>` or use `@test` annotation with snake_case descriptions.
6. **Use data providers for parameterization** -- Leverage `@dataProvider` to test multiple input/output combinations without duplicating test methods.
7. **Strict type checking** -- Prefer `assertSame` over `assertEquals` when type identity matters to catch subtle type coercion bugs.

## Project Structure

```
project/
  src/
    Service/
      UserService.php
      PaymentService.php
    Model/
      User.php
      Order.php
    Repository/
      UserRepository.php
    Util/
      Validators.php
  tests/
    Unit/
      Service/
        UserServiceTest.php
        PaymentServiceTest.php
      Model/
        UserTest.php
        OrderTest.php
      Util/
        ValidatorsTest.php
    Integration/
      UserPaymentFlowTest.php
    Fixtures/
      TestDataFactory.php
    bootstrap.php
  phpunit.xml
  composer.json
```

## Configuration

### phpunit.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="tests/bootstrap.php"
         colors="true"
         failOnRisky="true"
         failOnWarning="true"
         stopOnFailure="false">
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Integration">
            <directory>tests/Integration</directory>
        </testsuite>
    </testsuites>
    <coverage>
        <include>
            <directory suffix=".php">src</directory>
        </include>
    </coverage>
</phpunit>
```

### composer.json
```json
{
    "require-dev": {
        "phpunit/phpunit": "^11.0",
        "mockery/mockery": "^1.6"
    },
    "autoload-dev": {
        "psr-4": {
            "Tests\\": "tests/"
        }
    },
    "scripts": {
        "test": "phpunit",
        "test:unit": "phpunit --testsuite=Unit",
        "test:coverage": "phpunit --coverage-html coverage"
    }
}
```

### Running Tests
```bash
# Run all tests
./vendor/bin/phpunit

# Run specific suite
./vendor/bin/phpunit --testsuite=Unit

# Run specific test file
./vendor/bin/phpunit tests/Unit/Service/UserServiceTest.php

# Run specific test method
./vendor/bin/phpunit --filter test_create_user_with_valid_data

# Run with coverage
./vendor/bin/phpunit --coverage-html coverage

# Run specific group
./vendor/bin/phpunit --group unit
```

## Basic Test Structure

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Service;

use App\Service\UserService;
use App\Model\User;
use App\Repository\UserRepository;
use PHPUnit\Framework\TestCase;

class UserServiceTest extends TestCase
{
    private UserService $userService;
    private UserRepository $userRepository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->userRepository = new InMemoryUserRepository();
        $this->userService = new UserService($this->userRepository);
    }

    protected function tearDown(): void
    {
        parent::tearDown();
    }

    public function test_create_user_with_valid_data_returns_user(): void
    {
        $data = ['name' => 'Alice', 'email' => 'alice@example.com', 'age' => 30];

        $user = $this->userService->createUser($data);

        $this->assertInstanceOf(User::class, $user);
        $this->assertSame('Alice', $user->getName());
        $this->assertSame('alice@example.com', $user->getEmail());
    }

    public function test_create_user_without_email_throws_exception(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('email');

        $this->userService->createUser(['name' => 'Bob']);
    }

    public function test_create_user_with_duplicate_email_throws_exception(): void
    {
        $data = ['name' => 'Alice', 'email' => 'alice@example.com', 'age' => 30];
        $this->userService->createUser($data);

        $this->expectException(DuplicateEmailException::class);

        $this->userService->createUser($data);
    }
}
```

## Assertion Methods Reference

```php
class AssertionExamplesTest extends TestCase
{
    public function test_equality_assertions(): void
    {
        $this->assertEquals(4, 2 + 2);           // Loose comparison
        $this->assertSame(4, 2 + 2);             // Strict comparison (type + value)
        $this->assertNotEquals(5, 2 + 2);
        $this->assertNotSame('4', 4);             // Different types
        $this->assertEqualsWithDelta(0.3, 0.1 + 0.2, 0.001);
    }

    public function test_boolean_assertions(): void
    {
        $this->assertTrue(10 > 5);
        $this->assertFalse(5 > 10);
        $this->assertNull(null);
        $this->assertNotNull('value');
        $this->assertEmpty([]);
        $this->assertNotEmpty([1, 2, 3]);
    }

    public function test_type_assertions(): void
    {
        $this->assertIsInt(42);
        $this->assertIsString('hello');
        $this->assertIsArray([1, 2, 3]);
        $this->assertIsBool(true);
        $this->assertIsFloat(3.14);
        $this->assertInstanceOf(\DateTime::class, new \DateTime());
    }

    public function test_string_assertions(): void
    {
        $this->assertStringContainsString('world', 'hello world');
        $this->assertStringStartsWith('hello', 'hello world');
        $this->assertStringEndsWith('world', 'hello world');
        $this->assertMatchesRegularExpression('/\d+/', 'abc123');
        $this->assertStringContainsStringIgnoringCase('WORLD', 'hello world');
    }

    public function test_array_assertions(): void
    {
        $this->assertContains(2, [1, 2, 3]);
        $this->assertNotContains(4, [1, 2, 3]);
        $this->assertCount(3, [1, 2, 3]);
        $this->assertArrayHasKey('name', ['name' => 'Alice']);
    }

    public function test_json_assertions(): void
    {
        $expected = '{"name":"Alice","age":30}';
        $actual = '{"age":30,"name":"Alice"}';
        $this->assertJsonStringEqualsJsonString($expected, $actual);
    }

    public function test_exception_assertions(): void
    {
        $this->expectException(\DivisionByZeroError::class);

        $result = 1 / 0;
    }
}
```

## Data Providers

```php
class ValidatorTest extends TestCase
{
    /**
     * @dataProvider validEmailProvider
     */
    public function test_is_valid_email_with_valid_input(string $email): void
    {
        $this->assertTrue(Validators::isValidEmail($email));
    }

    public static function validEmailProvider(): array
    {
        return [
            'simple email' => ['user@example.com'],
            'dotted name' => ['user.name@domain.org'],
            'plus tag' => ['user+tag@example.co.uk'],
            'numeric' => ['user123@test.io'],
        ];
    }

    /**
     * @dataProvider invalidEmailProvider
     */
    public function test_is_valid_email_with_invalid_input(string $email): void
    {
        $this->assertFalse(Validators::isValidEmail($email));
    }

    public static function invalidEmailProvider(): array
    {
        return [
            'empty string' => [''],
            'no at sign' => ['not-an-email'],
            'no local part' => ['@domain.com'],
            'no domain' => ['user@'],
            'space in email' => ['user @domain.com'],
        ];
    }

    /**
     * @dataProvider calculatorProvider
     */
    public function test_add_with_various_inputs(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, Calculator::add($a, $b));
    }

    public static function calculatorProvider(): array
    {
        return [
            'positive numbers' => [1, 1, 2],
            'zeros' => [0, 0, 0],
            'negative and positive' => [-1, 1, 0],
            'large numbers' => [100, 200, 300],
            'both negative' => [-50, -50, -100],
        ];
    }
}
```

## Mocking with PHPUnit

```php
class UserServiceMockTest extends TestCase
{
    private UserService $userService;
    private UserRepository $mockRepository;
    private EmailService $mockEmailService;

    protected function setUp(): void
    {
        $this->mockRepository = $this->createMock(UserRepository::class);
        $this->mockEmailService = $this->createMock(EmailService::class);
        $this->userService = new UserService($this->mockRepository, $this->mockEmailService);
    }

    public function test_get_user_by_id_queries_repository(): void
    {
        $expectedUser = new User('Alice', 'alice@example.com', 30);

        $this->mockRepository
            ->expects($this->once())
            ->method('findById')
            ->with(1)
            ->willReturn($expectedUser);

        $user = $this->userService->getUser(1);

        $this->assertSame('Alice', $user->getName());
    }

    public function test_get_user_not_found_returns_null(): void
    {
        $this->mockRepository
            ->expects($this->once())
            ->method('findById')
            ->with(999)
            ->willReturn(null);

        $user = $this->userService->getUser(999);

        $this->assertNull($user);
    }

    public function test_create_user_sends_welcome_email(): void
    {
        $this->mockRepository
            ->expects($this->once())
            ->method('save')
            ->willReturnCallback(function (User $user) {
                $user->setId(1);
                return $user;
            });

        $this->mockEmailService
            ->expects($this->once())
            ->method('sendWelcome')
            ->with($this->callback(function ($email) {
                return $email === 'bob@example.com';
            }));

        $this->userService->createUser([
            'name' => 'Bob',
            'email' => 'bob@example.com',
        ]);
    }

    public function test_create_user_handles_email_failure(): void
    {
        $this->mockRepository->method('save')->willReturnCallback(function (User $user) {
            $user->setId(1);
            return $user;
        });

        $this->mockEmailService
            ->method('sendWelcome')
            ->willThrowException(new \RuntimeException('SMTP error'));

        // Should not throw even when email fails
        $user = $this->userService->createUser([
            'name' => 'Bob',
            'email' => 'bob@example.com',
        ]);

        $this->assertSame(1, $user->getId());
    }
}
```

## Test Doubles: Stubs and Fakes

```php
class PaymentServiceTest extends TestCase
{
    public function test_process_payment_with_stub_gateway(): void
    {
        $gateway = $this->createStub(PaymentGateway::class);
        $gateway->method('charge')->willReturn([
            'status' => 'success',
            'txn_id' => 'abc123'
        ]);

        $service = new PaymentService($gateway);
        $result = $service->processPayment(50.00, 'tok_123');

        $this->assertSame('success', $result['status']);
    }

    public function test_process_payment_retries_on_failure(): void
    {
        $gateway = $this->createStub(PaymentGateway::class);
        $gateway->method('charge')
            ->willReturnOnConsecutiveCalls(
                $this->throwException(new \RuntimeException('timeout')),
                $this->throwException(new \RuntimeException('timeout')),
                ['status' => 'success', 'txn_id' => 'def456']
            );

        $service = new PaymentService($gateway);
        $result = $service->processPayment(50.00, 'tok_123');

        $this->assertSame('success', $result['status']);
    }
}
```

## Lifecycle Methods

```php
class LifecycleExampleTest extends TestCase
{
    private static $sharedConnection;

    public static function setUpBeforeClass(): void
    {
        // Runs once before ALL tests in this class
        self::$sharedConnection = new DatabaseConnection('sqlite::memory:');
    }

    public static function tearDownAfterClass(): void
    {
        // Runs once after ALL tests in this class
        self::$sharedConnection = null;
    }

    protected function setUp(): void
    {
        // Runs before EACH test
        parent::setUp();
        self::$sharedConnection->beginTransaction();
    }

    protected function tearDown(): void
    {
        // Runs after EACH test
        self::$sharedConnection->rollBack();
        parent::tearDown();
    }

    public function test_insert_user(): void
    {
        self::$sharedConnection->exec(
            "INSERT INTO users (name) VALUES ('Alice')"
        );

        $result = self::$sharedConnection->query("SELECT name FROM users")->fetch();
        $this->assertSame('Alice', $result['name']);
    }
}
```

## Best Practices

1. **Use `assertSame` over `assertEquals` when type matters** -- `assertEquals` does type coercion; `assertSame` catches `'1' !== 1` bugs that loose comparison misses.
2. **Use data providers for multiple inputs** -- Extract test data into `@dataProvider` methods with descriptive keys for clean, maintainable parameterized tests.
3. **Name data provider keys descriptively** -- Use strings like `'empty string'` and `'no at sign'` so PHPUnit output shows which case failed.
4. **Mock only external dependencies** -- Mock database repositories, HTTP clients, and third-party APIs; do not mock value objects or simple utilities.
5. **Use `setUp` and `tearDown` consistently** -- Initialize shared objects in `setUp` and clean up in `tearDown` for test isolation.
6. **Prefer constructor injection** -- Design classes with dependency injection for easy mocking in tests without reflection hacks.
7. **Test exceptions with `expectException`** -- Verify both the exception class and message using `expectExceptionMessage` for precise error testing.
8. **Use `@group` annotations** -- Tag tests as unit, integration, or slow for selective execution with `--group` and `--exclude-group`.
9. **Enable strict mode in phpunit.xml** -- Set `failOnRisky="true"` and `failOnWarning="true"` to catch tests that do not assert anything.
10. **Run with coverage to find gaps** -- Use `--coverage-html` to generate visual reports showing which code paths lack test coverage.

## Anti-Patterns

1. **Using `assertEquals` when `assertSame` is needed** -- Loose comparison hides type coercion bugs; always use strict comparison for scalars.
2. **Not using data providers** -- Copy-pasting test methods with different inputs creates maintenance burden; use `@dataProvider` instead.
3. **Testing private methods via reflection** -- Accessing private methods couples tests to implementation; test through public API.
4. **Ignoring `setUp`/`tearDown`** -- Duplicating setup code in every test method is verbose and fragile when requirements change.
5. **Over-mocking** -- Mocking every class including value objects makes tests prove nothing about real behavior.
6. **Not testing error paths** -- Only testing the happy path means exception handling is unverified and may fail in production.
7. **Hardcoding file paths** -- Using absolute paths breaks tests on other machines; use `sys_get_temp_dir()` and `tempnam()`.
8. **Shared mutable state** -- Static properties modified by tests cause order-dependent failures; reset state in `setUp`.
9. **Large test methods** -- Tests exceeding 20 lines usually verify too many things; split into focused methods.
10. **Not running in strict mode** -- Without `failOnRisky`, tests that assert nothing pass silently, giving false confidence.
