---
name: Ruby Test::Unit
description: Classic xUnit-style Ruby testing with Test::Unit covering assertions, fixtures, test case organization, mocking patterns, and lifecycle hooks for reliable Ruby application testing.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [ruby, test-unit, xunit, assertions, fixtures, unit-testing, tdd]
testingTypes: [unit, integration]
frameworks: [test-unit]
languages: [ruby]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Ruby Test::Unit Skill

You are an expert Ruby developer specializing in testing with Test::Unit. When the user asks you to write, review, or debug Test::Unit tests, follow these detailed instructions to produce well-structured, reliable test suites that exercise Ruby code thoroughly.

## Core Principles

1. **Test behavior through public interfaces** -- Verify what the code does from a caller's perspective rather than inspecting internal state.
2. **One assertion focus per test** -- Each test method should verify a single logical behavior for precise failure diagnostics.
3. **Arrange-Act-Assert** -- Structure every test into setup, execution, and verification phases for readability and consistency.
4. **Isolate tests completely** -- Each test must run independently and produce the same result regardless of execution order.
5. **Descriptive test names** -- Name tests as `test_<method>_<scenario>_<expected>` so output reads as a living specification.
6. **Use fixtures for shared state** -- Leverage `setup` and `teardown` for per-test initialization and cleanup.
7. **Cover edge cases** -- Test boundary values, empty inputs, nil handling, and error conditions explicitly.

## Project Structure

```
project/
  lib/
    services/
      user_service.rb
      payment_service.rb
    models/
      user.rb
      order.rb
    utils/
      validators.rb
      formatters.rb
  test/
    test_helper.rb
    services/
      test_user_service.rb
      test_payment_service.rb
    models/
      test_user.rb
      test_order.rb
    utils/
      test_validators.rb
      test_formatters.rb
    integration/
      test_user_payment_flow.rb
    fixtures/
      sample_users.yml
  Gemfile
  Rakefile
```

## Configuration

### Gemfile
```ruby
group :test do
  gem 'test-unit', '~> 3.6'
  gem 'mocha', '~> 2.1'
  gem 'simplecov', require: false
end
```

### test_helper.rb
```ruby
require 'simplecov'
SimpleCov.start

require 'test-unit'
require 'mocha/test_unit'

$LOAD_PATH.unshift File.expand_path('../lib', __dir__)
```

### Rakefile
```ruby
require 'rake/testtask'

Rake::TestTask.new(:test) do |t|
  t.libs << 'test'
  t.libs << 'lib'
  t.test_files = FileList['test/**/test_*.rb']
  t.verbose = true
end

task default: :test
```

### Running Tests
```bash
# Run all tests
ruby -Itest -Ilib test/services/test_user_service.rb

# Run with Rake
rake test

# Run specific test method
ruby -Itest -Ilib test/services/test_user_service.rb --name test_create_user_with_valid_data

# Auto-discovery
testrb test/
```

## Basic Test Structure

```ruby
require 'test_helper'
require 'services/user_service'

class TestUserService < Test::Unit::TestCase
  def setup
    @service = UserService.new
    @valid_user_data = {
      name: 'Alice',
      email: 'alice@example.com',
      age: 30
    }
  end

  def teardown
    @service = nil
  end

  def test_create_user_with_valid_data
    user = @service.create_user(@valid_user_data)

    assert_not_nil user
    assert_equal 'Alice', user.name
    assert_equal 'alice@example.com', user.email
  end

  def test_create_user_without_email_raises_argument_error
    invalid_data = { name: 'Bob' }

    assert_raise(ArgumentError) do
      @service.create_user(invalid_data)
    end
  end

  def test_create_user_with_invalid_email_raises_error
    invalid_data = { name: 'Bob', email: 'not-an-email' }

    error = assert_raise(ArgumentError) do
      @service.create_user(invalid_data)
    end

    assert_match(/email/, error.message)
  end
end
```

## Assertion Methods Reference

