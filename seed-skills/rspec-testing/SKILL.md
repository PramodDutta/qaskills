---
name: "RSpec Testing"
description: "Comprehensive Ruby testing with RSpec including describe/context/it blocks, matchers, let/before hooks, mocking with doubles, shared examples, and Rails integration."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [rspec, ruby, tdd, bdd, mocking, matchers, rails, testing]
testingTypes: [unit, integration, acceptance, bdd]
frameworks: [rspec]
languages: [ruby]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# RSpec Testing

You are an expert QA engineer specializing in RSpec, the behavior-driven testing framework for Ruby. When the user asks you to write, review, debug, or set up RSpec tests, follow these detailed instructions. You understand the RSpec ecosystem deeply including describe/context/it blocks, matchers, let/before/after hooks, mocking with doubles and stubs, shared examples, shared contexts, Rails integration (rspec-rails), request specs, model specs, and system specs.

## Core Principles

1. **Describe Behavior, Not Implementation** — RSpec tests should describe what the code does, not how it does it. Use `describe`, `context`, and `it` blocks to build readable specifications.
2. **Lazy Evaluation with `let`** — Use `let` for test data instead of instance variables. `let` is lazy (evaluated on first use) and memoized within each example.
3. **Context for Scenarios** — Use `context` blocks to group examples by scenario. Always start context descriptions with "when", "with", or "without".
4. **One Assertion Per Example** — Each `it` block should verify one behavior. Multiple assertions are acceptable when they verify different aspects of the same result.
5. **Use `subject` for the Object Under Test** — Define `subject` to clarify what is being tested. Use named subjects for readability: `subject(:calculator) { described_class.new }`.
6. **Prefer `expect` Over `should`** — Always use the modern `expect().to` syntax. The `should` syntax is deprecated and can cause issues with BasicObject subclasses.
7. **Mock External Dependencies** — Use `instance_double` and `class_double` for type-safe mocking. Never mock what you own unless you also have integration tests.

## Project Structure

```
project-root/
├── Gemfile
├── .rspec                            # RSpec CLI options
├── spec/
│   ├── spec_helper.rb                # Core RSpec configuration
│   ├── rails_helper.rb               # Rails-specific config (if Rails)
│   ├── models/
│   │   ├── user_spec.rb
│   │   ├── order_spec.rb
│   │   └── product_spec.rb
│   ├── services/
│   │   ├── user_service_spec.rb
│   │   ├── payment_service_spec.rb
│   │   └── notification_service_spec.rb
│   ├── requests/
│   │   ├── users_spec.rb
│   │   └── orders_spec.rb
│   ├── system/
│   │   ├── login_spec.rb
│   │   └── checkout_spec.rb
│   ├── support/
│   │   ├── shared_examples/
│   │   │   ├── validatable.rb
│   │   │   └── timestamped.rb
│   │   ├── shared_contexts/
│   │   │   ├── authenticated_user.rb
│   │   │   └── with_products.rb
│   │   ├── matchers/
│   │   │   └── custom_matchers.rb
│   │   ├── helpers/
│   │   │   ├── auth_helper.rb
│   │   │   └── api_helper.rb
│   │   └── factory_bot.rb
│   ├── factories/
│   │   ├── users.rb
│   │   ├── orders.rb
│   │   └── products.rb
│   └── fixtures/
│       └── files/
│           └── sample.pdf
```

## Detailed Code Examples

### Basic RSpec Structure

```ruby
# spec/models/calculator_spec.rb
RSpec.describe Calculator do
  subject(:calculator) { described_class.new }

  describe '#add' do
    it 'adds two positive numbers' do
      expect(calculator.add(2, 3)).to eq(5)
    end

    it 'handles negative numbers' do
      expect(calculator.add(-1, 1)).to eq(0)
    end

    it 'handles zero' do
      expect(calculator.add(0, 5)).to eq(5)
    end
  end

  describe '#divide' do
    context 'when divisor is not zero' do
      it 'divides evenly' do
        expect(calculator.divide(10, 2)).to eq(5)
      end

      it 'returns float for uneven division' do
        expect(calculator.divide(10, 3)).to be_within(0.01).of(3.33)
      end
    end

    context 'when divisor is zero' do
      it 'raises ZeroDivisionError' do
        expect { calculator.divide(10, 0) }.to raise_error(ZeroDivisionError)
      end
    end
  end
end
```

