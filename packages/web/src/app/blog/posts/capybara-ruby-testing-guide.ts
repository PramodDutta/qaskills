import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Capybara Testing in Ruby: Complete Integration Guide',
  description:
    'Master Capybara testing in Ruby with its DSL, visit/fill_in/click methods, finders, matchers, Selenium and Cuprite drivers, RSpec integration, and async handling.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
## Introduction to Capybara

Capybara is a Ruby library for integration testing web applications. It simulates how a real user interacts with your app by providing an expressive DSL for navigating pages, filling in forms, clicking buttons, and verifying content. Originally created by Jonas Nicklas, Capybara has become the standard tool for acceptance testing in the Ruby ecosystem, particularly with Rails applications.

What makes Capybara stand out is its driver-agnostic architecture. The same test code works across multiple drivers: a fast headless driver for quick feedback, Selenium for cross-browser testing, or modern alternatives like Cuprite for Chrome DevTools Protocol integration. Capybara also handles asynchronous JavaScript gracefully through its built-in waiting mechanism, which automatically retries assertions until they pass or a timeout is reached.

This guide covers everything from Capybara basics through advanced patterns, including driver configuration, RSpec integration, and strategies for handling dynamic content.

---

## Setting Up Capybara

### Installation

Add Capybara to your Gemfile:

