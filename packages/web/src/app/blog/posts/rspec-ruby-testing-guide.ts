import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RSpec Testing in Ruby: Complete Guide for 2026',
  description:
    'Master RSpec testing in Ruby with this complete guide covering describe/context/it, let/before, matchers, mocking with doubles, shared examples, and FactoryBot integration.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
RSpec is the dominant testing framework in the Ruby ecosystem, used by the vast majority of Ruby and Rails applications. Its expressive DSL transforms tests into readable specifications that document system behavior. This complete guide covers everything from basic RSpec structure to advanced patterns like shared examples, custom matchers, and factory-based test data management with FactoryBot.

## Key Takeaways

- RSpec's describe/context/it structure creates human-readable specifications that serve as living documentation for your codebase
- \`let\` and \`let!\` provide lazy and eager memoized helpers that keep test setup clean and avoid unnecessary computation
- RSpec matchers offer a rich vocabulary for assertions, from simple equality checks to complex collection and change matchers
- Doubles (mocks and stubs) isolate the unit under test from its dependencies with clear, intention-revealing syntax
- Shared examples and shared contexts eliminate duplication across spec files for common behavior patterns
- AI coding agents with QA skills from qaskills.sh generate idiomatic RSpec tests following Ruby community conventions

---

## Setting Up RSpec

### Installation

\`\`\`ruby
# Gemfile
group :development, :test do
  gem 'rspec-rails', '~> 7.0'    # For Rails projects
  gem 'factory_bot_rails'
  gem 'faker'
  gem 'shoulda-matchers'
  gem 'simplecov', require: false
end

# For non-Rails Ruby projects
group :test do
  gem 'rspec', '~> 3.13'
end
\`\`\`

\`\`\`bash
# Initialize RSpec in a Rails project
rails generate rspec:install

# Initialize in a plain Ruby project
rspec --init
\`\`\`

### Configuration

\`\`\`ruby
# spec/spec_helper.rb
RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
    expectations.syntax = :expect
  end

  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  config.shared_context_metadata_behavior = :apply_to_host_groups
  config.filter_run_when_matching :focus
  config.example_status_persistence_file_path = "spec/examples.txt"
  config.disable_monkey_patching!
  config.order = :random
  Kernel.srand config.seed
end
\`\`\`

\`\`\`ruby
# spec/rails_helper.rb (Rails projects)
require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require_relative '../config/environment'

abort("Running in production!") if Rails.env.production?

require 'rspec/rails'
require 'shoulda/matchers'

Dir[Rails.root.join('spec/support/**/*.rb')].each { |f| require f }

RSpec.configure do |config|
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!

  config.include FactoryBot::Syntax::Methods
end

Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
\`\`\`

---

## Describe, Context, and It

RSpec's core structure uses three blocks to organize tests into a clear hierarchy.

\`\`\`ruby
# spec/models/order_spec.rb
RSpec.describe Order do
  describe '#total' do
    context 'when the order has no items' do
      it 'returns zero' do
        order = Order.new(items: [])
        expect(order.total).to eq(0)
      end
    end

    context 'when the order has items' do
      it 'sums the item prices' do
        items = [
          Item.new(name: 'Widget', price: 9.99, quantity: 2),
          Item.new(name: 'Gadget', price: 24.99, quantity: 1)
        ]
        order = Order.new(items: items)

        expect(order.total).to eq(44.97)
      end
    end

    context 'when a discount is applied' do
      it 'reduces the total by the discount percentage' do
        items = [Item.new(name: 'Widget', price: 100.00, quantity: 1)]
        order = Order.new(items: items, discount: 0.10)

        expect(order.total).to eq(90.00)
      end

      it 'does not allow negative totals' do
        items = [Item.new(name: 'Widget', price: 10.00, quantity: 1)]
        order = Order.new(items: items, discount: 1.50)

        expect(order.total).to eq(0)
      end
    end
  end

  describe '#add_item' do
    it 'increases the item count' do
      order = Order.new
      expect { order.add_item(Item.new(name: 'Widget', price: 9.99)) }
        .to change { order.items.count }.by(1)
    end

    it 'raises an error for nil items' do
      order = Order.new
      expect { order.add_item(nil) }
        .to raise_error(ArgumentError, 'Item cannot be nil')
    end
  end
end
\`\`\`

---

## Let and Before

\`let\` and \`before\` control test setup with different semantics.

### let (Lazy Memoization)

\`\`\`ruby
RSpec.describe UserService do
  # let is lazy - only evaluated when first referenced
  let(:repository) { InMemoryUserRepository.new }
  let(:service) { described_class.new(repository: repository) }
  let(:valid_attributes) do
    { name: 'Alice', email: 'alice@example.com', role: :admin }
  end

  describe '#create_user' do
    it 'creates a user with valid attributes' do
      user = service.create_user(valid_attributes)

      expect(user.name).to eq('Alice')
      expect(user.email).to eq('alice@example.com')
      expect(user.role).to eq(:admin)
    end

    it 'assigns a unique ID' do
      user = service.create_user(valid_attributes)
      expect(user.id).to be_a(String)
      expect(user.id).not_to be_empty
    end
  end
end
\`\`\`

### let! (Eager Evaluation)

\`\`\`ruby
RSpec.describe Post do
  # let! is evaluated before each example, regardless of usage
  let!(:author) { create(:user, name: 'Alice') }
  let!(:published_post) { create(:post, author: author, status: :published) }
  let!(:draft_post) { create(:post, author: author, status: :draft) }

  describe '.published' do
    it 'returns only published posts' do
      expect(Post.published).to contain_exactly(published_post)
    end

    it 'excludes draft posts' do
      expect(Post.published).not_to include(draft_post)
    end
  end
end
\`\`\`

### before Hooks

\`\`\`ruby
RSpec.describe ShoppingCart do
  let(:cart) { ShoppingCart.new }

  before(:all) do
    # Runs once before all examples in this group
    # Use sparingly - shared state between tests
    DatabaseCleaner.strategy = :transaction
  end

  before(:each) do
    # Runs before each example (default)
    cart.clear
  end

  after(:each) do
    # Runs after each example
  end

  # before with context
  context 'with a promotional code applied' do
    before do
      cart.apply_promo('SAVE20')
    end

    it 'applies the discount' do
      cart.add_item(product, quantity: 1)
      expect(cart.discount_percentage).to eq(20)
    end
  end
end
\`\`\`

---

## RSpec Matchers

RSpec provides a comprehensive set of matchers for expressive assertions.

### Equality and Identity

\`\`\`ruby
# Value equality
expect(result).to eq(42)
expect(name).to eq('Alice')

# Object identity
expect(singleton).to equal(OtherSingleton.instance)

# Approximate equality
expect(pi).to be_within(0.01).of(3.14)
\`\`\`

### Comparison and Ranges

\`\`\`ruby
expect(score).to be > 90
expect(score).to be >= 90
expect(score).to be < 100
expect(age).to be_between(18, 65).inclusive
\`\`\`

### Type and Class

\`\`\`ruby
expect(user).to be_a(User)
expect(user).to be_an_instance_of(Admin)
expect(items).to be_a(Array)
expect(response).to respond_to(:status)
expect(response).to respond_to(:body).with(0).arguments
\`\`\`

### Collections

\`\`\`ruby
# Inclusion
expect(colors).to include('red')
expect(colors).to include('red', 'blue')
expect(hash).to include(name: 'Alice')

# Exact match (order independent)
expect(results).to contain_exactly('a', 'b', 'c')

# Match with matchers
expect(users).to include(
  an_object_having_attributes(name: 'Alice', active: true)
)

# Array matchers
expect(items).to all(be_a(String))
expect(numbers).to all(be > 0)
expect(list).to start_with('first')
expect(list).to end_with('last')
expect(empty_list).to be_empty
expect(items).to have_attributes(size: 3)
\`\`\`

### Change Matchers

\`\`\`ruby
# Detect state changes
expect { user.activate! }
  .to change { user.active? }.from(false).to(true)

expect { cart.add_item(product) }
  .to change { cart.item_count }.by(1)

expect { order.cancel! }
  .to change { Order.cancelled.count }.by(1)
  .and change { order.status }.to('cancelled')

# Compound expectations
expect { process_payment }
  .to change { account.balance }.by(-100)
  .and change { Transaction.count }.by(1)
\`\`\`

### Error Matchers

\`\`\`ruby
expect { dangerous_operation }
  .to raise_error(RuntimeError)

expect { validate(nil) }
  .to raise_error(ArgumentError, 'cannot be nil')

expect { parse(bad_json) }
  .to raise_error(JSON::ParserError, /unexpected token/)

expect { safe_operation }
  .not_to raise_error
\`\`\`

### Output and Stdout

\`\`\`ruby
expect { puts 'hello' }
  .to output("hello\\n").to_stdout

expect { warn 'danger' }
  .to output(/danger/).to_stderr
\`\`\`

---

## Mocking with Doubles

RSpec doubles provide test isolation by replacing real dependencies with controlled substitutes.

### Basic Doubles

\`\`\`ruby
RSpec.describe NotificationService do
  describe '#notify_user' do
    it 'sends an email via the mailer' do
      mailer = double('Mailer')
      service = NotificationService.new(mailer: mailer)

      expect(mailer).to receive(:send_email)
        .with('alice@test.com', 'Welcome!', anything)

      service.notify_user('alice@test.com', :welcome)
    end

    it 'logs the notification' do
      mailer = double('Mailer', send_email: true)
      logger = double('Logger')
      service = NotificationService.new(mailer: mailer, logger: logger)

      expect(logger).to receive(:info)
        .with(/Notification sent to alice@test.com/)

      service.notify_user('alice@test.com', :welcome)
    end
  end
end
\`\`\`

### Instance Doubles (Verified)

\`\`\`ruby
RSpec.describe OrderProcessor do
  let(:payment_gateway) { instance_double(PaymentGateway) }
  let(:inventory) { instance_double(InventoryService) }
  let(:processor) do
    described_class.new(
      payment_gateway: payment_gateway,
      inventory: inventory
    )
  end

  describe '#process' do
    let(:order) { build(:order, total: 99.99) }

    before do
      allow(inventory).to receive(:reserve_items).and_return(true)
    end

    it 'charges the payment gateway' do
      allow(payment_gateway).to receive(:charge)
        .and_return(PaymentResult.new(success: true, id: 'txn-1'))

      processor.process(order)

      expect(payment_gateway).to have_received(:charge)
        .with(amount: 99.99, currency: 'USD')
    end

    it 'rolls back inventory on payment failure' do
      allow(payment_gateway).to receive(:charge)
        .and_return(PaymentResult.new(success: false))

      processor.process(order)

      expect(inventory).to have_received(:release_items)
        .with(order.items)
    end

    context 'when inventory reservation fails' do
      before do
        allow(inventory).to receive(:reserve_items)
          .and_raise(InsufficientStockError.new('Widget'))
      end

      it 'does not charge payment' do
        expect { processor.process(order) }
          .to raise_error(InsufficientStockError)

        expect(payment_gateway).not_to have_received(:charge)
      end
    end
  end
end
\`\`\`

### Stubbing Return Values

\`\`\`ruby
# Return a single value
allow(service).to receive(:fetch).and_return(result)

# Return different values on successive calls
allow(api).to receive(:request)
  .and_return(nil, nil, response)

# Yield to a block
allow(file_reader).to receive(:open).and_yield(mock_file)

# Raise an error
allow(api).to receive(:connect).and_raise(ConnectionError)

# Call the original implementation
allow(service).to receive(:process).and_call_original

# Return based on arguments
allow(calculator).to receive(:tax) do |amount|
  amount * 0.08
end
\`\`\`

---

## Shared Examples and Shared Contexts

### Shared Examples

\`\`\`ruby
# spec/support/shared_examples/soft_deletable.rb
RSpec.shared_examples 'a soft-deletable model' do
  describe '#soft_delete!' do
    it 'sets deleted_at timestamp' do
      expect { subject.soft_delete! }
        .to change { subject.deleted_at }.from(nil)
    end

    it 'does not remove the record from the database' do
      subject.soft_delete!
      expect(described_class.unscoped.find(subject.id)).to be_present
    end

    it 'excludes from default scope' do
      subject.soft_delete!
      expect(described_class.all).not_to include(subject)
    end
  end

  describe '#restore!' do
    before { subject.soft_delete! }

    it 'clears deleted_at' do
      expect { subject.restore! }
        .to change { subject.deleted_at }.to(nil)
    end

    it 'includes in default scope again' do
      subject.restore!
      expect(described_class.all).to include(subject)
    end
  end
end

# Usage in model specs
RSpec.describe User do
  subject { create(:user) }
  it_behaves_like 'a soft-deletable model'
end

RSpec.describe Post do
  subject { create(:post) }
  it_behaves_like 'a soft-deletable model'
end

RSpec.describe Comment do
  subject { create(:comment) }
  it_behaves_like 'a soft-deletable model'
end
\`\`\`

### Shared Examples with Parameters

\`\`\`ruby
RSpec.shared_examples 'a paginated API endpoint' do |path|
  it 'returns paginated results' do
    get path, params: { page: 1, per_page: 10 }

    expect(response).to have_http_status(:ok)
    json = JSON.parse(response.body)
    expect(json['data'].length).to be <= 10
    expect(json['meta']).to include('total', 'page', 'per_page')
  end

  it 'returns 400 for invalid page number' do
    get path, params: { page: -1 }

    expect(response).to have_http_status(:bad_request)
  end
end

RSpec.describe 'API Endpoints' do
  it_behaves_like 'a paginated API endpoint', '/api/users'
  it_behaves_like 'a paginated API endpoint', '/api/orders'
  it_behaves_like 'a paginated API endpoint', '/api/products'
end
\`\`\`

### Shared Contexts

\`\`\`ruby
# spec/support/shared_contexts/authenticated_user.rb
RSpec.shared_context 'with authenticated admin' do
  let(:admin_user) { create(:user, role: :admin) }

  before do
    sign_in admin_user
  end
end

RSpec.shared_context 'with test database' do
  before(:all) do
    DatabaseCleaner.strategy = :transaction
    DatabaseCleaner.start
  end

  after(:all) do
    DatabaseCleaner.clean
  end
end

# Usage
RSpec.describe Admin::UsersController do
  include_context 'with authenticated admin'

  describe 'GET #index' do
    it 'returns all users' do
      create_list(:user, 5)
      get :index

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).length).to eq(6) # 5 + admin
    end
  end
end
\`\`\`

---

## FactoryBot Integration

FactoryBot replaces fixtures with flexible, composable factory definitions for test data.

\`\`\`ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    name { Faker::Name.name }
    email { Faker::Internet.unique.email }
    password { 'SecurePass123!' }
    role { :user }
    active { true }
    created_at { Time.current }

    trait :admin do
      role { :admin }
    end

    trait :inactive do
      active { false }
    end

    trait :with_avatar do
      after(:create) do |user|
        user.avatar.attach(
          io: File.open(Rails.root.join('spec/fixtures/avatar.png')),
          filename: 'avatar.png'
        )
      end
    end

    trait :with_posts do
      transient do
        posts_count { 3 }
      end

      after(:create) do |user, evaluator|
        create_list(:post, evaluator.posts_count, author: user)
      end
    end

    factory :admin_user, traits: [:admin]
  end
end

# spec/factories/posts.rb
FactoryBot.define do
  factory :post do
    title { Faker::Lorem.sentence }
    body { Faker::Lorem.paragraphs(number: 3).join("\\n\\n") }
    status { :draft }
    association :author, factory: :user

    trait :published do
      status { :published }
      published_at { Time.current }
    end

    trait :with_comments do
      transient do
        comments_count { 5 }
      end

      after(:create) do |post, evaluator|
        create_list(:comment, evaluator.comments_count, post: post)
      end
    end
  end
end
\`\`\`

### Using Factories in Tests

\`\`\`ruby
RSpec.describe PostsController do
  let(:user) { create(:user) }

  describe 'GET #index' do
    it 'returns published posts' do
      published = create_list(:post, 3, :published)
      create_list(:post, 2) # drafts

      get :index

      expect(assigns(:posts)).to match_array(published)
    end
  end

  describe 'POST #create' do
    let(:valid_params) do
      { post: attributes_for(:post, author_id: user.id) }
    end

    it 'creates a new post' do
      sign_in user

      expect { post :create, params: valid_params }
        .to change(Post, :count).by(1)
    end
  end
end
\`\`\`

---

## Running RSpec

\`\`\`bash
# Run all specs
bundle exec rspec

# Run specific file
bundle exec rspec spec/models/user_spec.rb

# Run specific example by line number
bundle exec rspec spec/models/user_spec.rb:42

# Run by tag
bundle exec rspec --tag smoke
bundle exec rspec --tag ~slow  # exclude slow tests

# Run with documentation format
bundle exec rspec --format documentation

# Run only failures from last run
bundle exec rspec --only-failures

# Run with seed for reproducible ordering
bundle exec rspec --seed 12345

# Profile slowest examples
bundle exec rspec --profile 10
\`\`\`

---

## Integrating QA Skills for RSpec

Accelerate your RSpec test creation with AI-powered QA skills:

\`\`\`bash
npx @qaskills/cli add rspec-testing
\`\`\`

This skill teaches your AI coding agent to generate idiomatic RSpec tests with proper describe/context/it structure, let-based setup, appropriate matchers, and FactoryBot integration.

---

## 10 Best Practices for RSpec

1. **Use \`describe\` for methods, \`context\` for conditions.** \`describe '#method_name'\` groups tests for a method. \`context 'when condition'\` describes the scenario.

2. **Prefer \`let\` over instance variables.** \`let\` is lazily evaluated, memoized per example, and automatically cleaned up. Instance variables in before blocks are less explicit.

3. **Use \`subject\` for the thing being tested.** When testing a single object, name it with \`subject\` to make the intention clear and enable one-liner syntax.

4. **Write one expectation per example.** Each \`it\` block should verify one behavior. Multiple unrelated expectations in one example obscure which behavior failed.

5. **Use FactoryBot traits for variations.** \`create(:user, :admin, :with_posts)\` is more readable than setting individual attributes.

6. **Prefer \`instance_double\` over \`double\`.** Verified doubles catch method signature mismatches at test time, preventing false confidence from tests that mock nonexistent methods.

7. **Keep shared examples focused.** A shared example should test exactly one concern. Do not create "God" shared examples that test everything about a module.

8. **Run with \`--order random\` always.** Random ordering exposes hidden dependencies between tests. Fix failures from random ordering immediately.

9. **Use \`aggregate_failures\` for multi-assertion examples.** When you intentionally have multiple expectations, wrap them in \`aggregate_failures\` to see all failures at once.

10. **Profile regularly with \`--profile\`.** Identify slow specs and optimize them. Slow test suites discourage running tests frequently.

---

## 8 Anti-Patterns to Avoid

1. **Using \`before\` for everything.** Not all setup belongs in \`before\` blocks. Use \`let\` for data, \`before\` for side effects (like signing in or setting environment state).

2. **Testing private methods directly.** Use \`send\` to call private methods in tests is a code smell. Test behavior through the public interface.

3. **Mystery guest.** Tests that rely on data created elsewhere (fixtures, other test files) are impossible to understand in isolation. Each test should make its setup explicit.

4. **Excessive mocking.** If you are mocking more than 2-3 dependencies, the class under test likely violates the Single Responsibility Principle.

5. **Using \`allow_any_instance_of\`.** This creates brittle tests tied to implementation details. Inject dependencies explicitly and mock the injected instance.

6. **Nested contexts deeper than three levels.** Deeply nested contexts make tests hard to follow. If you need more nesting, the class under test may be too complex.

7. **Not using \`freeze_time\` for time-dependent tests.** Tests that depend on \`Time.current\` are flaky. Use \`travel_to\` or \`freeze_time\` to control the clock.

8. **Ignoring \`--only-failures\`.** RSpec tracks which tests failed last run. Using \`--only-failures\` during debugging saves enormous time by skipping passing tests.

---

## Conclusion

RSpec provides the most expressive testing DSL in any programming language. Its describe/context/it structure creates tests that read like specifications, making them valuable as documentation. Combined with FactoryBot for test data, shoulda-matchers for Rails validations, and the powerful mocking system, RSpec gives Ruby developers everything needed for comprehensive test coverage. Leverage QA skills from qaskills.sh to help your AI coding agents generate RSpec tests that follow Ruby community conventions and the patterns outlined in this guide.
`,
};