### Matchers Reference

```ruby
# spec/matchers_examples_spec.rb
RSpec.describe 'RSpec Matchers' do
  # Equality
  it 'equality matchers' do
    expect(5).to eq(5)              # value equality (==)
    expect(5).to eql(5)             # type + value equality (eql?)
    expect(obj).to equal(same_obj)  # identity equality (equal?)
    expect(obj).to be(same_obj)     # alias for equal
  end

  # Comparison
  it 'comparison matchers' do
    expect(10).to be > 5
    expect(10).to be >= 10
    expect(10).to be < 20
    expect(10).to be_between(5, 15).inclusive
    expect(10).to be_between(5, 15).exclusive
    expect(10.5).to be_within(0.1).of(10.4)
  end

  # Truthiness
  it 'truthiness matchers' do
    expect(true).to be_truthy
    expect(false).to be_falsey
    expect(nil).to be_nil
    expect(1).to be_truthy         # anything truthy
    expect(nil).to be_falsey       # nil is falsey
  end

  # Collections
  it 'collection matchers' do
    expect([1, 2, 3]).to include(2)
    expect([1, 2, 3]).to contain_exactly(3, 1, 2)  # order-independent
    expect([1, 2, 3]).to match_array([3, 1, 2])     # alias
    expect([1, 2, 3]).to start_with(1)
    expect([1, 2, 3]).to end_with(3)
    expect([]).to be_empty
    expect([1, 2, 3]).to have_attributes(length: 3)
    expect({ a: 1, b: 2 }).to include(a: 1)
    expect({ a: 1, b: 2 }).to have_key(:a)
    expect({ a: 1, b: 2 }).to have_value(2)
  end

  # Strings
  it 'string matchers' do
    expect('Hello World').to include('Hello')
    expect('Hello World').to start_with('Hello')
    expect('Hello World').to end_with('World')
    expect('Hello World').to match(/\w+ \w+/)
    expect('Hello World').to eq('Hello World')
  end

  # Types
  it 'type matchers' do
    expect('hello').to be_a(String)
    expect('hello').to be_an_instance_of(String)
    expect(1).to be_a(Numeric)
    expect([]).to respond_to(:push)
    expect([]).to respond_to(:push).with(1).argument
  end

  # Exceptions
  it 'exception matchers' do
    expect { raise StandardError, 'boom' }.to raise_error(StandardError)
    expect { raise StandardError, 'boom' }.to raise_error(StandardError, 'boom')
    expect { raise StandardError, 'boom' }.to raise_error(StandardError, /boom/)
    expect { 1 + 1 }.not_to raise_error
  end

  # Change
  it 'change matchers' do
    list = []
    expect { list.push(1) }.to change(list, :size).by(1)
    expect { list.push(1) }.to change(list, :size).from(1).to(2)
    expect { list.push(1) }.to change { list.size }.by(1)
  end

  # Output
  it 'output matchers' do
    expect { print 'hello' }.to output('hello').to_stdout
    expect { warn 'danger' }.to output(/danger/).to_stderr
  end

  # Predicate matchers (automatic from methods ending in ?)
  it 'predicate matchers' do
    expect([]).to be_empty        # calls empty?
    expect(1).to be_positive      # calls positive?
    expect(nil).to be_nil         # calls nil?
    expect('abc').to be_frozen     # calls frozen? (if applicable)
  end
end
```

### Hooks and Let

