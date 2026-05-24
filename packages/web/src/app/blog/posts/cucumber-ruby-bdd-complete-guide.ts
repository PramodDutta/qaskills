import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cucumber Ruby BDD: Complete Guide 2026',
  description:
    'Complete guide to Cucumber Ruby BDD in 2026. Setup with Rails, feature files, step definitions, Capybara browser integration, hooks, tags, parallel execution, reporting, and CI integration.',
  date: '2026-05-10',
  category: 'BDD',
  content: `
# Cucumber Ruby BDD: Complete Guide 2026

Cucumber's origin story is in Ruby: Aslak Hellesoy released the first Cucumber gem in 2008 as a Ruby-only framework before porting it to other languages. In 2026, Cucumber Ruby remains a vital tool for Ruby on Rails teams who want executable acceptance tests, and the gem continues to be actively maintained. Combined with Capybara for browser automation, RSpec for assertions, and parallel_tests for parallel CI execution, Cucumber Ruby produces some of the most readable BDD suites in any language.

This guide is a complete walkthrough for adopting Cucumber Ruby on a Rails 8 project in 2026. We cover gem installation, project structure, feature files, step definitions, Capybara integration, hooks, tags, parallel execution, Allure reporting, CI integration, and the common gotchas that derail Cucumber Ruby adoption. Every example is current with Cucumber 10.0, Capybara 3.40, and Rails 8.0.

By the end you will have a production-ready BDD setup for a Rails app that scales to hundreds of scenarios with parallel CI, custom reporters, and proper isolation.

## Key Takeaways

- **Cucumber Ruby is the original** -- the most mature implementation of the framework.
- **Rails generators integrate seamlessly** -- \`rails g cucumber:install\` scaffolds everything.
- **Capybara is the standard browser layer** for Cucumber Ruby UI scenarios.
- **parallel_tests handles parallel execution** across multiple processes.
- **RSpec matchers can be used directly** in step definitions.

---

## 1. Installation

In a Rails 8 Gemfile:

\`\`\`ruby
group :test do
  gem 'cucumber-rails', '~> 3.0', require: false
  gem 'capybara', '~> 3.40'
  gem 'selenium-webdriver', '~> 4.20'
  gem 'database_cleaner-active_record'
  gem 'rspec-expectations'
  gem 'parallel_tests'
  gem 'allure-cucumber'
end
\`\`\`

Install and scaffold:

\`\`\`bash
bundle install
rails generate cucumber:install
\`\`\`

This creates:

\`\`\`
features/
  step_definitions/
  support/
    env.rb
    hooks.rb
config/
  cucumber.yml
\`\`\`

## 2. cucumber.yml

\`\`\`yaml
<%
rerun = File.file?('rerun.txt') ? IO.read('rerun.txt') : ''
rerun_opts = rerun.to_s.strip.empty? ? '--tags ~@wip' : "--format rerun --out rerun.txt #{rerun}"
std_opts = "--format pretty --strict --tags 'not @wip'"
%>
default: <%= std_opts %> features
wip: --tags @wip:3 --wip features
rerun: <%= rerun_opts %> --format pretty
ci: --format pretty --format json --out reports/cucumber.json --tags 'not @manual'
smoke: --tags @smoke --format progress
\`\`\`

## 3. Your First Feature File

\`\`\`gherkin
# features/users/signin.feature
Feature: User signs in

  Background:
    Given a user exists with email "alice@example.com" and password "Sup3rS3cret!"

  @smoke @auth
  Scenario: Successful sign-in
    When I visit the sign-in page
    And I fill in "Email" with "alice@example.com"
    And I fill in "Password" with "Sup3rS3cret!"
    And I press "Sign in"
    Then I should see "Welcome, Alice"
    And I should be on the dashboard page

  Scenario Outline: Sign-in fails
    When I visit the sign-in page
    And I fill in "Email" with "<email>"
    And I fill in "Password" with "<password>"
    And I press "Sign in"
    Then I should see "<error>"

    Examples:
      | email             | password    | error                |
      | not-an-email      | Sup3rS3cret!| Invalid email        |
      | alice@example.com | wrong       | Invalid credentials  |
\`\`\`

## 4. Step Definitions

\`\`\`ruby
# features/step_definitions/auth_steps.rb
Given('a user exists with email {string} and password {string}') do |email, password|
  @user = FactoryBot.create(:user, email: email, password: password, name: 'Alice')
end

When('I visit the sign-in page') do
  visit '/signin'
end

When('I fill in {string} with {string}') do |field, value|
  fill_in field, with: value
end

When('I press {string}') do |button|
  click_button button
end

Then('I should see {string}') do |text|
  expect(page).to have_content(text)
end

Then('I should be on the {string} page') do |page_name|
  expected_path = case page_name
                  when 'dashboard' then '/dashboard'
                  when 'sign-in' then '/signin'
                  else raise "Unknown page #{page_name}"
                  end
  expect(current_path).to eq(expected_path)
end
\`\`\`

## 5. Capybara Configuration

\`\`\`ruby
# features/support/env.rb
require 'cucumber/rails'
require 'capybara/cucumber'
require 'capybara/rails'
require 'selenium-webdriver'

Capybara.javascript_driver = :selenium_chrome_headless
Capybara.default_max_wait_time = 5
Capybara.app_host = ENV.fetch('BASE_URL', 'http://localhost:3000')

Capybara.register_driver :selenium_chrome_headless do |app|
  options = Selenium::WebDriver::Chrome::Options.new
  options.add_argument('--headless=new')
  options.add_argument('--no-sandbox')
  options.add_argument('--window-size=1280,720')
  Capybara::Selenium::Driver.new(app, browser: :chrome, options: options)
end
\`\`\`

## 6. Hooks

\`\`\`ruby
# features/support/hooks.rb
require 'database_cleaner/active_record'
DatabaseCleaner.strategy = :truncation

Before do
  DatabaseCleaner.start
end

After do |scenario|
  if scenario.failed?
    Capybara.page.save_screenshot("reports/screenshots/#{scenario.name.gsub(/\\W+/, '_')}.png")
  end
  DatabaseCleaner.clean
end

Before('@requires-stripe') do
  WebMock.allow_net_connect!(allow: %w[stripe.com])
end

BeforeAll do
  Rails.application.eager_load!
end

AfterAll do
  Rails.cache.clear
end
\`\`\`

## 7. Tags

Common conventions:

| Tag | Purpose |
|---|---|
| @smoke | Critical scenarios |
| @regression | Full suite |
| @javascript | Requires Selenium |
| @api | API-only |
| @wip | In progress |
| @manual | Manual testing |

Run filtered:

\`\`\`bash
bundle exec cucumber --tags '@smoke and not @wip'
\`\`\`

## 8. Data Tables

\`\`\`gherkin
Scenario: Bulk role assignment
  Given the following users:
    | name    | email             | role  |
    | Alice   | alice@example.com | admin |
    | Bob     | bob@example.com   | user  |
    | Charlie | carol@example.com | guest |
  Then 3 users should exist
\`\`\`

\`\`\`ruby
Given('the following users:') do |table|
  table.hashes.each do |row|
    FactoryBot.create(:user, **row.symbolize_keys)
  end
end

Then('{int} users should exist') do |count|
  expect(User.count).to eq(count)
end
\`\`\`

## 9. Parallel Execution with parallel_tests

\`\`\`bash
bundle exec parallel_test features/ --type cucumber -n 4
\`\`\`

Configure per-process databases in config/database.yml:

\`\`\`yaml
test:
  database: myapp_test<%= ENV['TEST_ENV_NUMBER'] %>
\`\`\`

Then prepare them:

\`\`\`bash
bundle exec rake parallel:create parallel:migrate
\`\`\`

## 10. Allure Reporting

\`\`\`ruby
# features/support/allure.rb
require 'allure-cucumber'

AllureCucumber.configure do |c|
  c.results_directory = 'reports/allure-results'
  c.clean_results_directory = true
end
\`\`\`

Generate report:

\`\`\`bash
bundle exec cucumber --format AllureCucumber::CucumberFormatter
allure serve reports/allure-results
\`\`\`

## 11. CI Integration

\`\`\`yaml
name: Cucumber
on: [push]
jobs:
  cucumber:
    runs-on: ubuntu-22.04
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres }
        ports: [5432:5432]
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: 3.3, bundler-cache: true }
      - run: bundle exec rake db:create db:migrate
      - run: bundle exec parallel_test features/ --type cucumber -n 2 --group-by scenarios --only-group \${{ matrix.shard }}/4
        env:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/myapp_test
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: cucumber-report-\${{ matrix.shard }}, path: reports/ }
\`\`\`

## 12. Best Practices

- **Use FactoryBot** for test data, not raw .new.
- **Use DatabaseCleaner truncation** for Selenium/Capybara, transactions for non-JS scenarios.
- **Keep step definitions in step_definitions/ by domain**.
- **Tag every scenario** for filterability.
- **Run smoke on every PR, full regression nightly**.

## 13. AI-Assisted Authoring

The [cucumber-ruby](/skills) SKILL.md pack on QASkills teaches Claude or Cursor to generate Capybara-driven step definitions matching Rails conventions. See [cursor-skills-md-best-practices](/blog).

## 14. Advanced Capybara Patterns

### Page Objects in Ruby
\`\`\`ruby
# features/support/pages/checkout_page.rb
class CheckoutPage
  include Capybara::DSL

  def visit_page
    visit '/checkout'
  end

  def fill_card(number:, expiry:, cvv:)
    fill_in 'Card number', with: number
    fill_in 'Expiry', with: expiry
    fill_in 'CVV', with: cvv
  end

  def confirm
    click_button 'Confirm order'
  end
end

# In step definition
When('Alice completes checkout with card {string}') do |card|
  page = CheckoutPage.new
  page.visit_page
  page.fill_card(number: card, expiry: '12/30', cvv: '123')
  page.confirm
end
\`\`\`

### Wait Strategies
Capybara has automatic waiting, but explicit waits help:

\`\`\`ruby
Capybara.default_max_wait_time = 5

# in step definition
expect(page).to have_content('Order confirmed', wait: 10)
expect(page).not_to have_css('.spinner', wait: 5)
\`\`\`

### Headed Mode for Debugging
\`\`\`ruby
Capybara.javascript_driver = :selenium_chrome  # not headless
\`\`\`

Or via env var:

\`\`\`bash
HEADED=true bundle exec cucumber features/checkout.feature
\`\`\`

### Visiting External URLs
\`\`\`ruby
# config in env.rb
Capybara.app_host = nil  # disable automatic host prefix
Capybara.run_server = false

# in step
visit 'https://external-api.com/widget'
\`\`\`

### File Uploads
\`\`\`ruby
attach_file('Document', Rails.root.join('spec/fixtures/sample.pdf'))
\`\`\`

## 15. Async Steps with Sidekiq

For Rails apps using Sidekiq, run jobs synchronously in tests:

\`\`\`ruby
# features/support/sidekiq.rb
require 'sidekiq/testing'
Sidekiq::Testing.inline!
\`\`\`

This makes Sidekiq::Worker.perform_async run synchronously, simplifying scenarios that depend on background jobs.

## 16. Email Testing

\`\`\`ruby
Then('a welcome email should be sent to {string}') do |email|
  delivery = ActionMailer::Base.deliveries.find { |d| d.to.include?(email) }
  expect(delivery).not_to be_nil
  expect(delivery.subject).to eq('Welcome to our app')
end
\`\`\`

## 17. Capybara Drivers Comparison

| Driver | Speed | JS support | Use case |
|---|---|---|---|
| :rack_test | Fastest | No | API-only tests |
| :selenium_chrome | Fast | Yes | Standard E2E |
| :selenium_chrome_headless | Fast | Yes | CI standard |
| :playwright | Fast | Yes | New projects |
| :webkit | Deprecated | Yes | Legacy |

Most teams in 2026 default to :selenium_chrome_headless for CI and :playwright for new projects.

## 18. Rails-Specific Patterns

### Devise integration
\`\`\`ruby
Given('a logged-in admin') do
  @user = FactoryBot.create(:admin)
  login_as(@user, scope: :user)
end
\`\`\`

### Rails Cache Clearing
\`\`\`ruby
Before do
  Rails.cache.clear
end
\`\`\`

### Mailcatcher Integration
For testing email in Capybara, configure ActionMailer to use SMTP localhost:1025 (Mailcatcher).

## 19. Frequently Asked Questions

**Q: Can I use Cucumber Ruby with non-Rails apps?**
A: Yes -- cucumber-ruby works standalone. Remove cucumber-rails and configure Capybara directly.

**Q: Should I use Cucumber or RSpec?**
A: For unit tests, RSpec. For acceptance tests with stakeholder readability, Cucumber. They coexist well.

**Q: How do I avoid flaky tests in Capybara?**
A: Use Capybara's auto-waiting (have_content, have_css). Avoid sleep. Use cy.intercept-style waiting via webmock for API stubs.

**Q: AI agents for Cucumber Ruby?**
A: Yes -- the [cucumber-ruby](/skills) SKILL.md pack on QASkills teaches Claude to generate step definitions using Capybara conventions.

**Q: Can I run tests in parallel?**
A: Yes -- use parallel_tests with per-process databases.

## Conclusion

Cucumber Ruby + Capybara remains an excellent BDD stack for Rails teams in 2026. The maturity of the gems, the depth of conventions, and the seamless Rails integration make it a low-friction adoption. For broader BDD strategy see [comparing-popular-bdd-frameworks-2026-complete-guide](/blog).
`,
};