\`\`\`ruby
# Gemfile
group :test do
  gem 'capybara'
  gem 'rspec-rails'
  gem 'selenium-webdriver'
  gem 'cuprite'  # modern headless Chrome driver
end
\`\`\`

\`\`\`bash
bundle install
\`\`\`

### Basic Configuration

Configure Capybara in your spec helper:

\`\`\`ruby
# spec/support/capybara.rb
require 'capybara/rspec'
require 'capybara/cuprite'

Capybara.configure do |config|
  config.default_driver = :cuprite
  config.javascript_driver = :cuprite
  config.app_host = 'http://localhost:3000'
  config.default_max_wait_time = 5
  config.default_normalize_ws = true
  config.save_path = 'tmp/capybara'
  config.automatic_label_click = true
end

Capybara.register_driver :cuprite do |app|
  Capybara::Cuprite::Driver.new(
    app,
    window_size: [1440, 900],
    browser_options: {
      'no-sandbox': nil,
      'disable-gpu': nil,
    },
    process_timeout: 15,
    inspector: true,
    headless: !ENV['HEADLESS'].nil?
  )
end

Capybara.register_driver :selenium_chrome do |app|
  options = Selenium::WebDriver::Chrome::Options.new
  options.add_argument('--headless=new')
  options.add_argument('--window-size=1440,900')
  options.add_argument('--no-sandbox')

  Capybara::Selenium::Driver.new(
    app,
    browser: :chrome,
    options: options
  )
end
\`\`\`

### Rails Integration

For Rails applications, configure the test server:

\`\`\`ruby
# spec/rails_helper.rb
require 'capybara/rails'

RSpec.configure do |config|
  config.before(:each, type: :system) do
    driven_by :cuprite
  end
end
\`\`\`

---

## The Capybara DSL

### Navigation

\`\`\`ruby
# Visit a URL
visit '/login'
visit root_path
visit user_profile_path(user)

# Relative to app_host
visit '/products?category=electronics'
\`\`\`

### Interacting with Forms

\`\`\`ruby
# Fill in text fields (by label, name, or id)
fill_in 'Email', with: 'alice@example.com'
fill_in 'user[password]', with: 'SecurePass123!'
fill_in 'search-input', with: 'mechanical keyboard'

# Select from dropdowns
select 'California', from: 'State'
select 'Express Shipping', from: 'shipping_method'

# Check and uncheck boxes
check 'I agree to the terms'
uncheck 'Subscribe to newsletter'

# Choose radio buttons
choose 'Credit Card'
choose 'payment_method_paypal'

# Attach files
attach_file 'Avatar', '/path/to/avatar.png'
attach_file 'Documents', ['/path/to/doc1.pdf', '/path/to/doc2.pdf']

# Submit forms
click_button 'Sign In'
click_button 'Submit Order'
\`\`\`

### Clicking Elements

\`\`\`ruby
# Click links
click_link 'View Profile'
click_link 'Sign Out'

# Click buttons
click_button 'Add to Cart'
click_button 'Confirm'

# Click either links or buttons
click_on 'Continue'
click_on 'Next Step'
\`\`\`

### Working with Scopes

Scope actions and assertions to specific parts of the page:

\`\`\`ruby
# Within a specific section
within '#shopping-cart' do
  expect(page).to have_content 'Wireless Mouse'
  click_button 'Remove'
end

# Within a form
within_form 'checkout-form' do
  fill_in 'Card Number', with: '4111111111111111'
  click_button 'Pay Now'
end

# Within a table row
within(:xpath, "//tr[contains(., 'Alice')]") do
  click_link 'Edit'
end

# Within a fieldset
within_fieldset 'Shipping Address' do
  fill_in 'Street', with: '123 Main St'
  fill_in 'City', with: 'Springfield'
end
\`\`\`

---

## Finders

Capybara provides multiple ways to locate elements on the page.

### Basic Finders

\`\`\`ruby
# Find by CSS selector
find('#user-menu')
find('.product-card', text: 'Wireless Mouse')
find('[data-testid="checkout-button"]')

# Find by XPath
find(:xpath, '//div[@class="alert"]')

# Find links and buttons
find_link('View Details')
find_button('Submit')
find_field('Email')

# Find with additional filters
find('.product', text: 'Mouse', visible: true)
find('input', id: 'email', disabled: false)
\`\`\`

### Finding Multiple Elements

\`\`\`ruby
# Return all matching elements
all('.product-card')
all('tr.order-row')

# Iterate over found elements
all('.product-card').each do |card|
  name = card.find('.product-name').text
  price = card.find('.product-price').text
  puts "Product: #{name} - Price: #{price}"
end

# Count elements
all('.notification').count

# Access specific elements
all('.step')[2].click  # click the third step
all('.product-card').first
all('.product-card').last
\`\`\`

### Advanced Finding

\`\`\`ruby
# Find with exact text matching
find('h1', exact_text: 'Order Confirmation')

# Find ancestors and siblings
find('.error-message').ancestor('.form-group')
find('#current-item').sibling('.next-item')

# Find within found elements
card = find('.product-card', text: 'Mouse')
card.find('.add-to-cart').click
price = card.find('.price').text
\`\`\`

---

## Matchers and Assertions

Capybara matchers integrate with RSpec to provide expressive assertions that automatically wait for conditions to be met.

### Content Matchers

\`\`\`ruby
# Text content
expect(page).to have_content 'Welcome, Alice'
expect(page).to have_text 'Order confirmed'
expect(page).not_to have_content 'Error'

# Exact text matching
expect(page).to have_text('Total: \$29.99', exact: true)

# Case-insensitive matching
expect(page).to have_text(/welcome/i)
\`\`\`

### Element Matchers

\`\`\`ruby
# CSS selectors
expect(page).to have_css('.success-banner')
expect(page).to have_css('.product-card', count: 5)
expect(page).to have_css('.product-card', minimum: 1)
expect(page).to have_css('.product-card', maximum: 10)
expect(page).to have_css('.product-card', between: 1..10)

# XPath
expect(page).to have_xpath('//table/tbody/tr')

# Specific element types
expect(page).to have_link('View Profile')
expect(page).to have_link('Dashboard', href: '/dashboard')
expect(page).to have_button('Submit', disabled: false)
expect(page).to have_field('Email', with: 'alice@example.com')
expect(page).to have_field('Password', type: 'password')
expect(page).to have_select('Country', selected: 'United States')
expect(page).to have_checked_field('Remember me')
expect(page).to have_unchecked_field('Newsletter')
\`\`\`

### Page State Matchers

\`\`\`ruby
# Current path
expect(page).to have_current_path('/dashboard')
expect(page).to have_current_path(
  /\\/orders\\/\\d+/
)

# Title
expect(page).to have_title('Dashboard - MyApp')
expect(page).to have_title(/Dashboard/)

# Tables
expect(page).to have_table('orders-table')
expect(page).to have_table(
  'orders-table',
  with_rows: [
    { 'Product' => 'Mouse', 'Qty' => '2' },
    { 'Product' => 'Keyboard', 'Qty' => '1' },
  ]
)
\`\`\`

### Negated Matchers

\`\`\`ruby
# Verify absence (waits for element to disappear)
expect(page).not_to have_content 'Loading...'
expect(page).not_to have_css '.spinner'
expect(page).to have_no_css '.error-message'
expect(page).to have_no_content 'Access denied'
\`\`\`

---

## Drivers: Selenium, Cuprite, and Others

### Cuprite (Recommended for Modern Projects)

Cuprite uses Chrome DevTools Protocol directly, without requiring ChromeDriver. It is fast, reliable, and supports modern Chrome features:

\`\`\`ruby
Capybara.register_driver :cuprite do |app|
  Capybara::Cuprite::Driver.new(
    app,
    window_size: [1440, 900],
    headless: true,
    inspector: true,
    js_errors: true,  # raise on JS errors
    slowmo: ENV['SLOWMO']&.to_f,
    process_timeout: 30,
    timeout: 10,
  )
end
\`\`\`

Cuprite-specific features:

\`\`\`ruby
# Access browser console logs
page.driver.browser.manage.logs.get(:browser)

# Evaluate JavaScript directly
page.driver.evaluate_script('document.title')

# Network interception
page.driver.intercept_request do |request|
  if request.url.include?('/api/analytics')
    request.abort
  else
    request.continue
  end
end

# Set custom headers
page.driver.headers = {
  'Accept-Language' => 'en-US',
  'X-Custom-Header' => 'test-value',
}

# Basic HTTP authentication
page.driver.basic_authorize('username', 'password')
\`\`\`

### Selenium WebDriver

For cross-browser testing, use Selenium:

\`\`\`ruby
Capybara.register_driver :selenium_firefox do |app|
  options = Selenium::WebDriver::Firefox::Options.new
  options.add_argument('-headless')

  Capybara::Selenium::Driver.new(
    app,
    browser: :firefox,
    options: options
  )
end

# Switch drivers per test
RSpec.describe 'Cross-browser tests', type: :system do
  context 'in Chrome' do
    before { driven_by :selenium_chrome }
    it 'works in Chrome' do
      visit '/'
      expect(page).to have_content 'Welcome'
    end
  end

  context 'in Firefox' do
    before { driven_by :selenium_firefox }
    it 'works in Firefox' do
      visit '/'
      expect(page).to have_content 'Welcome'
    end
  end
end
\`\`\`

### Rack Test (Fast, No JavaScript)

For tests that do not need JavaScript, Rack Test is the fastest option:

\`\`\`ruby
Capybara.register_driver :rack_test do |app|
  Capybara::RackTest::Driver.new(app)
end

# Use for simple integration tests
RSpec.describe 'Static pages', type: :feature do
  before { Capybara.current_driver = :rack_test }

  it 'renders the about page' do
    visit '/about'
    expect(page).to have_content 'About Us'
  end
end
\`\`\`

---

## RSpec Integration

### System Specs (Rails 5.1+)

\`\`\`ruby
# spec/system/user_authentication_spec.rb
require 'rails_helper'

RSpec.describe 'User Authentication', type: :system do
  before do
    driven_by :cuprite
  end

  let(:user) do
    User.create!(
      email: 'alice@example.com',
      password: 'SecurePass123!',
      name: 'Alice'
    )
  end

  describe 'login' do
    it 'allows a user to log in with valid credentials' do
      visit new_session_path

      fill_in 'Email', with: user.email
      fill_in 'Password', with: 'SecurePass123!'
      click_button 'Sign In'

      expect(page).to have_current_path(dashboard_path)
      expect(page).to have_content "Welcome, #{user.name}"
    end

    it 'shows an error with invalid credentials' do
      visit new_session_path

      fill_in 'Email', with: user.email
      fill_in 'Password', with: 'wrong-password'
      click_button 'Sign In'

      expect(page).to have_content 'Invalid email or password'
      expect(page).to have_current_path(new_session_path)
    end
  end

  describe 'logout' do
    before do
      login_as(user)  # helper method
      visit dashboard_path
    end

    it 'logs the user out and redirects to login' do
      click_link 'Sign Out'

      expect(page).to have_current_path(new_session_path)
      expect(page).not_to have_content 'Welcome'
    end
  end
end
\`\`\`

### Feature Specs (Non-Rails or Legacy)

\`\`\`ruby
# spec/features/shopping_cart_spec.rb
require 'spec_helper'

RSpec.feature 'Shopping Cart', type: :feature do
  scenario 'adding a product to the cart' do
    visit '/products'

    within('.product-card', text: 'Wireless Mouse') do
      click_button 'Add to Cart'
    end

    visit '/cart'
    expect(page).to have_content 'Wireless Mouse'
    expect(page).to have_content '\$29.99'
    expect(page).to have_css('.cart-item', count: 1)
  end

  scenario 'removing a product from the cart' do
    # Setup: add item first
    visit '/products'
    within('.product-card', text: 'Wireless Mouse') do
      click_button 'Add to Cart'
    end

    visit '/cart'
    within('.cart-item', text: 'Wireless Mouse') do
      click_button 'Remove'
    end

    expect(page).to have_content 'Your cart is empty'
    expect(page).to have_no_css('.cart-item')
  end
end
\`\`\`

### Shared Contexts and Helpers

\`\`\`ruby
# spec/support/authentication_helpers.rb
module AuthenticationHelpers
  def login_as(user)
    visit new_session_path
    fill_in 'Email', with: user.email
    fill_in 'Password', with: user.password
    click_button 'Sign In'
    expect(page).to have_current_path(dashboard_path)
  end

  def logout
    click_link 'Sign Out'
    expect(page).to have_current_path(new_session_path)
  end
end

RSpec.configure do |config|
  config.include AuthenticationHelpers, type: :system
  config.include AuthenticationHelpers, type: :feature
end
\`\`\`

---

## Handling Asynchronous Content

Capybara's built-in waiting mechanism is one of its most important features. When you use matchers like \`have_content\` or finders like \`find\`, Capybara automatically retries until the condition is met or the timeout expires.

### How Waiting Works

\`\`\`ruby
# This will wait up to Capybara.default_max_wait_time
# for the element to appear
expect(page).to have_content 'Order confirmed'

# Find also waits
find('.success-message')

# Custom wait time for specific assertions
expect(page).to have_content('Processing complete',
  wait: 15)

# Explicit wait (use sparingly)
using_wait_time(10) do
  expect(page).to have_css('.loaded')
end
\`\`\`

### Common Async Patterns

\`\`\`ruby
# Wait for loading indicator to disappear
expect(page).to have_no_css('.loading-spinner')

# Wait for AJAX request to complete
click_button 'Save'
expect(page).to have_content 'Saved successfully'

# Wait for page navigation
click_link 'Dashboard'
expect(page).to have_current_path('/dashboard')

# Wait for element count to change
expect(page).to have_css('.notification', count: 3)
\`\`\`

### Dealing with Animations

\`\`\`ruby
# Disable CSS animations in test environment
Capybara.disable_animation = true

# Or in the test setup
before do
  page.execute_script(<<~JS)
    document.body.style.setProperty(
      '--transition-duration', '0s', 'important'
    );
  JS
end
\`\`\`

### JavaScript Execution

\`\`\`ruby
# Execute JavaScript
page.execute_script("window.scrollTo(0, document.body.scrollHeight)")

# Evaluate JavaScript and return result
result = page.evaluate_script("document.title")
count = page.evaluate_script("document.querySelectorAll('.item').length")

# Async script execution
page.evaluate_async_script(<<~JS)
  const callback = arguments[arguments.length - 1];
  fetch('/api/status')
    .then(r => r.json())
    .then(data => callback(data));
JS
\`\`\`

---

## Advanced Patterns

### Page Objects with Capybara

\`\`\`ruby
# spec/support/pages/login_page.rb
class LoginPage
  include Capybara::DSL

  def visit_page
    visit '/login'
    self
  end

  def login(email:, password:)
    fill_in 'Email', with: email
    fill_in 'Password', with: password
    click_button 'Sign In'
  end

  def error_message
    find('.error-message').text
  end

  def logged_in?
    has_css?('.user-menu')
  end
end

# In tests
let(:login_page) { LoginPage.new }

it 'authenticates the user' do
  login_page.visit_page
  login_page.login(
    email: 'alice@example.com',
    password: 'SecurePass123!'
  )
  expect(login_page).to be_logged_in
end
\`\`\`

### Custom Selectors

\`\`\`ruby
# Register custom selectors
Capybara.add_selector(:test_id) do
  css { |id| "[data-testid='#{id}']" }
end

# Usage
find(:test_id, 'checkout-button').click
expect(page).to have_selector(:test_id, 'success-message')
\`\`\`

### Screenshots on Failure

\`\`\`ruby
RSpec.configure do |config|
  config.after(:each, type: :system) do |example|
    if example.exception
      timestamp = Time.now.strftime('%Y%m%d-%H%M%S')
      name = example.description.parameterize
      path = "tmp/screenshots/#{name}-#{timestamp}.png"
      page.save_screenshot(path, full: true)
      puts "Screenshot saved: #{path}"
    end
  end
end
\`\`\`

### Handling Modals and Alerts

\`\`\`ruby
# Accept a JavaScript confirm dialog
accept_confirm do
  click_button 'Delete Account'
end

# Dismiss a confirm dialog
dismiss_confirm do
  click_button 'Delete Account'
end

# Accept an alert
accept_alert do
  click_button 'Trigger Alert'
end

# Accept a prompt and enter text
accept_prompt(with: 'My new name') do
  click_button 'Rename'
end
\`\`\`

### Working with Windows and Frames

\`\`\`ruby
# Switch to a new window
new_window = window_opened_by do
  click_link 'Open in new tab'
end
within_window(new_window) do
  expect(page).to have_content 'New Page Content'
end

# Work within iframes
within_frame('payment-iframe') do
  fill_in 'Card Number', with: '4111111111111111'
  click_button 'Pay'
end

# Frame by index
within_frame(0) do
  expect(page).to have_content 'Frame Content'
end
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: System Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: password
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true

      - name: Setup Chrome
        uses: browser-actions/setup-chrome@v1

      - name: Setup database
        run: |
          bin/rails db:create db:schema:load
        env:
          DATABASE_URL: postgres://postgres:password@localhost/test

      - name: Run system tests
        run: bundle exec rspec spec/system --format documentation
        env:
          DATABASE_URL: postgres://postgres:password@localhost/test
          HEADLESS: 'true'

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: screenshots
          path: tmp/screenshots/
\`\`\`

---

## Debugging Tips

\`\`\`ruby
# Save and open the current page in a browser
save_and_open_page

# Save a screenshot
save_screenshot('debug.png', full: true)

# Print page HTML
puts page.html

# Print current URL
puts current_url

# Print page text (no HTML)
puts page.text

# Use Cuprite's inspector (pauses test, opens DevTools)
page.driver.debug
\`\`\`

---

## Conclusion

Capybara provides an elegant, expressive DSL for integration testing Ruby web applications. Its driver-agnostic architecture means you can switch between fast headless execution and full browser testing without changing your test code. The built-in waiting mechanism handles asynchronous content gracefully, eliminating most timing-related flakiness.

Combined with RSpec's readable syntax, page object patterns for maintainability, and modern drivers like Cuprite for speed and reliability, Capybara remains the gold standard for acceptance testing in the Ruby ecosystem. Whether you are testing a Rails application or any Rack-based web app, Capybara's approach of simulating real user interactions ensures your tests validate what actually matters: that your application works correctly from the user's perspective.
`,
};