```ruby
# spec/services/user_service_spec.rb
RSpec.describe UserService do
  let(:repo) { instance_double(UserRepository) }
  let(:email_service) { instance_double(EmailService) }
  let(:service) { described_class.new(repo, email_service) }
  let(:valid_params) { { name: 'Alice', email: 'alice@test.com' } }

  before do
    allow(repo).to receive(:save).and_return(true)
    allow(email_service).to receive(:send_welcome).and_return(true)
  end

  describe '#create_user' do
    context 'with valid parameters' do
      it 'saves the user to the repository' do
        service.create_user(valid_params)
        expect(repo).to have_received(:save).with(
          having_attributes(name: 'Alice', email: 'alice@test.com')
        )
      end

      it 'sends a welcome email' do
        service.create_user(valid_params)
        expect(email_service).to have_received(:send_welcome).with('alice@test.com')
      end

      it 'returns a success result' do
        result = service.create_user(valid_params)
        expect(result).to be_success
        expect(result.user.name).to eq('Alice')
      end
    end

    context 'with invalid email' do
      let(:invalid_params) { { name: 'Alice', email: 'not-an-email' } }

      it 'returns a failure result' do
        result = service.create_user(invalid_params)
        expect(result).to be_failure
        expect(result.errors).to include('Invalid email format')
      end

      it 'does not save to repository' do
        service.create_user(invalid_params)
        expect(repo).not_to have_received(:save)
      end

      it 'does not send a welcome email' do
        service.create_user(invalid_params)
        expect(email_service).not_to have_received(:send_welcome)
      end
    end

    context 'when repository raises an error' do
      before do
        allow(repo).to receive(:save).and_raise(ActiveRecord::RecordNotUnique)
      end

      it 'returns a failure result with duplicate message' do
        result = service.create_user(valid_params)
        expect(result).to be_failure
        expect(result.errors).to include('User already exists')
      end
    end
  end
end
```

### Mocking and Stubbing

```ruby
# spec/services/payment_service_spec.rb
RSpec.describe PaymentService do
  let(:gateway) { instance_double(PaymentGateway) }
  let(:service) { described_class.new(gateway) }

  describe '#process_payment' do
    let(:order) { instance_double(Order, total: 99.99, id: 42) }

    context 'when payment succeeds' do
      before do
        allow(gateway).to receive(:charge).and_return(
          double('ChargeResult', success?: true, transaction_id: 'txn_123')
        )
      end

      it 'charges the correct amount' do
        service.process_payment(order)
        expect(gateway).to have_received(:charge).with(99.99, anything)
      end

      it 'returns the transaction ID' do
        result = service.process_payment(order)
        expect(result.transaction_id).to eq('txn_123')
      end
    end

    context 'when payment fails' do
      before do
        allow(gateway).to receive(:charge).and_return(
          double('ChargeResult', success?: false, error: 'Card declined')
        )
      end

      it 'raises PaymentError' do
        expect { service.process_payment(order) }
          .to raise_error(PaymentError, /Card declined/)
      end
    end

    # Argument matchers
    it 'uses argument matchers for flexible expectations' do
      allow(gateway).to receive(:charge).with(
        anything,
        hash_including(currency: 'USD')
      ).and_return(double(success?: true, transaction_id: 'txn_456'))

      service.process_payment(order)
      expect(gateway).to have_received(:charge).once
    end

    # Message ordering
    it 'validates message order when important' do
      allow(gateway).to receive(:authorize).ordered.and_return(double(success?: true))
      allow(gateway).to receive(:capture).ordered.and_return(double(success?: true))

      service.process_payment_two_step(order)
    end
  end
end
```

### Shared Examples