```ruby
class TestAssertionExamples < Test::Unit::TestCase
  def test_equality_assertions
    assert_equal 4, 2 + 2
    assert_not_equal 5, 2 + 2
    assert_in_delta 0.3, 0.1 + 0.2, 0.001
    assert_in_epsilon 100, 99, 0.02
  end

  def test_truth_assertions
    assert true
    assert_true true
    assert_false false
    assert_nil nil
    assert_not_nil 'value'
  end

  def test_identity_assertions
    a = 'hello'
    b = a
    assert_same a, b
    assert_not_same 'hello', 'hello'
  end

  def test_type_assertions
    assert_instance_of String, 'hello'
    assert_kind_of Numeric, 42
    assert_kind_of Enumerable, [1, 2, 3]
  end

  def test_collection_assertions
    assert_include [1, 2, 3], 2
    assert_not_include [1, 2, 3], 4
    assert_empty []
    assert_not_empty [1]
  end

  def test_string_assertions
    assert_match(/\d+/, 'hello123')
    assert_not_match(/\d+/, 'hello')
  end

  def test_exception_assertions
    assert_raise(ZeroDivisionError) { 1 / 0 }
    assert_nothing_raised { 1 + 1 }
  end

  def test_comparison_assertions
    assert_compare 10, '>', 5
    assert_compare 5, '<', 10
    assert_compare 10, '>=', 10
    assert_compare 5, '<=', 5
  end

  def test_respond_to_assertion
    assert_respond_to 'hello', :upcase
    assert_respond_to [1, 2], :length
  end
end
```

## Mocking with Mocha

```ruby
require 'test_helper'
require 'services/user_service'

class TestUserServiceWithMocks < Test::Unit::TestCase
  def setup
    @db = mock('database')
    @email_client = mock('email_client')
    @service = UserService.new(db: @db, email_client: @email_client)
  end

  def test_get_user_by_id
    expected_user = { id: 1, name: 'Alice', email: 'alice@example.com' }
    @db.expects(:find_one).with(id: 1).returns(expected_user)

    user = @service.get_user(1)

    assert_equal 'Alice', user[:name]
  end

  def test_get_user_not_found_returns_nil
    @db.expects(:find_one).with(id: 999).returns(nil)

    user = @service.get_user(999)

    assert_nil user
  end

  def test_create_user_sends_welcome_email
    @db.expects(:insert).returns(1)
    @email_client.expects(:send).with(
      has_entries(to: 'bob@example.com', subject: 'Welcome')
    )

    @service.create_user(name: 'Bob', email: 'bob@example.com')
  end

  def test_create_user_handles_email_failure_gracefully
    @db.expects(:insert).returns(1)
    @email_client.expects(:send).raises(RuntimeError, 'SMTP error')

    assert_nothing_raised do
      @service.create_user(name: 'Bob', email: 'bob@example.com')
    end
  end
end
```

## Stubbing Methods

```ruby
class TestPaymentService < Test::Unit::TestCase
  def test_process_payment_calls_gateway
    gateway = stub('gateway')
    gateway.stubs(:charge).returns({ status: 'success', txn_id: 'abc123' })

    service = PaymentService.new(gateway: gateway)
    result = service.process_payment(amount: 50.00, card_token: 'tok_123')

    assert_equal 'success', result[:status]
  end

  def test_process_payment_retries_on_timeout
    gateway = mock('gateway')
    gateway.expects(:charge).times(3).raises(Timeout::Error).then.raises(Timeout::Error).then.returns({ status: 'success' })

    service = PaymentService.new(gateway: gateway)
    result = service.process_payment(amount: 50.00, card_token: 'tok_123')

    assert_equal 'success', result[:status]
  end
end
```

## Lifecycle Hooks

```ruby
class TestWithLifecycleHooks < Test::Unit::TestCase
  class << self
    def startup
      puts 'Runs once before ALL tests in this class'
      @@shared_resource = ExpensiveResource.new
    end

    def shutdown
      puts 'Runs once after ALL tests in this class'
      @@shared_resource.close
    end
  end

  def setup
    puts 'Runs before EACH test'
    @local_state = fresh_state
  end

  def teardown
    puts 'Runs after EACH test'
    @local_state = nil
  end

  def test_example_one
    assert_not_nil @@shared_resource
    assert_not_nil @local_state
  end

  def test_example_two
    assert_not_nil @@shared_resource
    assert_not_nil @local_state
  end

  private

  def fresh_state
    { counter: 0, items: [] }
  end
end
```

## Data-Driven Tests

