---
name: Capybara Testing
description: Expert-level Capybara acceptance testing skill for Ruby and Rails applications. Covers RSpec integration, DSL methods, scoping, Page Objects with SitePrism, JavaScript interactions, and database cleaning strategies.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [capybara, ruby, rails, acceptance-testing, rspec, feature-tests, browser-testing]
testingTypes: [e2e, acceptance, integration]
frameworks: [capybara, rspec, siteprism]
languages: [ruby]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Capybara Testing Skill

You are an expert QA automation engineer specializing in Capybara acceptance testing for Ruby and Rails applications. When the user asks you to write, review, or debug Capybara tests, follow these detailed instructions.

## Core Principles

1. **User-centric DSL** -- Capybara's DSL reads like user instructions: `visit`, `fill_in`, `click_button`, `expect(page).to have_content`. Write tests as stories.
2. **Smart waiting** -- Capybara has built-in waiting for dynamic content. Never use `sleep`. Use `have_content`, `have_selector` matchers that auto-retry.
3. **Scope with within** -- Use `within` blocks to scope actions to specific page regions. This prevents ambiguous matches and makes tests resilient.
4. **Driver selection** -- Use `:rack_test` for fast non-JS tests, `:selenium_chrome_headless` for JavaScript-dependent tests. Tag JS tests explicitly.
5. **Test isolation** -- Each spec must be independent. Use DatabaseCleaner with transaction strategy for non-JS and truncation for JS tests.

## Project Structure

Always organize Capybara projects with this structure:

```
spec/
  features/
    auth/
      login_spec.rb
      signup_spec.rb
    dashboard/
      dashboard_spec.rb
    checkout/
      cart_spec.rb
      payment_spec.rb
  pages/
    login_page.rb
    dashboard_page.rb
    base_page.rb
  support/
    capybara.rb
    database_cleaner.rb
    helpers/
      auth_helper.rb
      wait_helper.rb
  factories/
    users.rb
    products.rb
spec_helper.rb
rails_helper.rb
Gemfile
```

## Setup

### Gemfile

```ruby
group :test do
  gem 'capybara', '~> 3.40'
  gem 'selenium-webdriver', '~> 4.18'
  gem 'rspec-rails', '~> 6.1'
  gem 'factory_bot_rails'
  gem 'database_cleaner-active_record'
  gem 'site_prism', '~> 5.0'
end
```

### Capybara Configuration (spec/support/capybara.rb)

```ruby
require 'capybara/rspec'

Capybara.configure do |config|
  config.default_driver = :rack_test
  config.javascript_driver = :selenium_chrome_headless
  config.default_max_wait_time = 10
  config.app_host = 'http://localhost:3000'
  config.server_host = 'localhost'
  config.server_port = 3001
  config.default_normalize_ws = true
end

Capybara.register_driver :selenium_chrome_headless do |app|
  options = Selenium::WebDriver::Chrome::Options.new
  options.add_argument('--headless=new')
  options.add_argument('--no-sandbox')
  options.add_argument('--disable-gpu')
  options.add_argument('--window-size=1920,1080')

  Capybara::Selenium::Driver.new(app, browser: :chrome, options: options)
end
```

### DatabaseCleaner Configuration

```ruby
require 'database_cleaner/active_record'

RSpec.configure do |config|
  config.before(:suite) do
    DatabaseCleaner.strategy = :transaction
    DatabaseCleaner.clean_with(:truncation)
  end

  config.around(:each) do |example|
    DatabaseCleaner.cleaning do
      example.run
    end
  end

  config.around(:each, js: true) do |example|
    DatabaseCleaner.strategy = :truncation
    DatabaseCleaner.cleaning do
      example.run
    end
    DatabaseCleaner.strategy = :transaction
  end
end
```

## Feature Spec Patterns

### Login Test

```ruby
require 'rails_helper'

RSpec.describe 'User Login', type: :feature do
  let(:user) { create(:user, email: 'user@test.com', password: 'password123') }

  before { visit login_path }

  it 'logs in with valid credentials' do
    fill_in 'Email', with: user.email
    fill_in 'Password', with: 'password123'
    click_button 'Log in'

    expect(page).to have_content('Welcome')
    expect(page).to have_current_path(dashboard_path)
  end

  it 'shows error for invalid credentials' do
    fill_in 'Email', with: 'wrong@test.com'
    fill_in 'Password', with: 'wrong'
    click_button 'Log in'

    expect(page).to have_content('Invalid credentials')
    expect(page).to have_current_path(login_path)
  end

  it 'requires all fields' do
    click_button 'Log in'
    expect(page).to have_content("can't be blank")
  end
end
```