```ruby
# spec/support/shared_examples/validatable.rb
RSpec.shared_examples 'a validatable model' do
  it { is_expected.to be_valid }

  it 'is invalid without a name' do
    subject.name = nil
    expect(subject).not_to be_valid
    expect(subject.errors[:name]).to include("can't be blank")
  end

  it 'is invalid without an email' do
    subject.email = nil
    expect(subject).not_to be_valid
    expect(subject.errors[:email]).to include("can't be blank")
  end

  it 'is invalid with a duplicate email' do
    described_class.create!(name: 'Other', email: subject.email)
    expect(subject).not_to be_valid
    expect(subject.errors[:email]).to include('has already been taken')
  end
end

# spec/support/shared_examples/timestamped.rb
RSpec.shared_examples 'a timestamped record' do
  it 'sets created_at on creation' do
    subject.save!
    expect(subject.created_at).to be_present
  end

  it 'updates updated_at on modification' do
    subject.save!
    original = subject.updated_at
    subject.update!(name: 'Updated')
    expect(subject.updated_at).to be > original
  end
end

# spec/models/user_spec.rb
RSpec.describe User do
  subject { build(:user) }

  it_behaves_like 'a validatable model'
  it_behaves_like 'a timestamped record'

  describe '#full_name' do
    it 'combines first and last name' do
      user = build(:user, first_name: 'John', last_name: 'Doe')
      expect(user.full_name).to eq('John Doe')
    end
  end
end
```

### Shared Contexts

```ruby
# spec/support/shared_contexts/authenticated_user.rb
RSpec.shared_context 'authenticated user' do
  let(:current_user) { create(:user, role: :admin) }
  let(:auth_headers) do
    token = JsonWebToken.encode(user_id: current_user.id)
    { 'Authorization' => "Bearer #{token}" }
  end

  before do
    allow_any_instance_of(ApplicationController)
      .to receive(:current_user).and_return(current_user)
  end
end

# spec/requests/users_spec.rb
RSpec.describe 'Users API', type: :request do
  include_context 'authenticated user'

  describe 'GET /api/users' do
    before { create_list(:user, 3) }

    it 'returns all users' do
      get '/api/users', headers: auth_headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).size).to eq(4) # 3 + current_user
    end
  end

  describe 'POST /api/users' do
    let(:valid_params) { { user: { name: 'New User', email: 'new@test.com' } } }

    it 'creates a user' do
      expect {
        post '/api/users', params: valid_params, headers: auth_headers
      }.to change(User, :count).by(1)

      expect(response).to have_http_status(:created)
    end
  end
end
```

### Rails System Specs (Feature Tests)

```ruby
# spec/system/login_spec.rb
RSpec.describe 'User Login', type: :system do
  before do
    driven_by(:selenium_chrome_headless)
  end

  let!(:user) { create(:user, email: 'user@example.com', password: 'SecurePass123') }

  it 'logs in with valid credentials' do
    visit login_path
    fill_in 'Email', with: 'user@example.com'
    fill_in 'Password', with: 'SecurePass123'
    click_button 'Login'

    expect(page).to have_current_path(dashboard_path)
    expect(page).to have_content('Welcome')
  end

  it 'shows error with invalid credentials' do
    visit login_path
    fill_in 'Email', with: 'user@example.com'
    fill_in 'Password', with: 'wrongpassword'
    click_button 'Login'

    expect(page).to have_content('Invalid credentials')
    expect(page).to have_current_path(login_path)
  end
end
```

### Custom Matchers

```ruby
# spec/support/matchers/custom_matchers.rb
RSpec::Matchers.define :be_a_valid_email do
  match do |actual|
    actual.match?(/\A[\w+\-.]+@[a-z\d\-]+(\.[a-z\d\-]+)*\.[a-z]+\z/i)
  end

  failure_message do |actual|
    "expected '#{actual}' to be a valid email address"
  end
end

RSpec::Matchers.define :have_json_body do |expected|
  match do |response|
    body = JSON.parse(response.body, symbolize_names: true)
    expected.all? { |k, v| body[k] == v }
  end

  failure_message do |response|
    body = JSON.parse(response.body, symbolize_names: true)
    "expected response body #{body} to include #{expected}"
  end
end

# Usage
RSpec.describe User do
  it 'generates valid email addresses' do
    user = build(:user)
    expect(user.email).to be_a_valid_email
  end
end
```

