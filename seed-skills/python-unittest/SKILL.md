---
name: Python Unittest
description: Comprehensive Python unittest skill covering TestCase patterns, assertion methods, mocking with unittest.mock, subtests, fixtures, and test organization for robust Python application testing.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [python, unittest, testing, mocking, testcase, assertions, fixtures, tdd]
testingTypes: [unit, integration]
frameworks: [unittest]
languages: [python]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Python Unittest Skill

You are an expert Python developer specializing in testing with the built-in `unittest` framework. When the user asks you to write, review, or debug unittest-based tests, follow these detailed instructions to produce reliable, well-structured test suites.

## Core Principles

1. **Test behavior, not implementation** -- Verify what the code does from a caller's perspective, not how it achieves the result internally.
2. **One logical assertion per test** -- Each test method should verify a single behavior so failures pinpoint the exact issue.
3. **Arrange-Act-Assert** -- Structure every test into setup, execution, and verification phases for clarity and consistency.
4. **Isolate external dependencies** -- Use `unittest.mock.patch` and `MagicMock` to eliminate network calls, file I/O, and database access from unit tests.
5. **Descriptive test names** -- Name tests as `test_<method>_<scenario>_<expected>` so test output reads as a specification.
6. **Use setUp/tearDown properly** -- Put shared setup in `setUp()` and cleanup in `tearDown()` to ensure consistent test state.
7. **Leverage subtests for parameterization** -- Use `self.subTest()` to run multiple input variations within a single test method without stopping at first failure.

## Project Structure

```
project/
  src/
    services/
      __init__.py
      user_service.py
      payment_service.py
    utils/
      __init__.py
      validators.py
      formatters.py
    models/
      __init__.py
      user.py
      order.py
  tests/
    __init__.py
    test_user_service.py
    test_payment_service.py
    test_validators.py
    test_formatters.py
    integration/
      __init__.py
      test_user_payment_flow.py
    fixtures/
      __init__.py
      sample_data.py
  setup.cfg
  pyproject.toml
```

## Configuration

### setup.cfg
```ini
[tool:pytest]
# If using pytest as runner for unittest tests
testpaths = tests

[unittest]
start-dir = tests
pattern = test_*.py
```

### Running Tests
```bash
# Run all tests
python -m unittest discover -s tests -p "test_*.py"

# Run specific test file
python -m unittest tests.test_user_service

# Run specific test class
python -m unittest tests.test_user_service.TestUserService

# Run specific test method
python -m unittest tests.test_user_service.TestUserService.test_create_user_with_valid_data

# Verbose output
python -m unittest discover -v
```

## Basic Test Structure

```python
import unittest
from src.services.user_service import UserService


class TestUserService(unittest.TestCase):
    """Tests for UserService class."""

    def setUp(self):
        """Set up test fixtures before each test method."""
        self.service = UserService()
        self.valid_user_data = {
            'name': 'Alice',
            'email': 'alice@example.com',
            'age': 30
        }

    def tearDown(self):
        """Clean up after each test method."""
        self.service = None

    def test_create_user_with_valid_data(self):
        """Should create a user when all required fields are provided."""
        user = self.service.create_user(self.valid_user_data)

        self.assertIsNotNone(user)
        self.assertEqual(user.name, 'Alice')
        self.assertEqual(user.email, 'alice@example.com')

    def test_create_user_without_email_raises_error(self):
        """Should raise ValueError when email is missing."""
        invalid_data = {'name': 'Bob'}

        with self.assertRaises(ValueError) as context:
            self.service.create_user(invalid_data)

        self.assertIn('email', str(context.exception))

    def test_create_user_with_invalid_email_raises_error(self):
        """Should raise ValueError for malformed email addresses."""
        invalid_data = {'name': 'Bob', 'email': 'not-an-email'}

        with self.assertRaises(ValueError):
            self.service.create_user(invalid_data)


if __name__ == '__main__':
    unittest.main()
```

## Assertion Methods Reference