```ruby
class TestEmailValidator < Test::Unit::TestCase
  VALID_EMAILS = %w[
    user@example.com
    user.name@domain.org
    user+tag@example.co.uk
    user123@test.io
  ].freeze

  INVALID_EMAILS = [
    '',
    'not-an-email',
    '@domain.com',
    'user@',
    'user @domain.com'
  ].freeze

  data(
    'simple email' => ['user@example.com', true],
    'dotted name' => ['user.name@domain.org', true],
    'plus tag' => ['user+tag@example.co.uk', true],
    'empty string' => ['', false],
    'no at sign' => ['not-an-email', false],
    'no local part' => ['@domain.com', false],
  )
  def test_email_validation(data)
    email, expected = data
    assert_equal expected, Validators.valid_email?(email),
      "Expected valid_email?('#{email}') to return #{expected}"
  end

  data(
    'zero' => [0, false],
    'one' => [1, true],
    'seventeen' => [17, false],
    'eighteen' => [18, true],
    'one twenty' => [120, true],
    'one twenty one' => [121, false],
    'negative' => [-1, false],
  )
  def test_age_validation(data)
    age, expected = data
    assert_equal expected, Validators.valid_age?(age)
  end
end
```

## Custom Assertions

```ruby
module CustomAssertions
  def assert_valid_email(email, message = nil)
    email_regex = /\A[^@\s]+@[^@\s]+\.[^@\s]+\z/
    full_message = build_message(message, "Expected ? to be a valid email", email)
    assert_block(full_message) { email_regex.match?(email) }
  end

  def assert_json_response(response, message = nil)
    full_message = build_message(message, "Expected response to be valid JSON with status 200")
    assert_block(full_message) do
      response.code == '200' && JSON.parse(response.body)
    end
  end
end

class TestWithCustomAssertions < Test::Unit::TestCase
  include CustomAssertions

  def test_email_format
    assert_valid_email 'alice@example.com'
  end
end
```

## Best Practices

1. **Use `setup` and `teardown` for consistent state** -- Initialize shared objects in `setup` and release resources in `teardown` so each test starts fresh.
2. **Prefer specific assertions** -- Use `assert_equal` over `assert(a == b)` for better error messages and clarity on what failed.
3. **Use `data` method for parameterized tests** -- Test::Unit's data-driven testing keeps multiple test cases organized and produces clear output per data set.
4. **Mock external dependencies** -- Use Mocha to stub HTTP clients, databases, and third-party APIs while testing business logic in isolation.
5. **Test exceptions with `assert_raise`** -- Verify both the exception class and message content to ensure errors are meaningful and correct.
6. **Use `startup`/`shutdown` for expensive resources** -- Share database connections or file handles across all tests in a class to avoid redundant initialization.
7. **Keep test files parallel to source** -- Mirror the `lib/` directory structure in `test/` so developers can quickly locate related tests.
8. **Test edge cases explicitly** -- Include nil inputs, empty collections, boundary values, and Unicode strings in your test data.
9. **Run tests in random order** -- Configure random seed execution to catch order-dependent test coupling.
10. **Use SimpleCov for coverage tracking** -- Measure and enforce coverage thresholds to identify untested code paths.

## Anti-Patterns

1. **Testing private methods directly** -- Calling private methods via `send(:private_method)` couples tests to implementation; test through the public API.
2. **Using `assert` with boolean expressions** -- `assert(result == expected)` gives no useful message on failure; use `assert_equal expected, result` instead.
3. **Not cleaning up in teardown** -- Failing to close file handles, database connections, or temporary files causes resource leaks across test runs.
4. **Over-mocking** -- Mocking every dependency makes tests prove nothing about real interactions; mock only I/O and non-deterministic behavior.
5. **Shared mutable class variables** -- Modifying `@@variables` in tests causes order-dependent failures that are notoriously difficult to debug.
6. **Hardcoding absolute paths** -- Using platform-specific paths breaks tests on different machines; use `File.expand_path` and `Tempfile`.
7. **Large test methods** -- Tests exceeding 20 lines usually verify too many things; split into focused test methods with clear names.
8. **Ignoring test output** -- Not running with verbose flags means you miss valuable context about which behaviors are covered.
9. **Skipping error path testing** -- Only testing the happy path leaves exception handling and edge cases unverified.
10. **Not using `assert_nothing_raised`** -- When testing that code completes without error, use `assert_nothing_raised` to make the intent explicit.