### JavaScript Interactions

```ruby
RSpec.describe 'Dashboard', type: :feature, js: true do
  let(:user) { create(:user) }

  before do
    sign_in(user)
    visit dashboard_path
  end

  it 'opens modal when clicking add button' do
    click_button 'Add Item'
    expect(page).to have_selector('.modal', visible: true)
    expect(page).to have_content('Create New Item')
  end

  it 'filters results with search' do
    fill_in 'Search', with: 'Widget'
    expect(page).to have_selector('.result-item', count: 3)
    expect(page).to have_content('Widget A')
  end

  it 'handles infinite scroll' do
    expect(page).to have_selector('.item', count: 20)
    page.execute_script('window.scrollTo(0, document.body.scrollHeight)')
    expect(page).to have_selector('.item', count: 40, wait: 10)
  end
end
```

## DSL Reference

```ruby
# Navigation
visit '/path'
visit users_path
go_back
go_forward

# Forms
fill_in 'Label or Name', with: 'text'
fill_in 'input#email', with: 'user@test.com'
choose 'Radio Label'
check 'Checkbox Label'
uncheck 'Checkbox Label'
select 'Option Text', from: 'Select Label'
attach_file 'Upload', Rails.root.join('spec/fixtures/test.pdf')
click_button 'Submit'
click_link 'More Info'
click_on 'Button or Link'

# Finding elements
find('#id')
find('.class')
find('[data-testid="x"]')
find(:xpath, '//div')
all('.items')
first('.item')

# Scoping
within('#login-form') { fill_in 'Email', with: 'user@test.com' }
within_table('users') { expect(page).to have_content('Alice') }
within_fieldset('Address') { fill_in 'Street', with: '123 Main' }
within_frame('iframe-name') { click_button 'Submit' }

# Matchers
expect(page).to have_content('text')
expect(page).to have_no_content('error')
expect(page).to have_selector('#element')
expect(page).to have_css('.class')
expect(page).to have_xpath('//div')
expect(page).to have_button('Submit')
expect(page).to have_field('Email')
expect(page).to have_link('Click Here')
expect(page).to have_current_path('/expected')
expect(page).to have_title('Page Title')
expect(page).to have_select('Role', selected: 'Admin')
expect(page).to have_checked_field('Remember me')

# Element assertions
expect(find('#name').value).to eq('Alice')
expect(all('.item').count).to eq(5)
expect(find('.status')).to have_text('Active')
```

## Page Objects with SitePrism

### Base Page

```ruby
require 'site_prism'

class BasePage < SitePrism::Page
  element :flash_message, '.flash-message'
  element :loading_spinner, '.spinner'

  def wait_for_page_load
    has_no_loading_spinner?(wait: 15)
  end

  def flash_text
    flash_message.text
  end
end
```

### Login Page

```ruby
class LoginPage < BasePage
  set_url '/login'
  set_url_matcher %r{/login}

  element :email_field, '#email'
  element :password_field, '#password'
  element :submit_button, 'button[type="submit"]'
  element :error_message, '.error-message'
  element :forgot_password_link, 'a[href="/forgot-password"]'

  def login_as(email, password)
    email_field.set(email)
    password_field.set(password)
    submit_button.click
  end

  def has_error?(message)
    has_error_message?(wait: 5) && error_message.text.include?(message)
  end
end
```

### Dashboard Page

```ruby
class DashboardPage < BasePage
  set_url '/dashboard'
  set_url_matcher %r{/dashboard}

  element :welcome_message, '.welcome-message'
  elements :items, '.dashboard-item'
  section :sidebar, SidebarSection, '.sidebar'

  def item_count
    items.count
  end

  def welcome_text
    welcome_message.text
  end
end
```

### Test Using Page Objects

```ruby
RSpec.describe 'Login', type: :feature do
  let(:login_page) { LoginPage.new }
  let(:dashboard_page) { DashboardPage.new }
  let(:user) { create(:user, email: 'user@test.com', password: 'password123') }

  it 'logs in successfully' do
    login_page.load
    login_page.login_as(user.email, 'password123')

    expect(dashboard_page).to be_displayed
    expect(dashboard_page.welcome_text).to include('Welcome')
  end

  it 'shows error for bad credentials' do
    login_page.load
    login_page.login_as('bad@test.com', 'wrong')

    expect(login_page).to be_displayed
    expect(login_page).to have_error('Invalid credentials')
  end
end
```