```python
class TestAssertionExamples(unittest.TestCase):
    """Demonstrates unittest assertion methods."""

    def test_equality_assertions(self):
        self.assertEqual(1 + 1, 2)
        self.assertNotEqual(1, 2)
        self.assertAlmostEqual(0.1 + 0.2, 0.3, places=5)
        self.assertNotAlmostEqual(1.0, 2.0)

    def test_truth_assertions(self):
        self.assertTrue(10 > 5)
        self.assertFalse(5 > 10)
        self.assertIsNone(None)
        self.assertIsNotNone('value')

    def test_identity_assertions(self):
        a = [1, 2, 3]
        b = a
        c = [1, 2, 3]
        self.assertIs(a, b)
        self.assertIsNot(a, c)

    def test_type_assertions(self):
        self.assertIsInstance(42, int)
        self.assertNotIsInstance('hello', int)

    def test_collection_assertions(self):
        self.assertIn(2, [1, 2, 3])
        self.assertNotIn(4, [1, 2, 3])
        self.assertCountEqual([1, 2, 3], [3, 1, 2])

    def test_string_assertions(self):
        self.assertRegex('hello123', r'\d+')
        self.assertNotRegex('hello', r'\d+')

    def test_comparison_assertions(self):
        self.assertGreater(10, 5)
        self.assertGreaterEqual(10, 10)
        self.assertLess(5, 10)
        self.assertLessEqual(5, 5)
```

## Mocking Patterns

### Using @patch Decorator
```python
from unittest.mock import patch, MagicMock
from src.services.user_service import UserService


class TestUserServiceWithMocks(unittest.TestCase):

    @patch('src.services.user_service.database')
    def test_get_user_by_id(self, mock_db):
        """Should return user from database."""
        mock_db.find_one.return_value = {
            'id': 1,
            'name': 'Alice',
            'email': 'alice@example.com'
        }
        service = UserService()

        user = service.get_user(1)

        mock_db.find_one.assert_called_once_with({'id': 1})
        self.assertEqual(user['name'], 'Alice')

    @patch('src.services.user_service.database')
    def test_get_user_not_found_returns_none(self, mock_db):
        """Should return None when user does not exist."""
        mock_db.find_one.return_value = None
        service = UserService()

        user = service.get_user(999)

        self.assertIsNone(user)

    @patch('src.services.user_service.email_client')
    @patch('src.services.user_service.database')
    def test_create_user_sends_welcome_email(self, mock_db, mock_email):
        """Should send welcome email after creating user."""
        mock_db.insert_one.return_value = MagicMock(inserted_id=1)
        service = UserService()

        service.create_user({'name': 'Bob', 'email': 'bob@example.com'})

        mock_email.send.assert_called_once()
        call_args = mock_email.send.call_args
        self.assertEqual(call_args[1]['to'], 'bob@example.com')
```

### Using Context Manager
```python
class TestPaymentService(unittest.TestCase):

    def test_process_payment_calls_gateway(self):
        """Should call payment gateway with correct amount."""
        with patch('src.services.payment_service.PaymentGateway') as MockGateway:
            mock_instance = MockGateway.return_value
            mock_instance.charge.return_value = {'status': 'success', 'txn_id': 'abc123'}

            service = PaymentService()
            result = service.process_payment(amount=50.00, card_token='tok_123')

            mock_instance.charge.assert_called_once_with(
                amount=50.00,
                token='tok_123'
            )
            self.assertEqual(result['status'], 'success')

    def test_process_payment_handles_gateway_error(self):
        """Should raise PaymentError when gateway fails."""
        with patch('src.services.payment_service.PaymentGateway') as MockGateway:
            mock_instance = MockGateway.return_value
            mock_instance.charge.side_effect = ConnectionError('Gateway down')

            service = PaymentService()

            with self.assertRaises(PaymentError):
                service.process_payment(amount=50.00, card_token='tok_123')
```

## Subtests for Parameterized Testing

```python
class TestValidator(unittest.TestCase):

    def test_email_validation_with_valid_emails(self):
        """Should accept various valid email formats."""
        valid_emails = [
            'user@example.com',
            'user.name@domain.org',
            'user+tag@example.co.uk',
            'user123@test.io',
        ]
        for email in valid_emails:
            with self.subTest(email=email):
                self.assertTrue(validate_email(email))

    def test_email_validation_with_invalid_emails(self):
        """Should reject malformed email addresses."""
        invalid_emails = [
            '',
            'not-an-email',
            '@domain.com',
            'user@',
            'user @domain.com',
        ]
        for email in invalid_emails:
            with self.subTest(email=email):
                self.assertFalse(validate_email(email))

    def test_age_validation_with_boundary_values(self):
        """Should validate age is within acceptable range."""
        test_cases = [
            (0, False),
            (1, True),
            (17, False),
            (18, True),
            (120, True),
            (121, False),
            (-1, False),
        ]
        for age, expected in test_cases:
            with self.subTest(age=age, expected=expected):
                self.assertEqual(validate_age(age), expected)
```

## Class-Level Fixtures