### Factory Bot Integration

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    name { Faker::Name.name }
    email { Faker::Internet.unique.email }
    password { 'SecurePass123' }
    role { :user }

    trait :admin do
      role { :admin }
      name { "Admin #{Faker::Name.first_name}" }
    end

    trait :with_orders do
      after(:create) do |user|
        create_list(:order, 3, user: user)
      end
    end

    trait :inactive do
      active { false }
      deactivated_at { 1.day.ago }
    end
  end
end

# Usage in specs
let(:user) { create(:user) }
let(:admin) { create(:user, :admin) }
let(:user_with_orders) { create(:user, :with_orders) }
```

### RSpec Configuration

```ruby
# .rspec
--require spec_helper
--format documentation
--color
--order random

# spec/spec_helper.rb
RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
    expectations.syntax = :expect
  end

  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
    mocks.verify_doubled_constant_names = true
  end

  config.shared_context_metadata_behavior = :apply_to_host_groups
  config.filter_run_when_matching :focus
  config.example_status_persistence_file_path = 'spec/examples.txt'
  config.disable_monkey_patching!
  config.order = :random
  Kernel.srand config.seed
end
```

### CI/CD Integration (GitHub Actions)

```yaml
name: RSpec Tests
on: [push, pull_request]

jobs:
  rspec:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true
      - name: Setup database
        run: bundle exec rails db:create db:schema:load
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
          RAILS_ENV: test
      - name: Run RSpec
        run: bundle exec rspec --format documentation --format RspecJunitFormatter --out reports/rspec.xml
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
          RAILS_ENV: test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: rspec-results
          path: reports/
```

## Best Practices

1. **Use `let` instead of instance variables** — `let` is lazy, memoized, and clearly scoped. Instance variables in `before` blocks are harder to track.
2. **Organize with `describe` and `context`** — `describe` groups by method/feature, `context` groups by scenario (always prefix with "when/with/without").
3. **Use `subject` for the thing being tested** — Named subjects like `subject(:result) { service.call(params) }` improve readability.
4. **Use `instance_double` for type-safe mocks** — `instance_double(ClassName)` verifies that stubbed methods exist on the real class.
5. **Use FactoryBot for test data** — Factories with traits produce flexible, readable test data. Avoid fixtures for complex data.
6. **Use shared examples for common behaviors** — Extract repeated test patterns into shared examples (validations, timestamps, authorization).
7. **Use `aggregate_failures`** for multiple assertions on the same result when grouping makes the test clearer.
8. **Run tests in random order** — Use `--order random` to catch order-dependent tests early.
9. **Keep spec files mirroring source files** — `app/models/user.rb` should have `spec/models/user_spec.rb` for easy navigation.
10. **Use `--format documentation`** for readable output that doubles as a specification document.

## Anti-Patterns to Avoid

1. **Avoid instance variables in hooks** — Use `let` blocks instead of `@variable` in `before` blocks. Instance variables are harder to trace and debug.
2. **Avoid `should` syntax** — Always use `expect().to`. The `should` syntax is deprecated and causes issues with `BasicObject`.
3. **Avoid testing private methods** — Test the public interface. If a private method needs testing, the class may have too many responsibilities.
4. **Avoid `allow_any_instance_of`** — It indicates a design problem. Inject dependencies and mock the injected object instead.
5. **Avoid `before(:all)` for data setup** — `before(:all)` creates data once for all examples, causing shared state. Use `before(:each)` or `let`.
6. **Avoid complex conditionals in tests** — Tests should be linear. If you need `if/else` in a test, use separate `context` blocks.
7. **Avoid mystery guests** — Make test data creation explicit in each example or `let` block. Do not rely on hidden setup in shared contexts.
8. **Avoid slow tests in the unit suite** — Mock external services, use `build` instead of `create` when persistence is not needed.
9. **Avoid overusing `described_class`** — It is great for the main subject, but when referencing other classes, use explicit names for clarity.
10. **Avoid giant `before` blocks** — If setup exceeds 10 lines, extract into helper methods or use FactoryBot traits.