## Test Helpers

```ruby
# spec/support/helpers/auth_helper.rb
module AuthHelper
  def sign_in(user)
    visit login_path
    fill_in 'Email', with: user.email
    fill_in 'Password', with: user.password
    click_button 'Log in'
    expect(page).to have_content('Welcome')
  end

  def sign_out
    click_link 'Logout'
    expect(page).to have_current_path(root_path)
  end
end

RSpec.configure do |config|
  config.include AuthHelper, type: :feature
end
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Capybara Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
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
      - name: Run feature specs
        run: bundle exec rspec spec/features --format documentation
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: capybara-screenshots
          path: tmp/capybara/
```

## Best Practices

1. **Use meaningful labels over CSS selectors** -- Prefer `fill_in 'Email'` over `fill_in '#user_email'`. Label-based selectors survive refactors and match accessibility.
2. **Tag JavaScript tests explicitly** -- Mark JS-dependent tests with `js: true` so Capybara uses the selenium driver only when needed, keeping the suite fast.
3. **Scope actions with within** -- Always use `within('.form')` blocks when a page has multiple similar elements. This eliminates ambiguous match errors.
4. **Use factories over fixtures** -- FactoryBot creates test data dynamically with traits. Fixtures are static and create hidden dependencies between tests.
5. **DatabaseCleaner strategy per driver** -- Use `:transaction` for rack_test (fast) and `:truncation` for selenium (required because separate thread).
6. **Extract helpers for common flows** -- Login, navigation, and verification helpers in `spec/support/helpers/` reduce duplication without sacrificing readability.
7. **Wait implicitly, not explicitly** -- Capybara matchers like `have_content` already retry. Set `default_max_wait_time` appropriately instead of adding `sleep`.
8. **Use SitePrism for Page Objects** -- SitePrism provides `element`, `elements`, `section`, and `set_url` declarations that integrate naturally with Capybara.
9. **Save screenshots on failure** -- Configure `Capybara::Screenshot` to capture screenshots on failure for CI debugging: `gem 'capybara-screenshot'`.
10. **Keep feature specs high-level** -- Feature specs test user journeys, not implementation details. One feature spec should cover a complete workflow.

## Anti-Patterns

1. **Using sleep for synchronization** -- `sleep 3` wastes time and is unreliable. Capybara matchers auto-wait. If content is slow, increase `default_max_wait_time`.
2. **CSS selectors for form fields** -- `fill_in '#user_email_field_v2'` breaks on refactors. Use `fill_in 'Email'` which finds by label text.
3. **Tests depending on database order** -- Relying on `User.first` being a specific record. Use factories and reference created objects directly.
4. **Testing implementation details** -- Asserting on CSS classes, internal IDs, or DOM structure instead of visible content the user sees.
5. **Monolithic feature specs** -- A single spec with 20 `it` blocks and complex `before` hooks. Split into focused files by feature area.
6. **Ignoring the within scope** -- Actions without `within` on complex pages cause `Capybara::Ambiguous` errors and make tests fragile.
7. **Direct database manipulation in feature specs** -- Using `User.create!` instead of factories. This couples tests to ActiveRecord internals.
8. **Not configuring DatabaseCleaner** -- Without proper cleanup, tests leak data and become order-dependent, causing intermittent failures.
9. **Overusing execute_script** -- JavaScript execution bypasses Capybara's built-in interactions. Only use it for actions Capybara cannot perform (scrolling, drag-drop workarounds).
10. **Sharing state between examples** -- Using `before(:all)` with mutable data or instance variables that persist across tests causes hidden coupling.

## Run Commands

```bash
# Run all feature specs
bundle exec rspec spec/features

# Run specific file
bundle exec rspec spec/features/auth/login_spec.rb

# Run specific example
bundle exec rspec spec/features/auth/login_spec.rb:15

# Run with tags
bundle exec rspec --tag js
bundle exec rspec --tag ~js        # exclude JS tests
bundle exec rspec --tag smoke

# Run with format options
bundle exec rspec spec/features --format documentation
bundle exec rspec spec/features --format html --out report.html
```