```python
class TestDatabaseIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """One-time setup for entire test class."""
        cls.db_connection = create_test_database()
        cls.db_connection.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)')

    @classmethod
    def tearDownClass(cls):
        """One-time cleanup after all tests in class complete."""
        cls.db_connection.execute('DROP TABLE users')
        cls.db_connection.close()

    def setUp(self):
        """Per-test setup: start transaction for rollback."""
        self.db_connection.execute('BEGIN')

    def tearDown(self):
        """Per-test cleanup: rollback to maintain isolation."""
        self.db_connection.execute('ROLLBACK')

    def test_insert_user(self):
        """Should insert user into database."""
        self.db_connection.execute(
            "INSERT INTO users (name) VALUES (?)", ('Alice',)
        )
        result = self.db_connection.execute("SELECT name FROM users").fetchone()
        self.assertEqual(result[0], 'Alice')
```

## Testing Async Code

```python
import asyncio
import unittest
from unittest.mock import AsyncMock, patch


class TestAsyncService(unittest.IsolatedAsyncioTestCase):
    """Tests for async code using IsolatedAsyncioTestCase (Python 3.8+)."""

    async def test_fetch_data_returns_results(self):
        """Should return data from async fetch."""
        service = AsyncDataService()

        with patch.object(service, 'http_client') as mock_client:
            mock_client.get = AsyncMock(return_value={'items': [1, 2, 3]})

            result = await service.fetch_data('/api/items')

            self.assertEqual(len(result['items']), 3)

    async def test_fetch_data_retries_on_failure(self):
        """Should retry failed requests up to 3 times."""
        service = AsyncDataService()

        with patch.object(service, 'http_client') as mock_client:
            mock_client.get = AsyncMock(
                side_effect=[
                    ConnectionError('timeout'),
                    ConnectionError('timeout'),
                    {'items': []}
                ]
            )

            result = await service.fetch_data('/api/items')

            self.assertEqual(mock_client.get.call_count, 3)
            self.assertEqual(result['items'], [])
```

## Best Practices

1. **Use `setUp` and `tearDown` consistently** -- Initialize shared test objects in `setUp` and clean up resources in `tearDown` to ensure each test starts with a clean slate.
2. **Prefer `assertRaises` context manager** -- Use `with self.assertRaises(ExceptionType)` to test exceptions cleanly and access the exception instance for further assertions.
3. **Use `subTest` for data-driven tests** -- Instead of writing separate test methods for each input, use `self.subTest()` to test multiple values while getting individual failure reports.
4. **Mock at the right level** -- Patch dependencies where they are imported (e.g., `@patch('src.services.user_service.database')`) not where they are defined.
5. **Keep test files parallel to source** -- Mirror the source directory structure in your test directory so developers can quickly find related tests.
6. **Use `MagicMock` for complex dependencies** -- It automatically creates attributes and methods on access, reducing boilerplate for complex mock setups.
7. **Test edge cases explicitly** -- Include tests for empty inputs, None values, boundary conditions, and maximum-size inputs.
8. **Use `setUpClass` for expensive setup** -- Database connections and file system setup that can be shared across tests should use class-level fixtures.
9. **Run tests with discovery** -- Use `python -m unittest discover` to automatically find and run all tests rather than importing them manually.
10. **Avoid test interdependencies** -- Each test must pass regardless of execution order; never rely on another test's side effects.

## Anti-Patterns

1. **Testing private methods directly** -- Accessing `_private_method()` couples tests to implementation; test through the public API instead.
2. **Using `assertEqual(True, result)` instead of `assertTrue`** -- Use the specific assertion method for better failure messages and readability.
3. **Not cleaning up resources** -- Forgetting `tearDown` for file handles, database connections, or temporary files causes resource leaks and flaky tests.
4. **Mocking too much** -- If you mock every dependency, your test proves nothing about real behavior; mock only external I/O and non-deterministic code.
5. **Catching exceptions in test methods** -- Wrapping code in try/except swallows real failures; let exceptions propagate and use `assertRaises` instead.
6. **Hardcoding file paths** -- Using absolute paths in tests breaks on other machines; use `tempfile` and `os.path.join` for portability.
7. **Sharing mutable state between tests** -- Class-level mutable objects modified in tests cause order-dependent failures that are painful to debug.
8. **Ignoring test output** -- Not using `-v` flag or not reading test names means you miss the specification value of well-named tests.
9. **Writing tests without setup/teardown** -- Duplicating setup code in every test method makes tests verbose and fragile when setup requirements change.
10. **Skipping exception testing** -- Not testing error paths means half your code's behavior is unverified and may fail silently in production.
