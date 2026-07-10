import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RSpec System Tests with Capybara Guide',
  description:
    'RSpec system tests with Capybara guide for Rails teams that need reliable browser specs, clean driver setup, faster feedback, and fewer UI flakes.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# RSpec System Tests with Capybara Guide

The first Rails system spec usually starts innocently: visit a page, click a link, expect some text. The trouble arrives later, when one spec needs JavaScript, another silently uses Rack::Test, a third depends on a record created in a previous example, and the CI browser only fails when screenshots are disabled.

RSpec system tests wrap Rails system testing while letting teams keep the RSpec style they already use for models, requests, jobs, and services. Capybara provides the browser vocabulary: \`visit\`, \`fill_in\`, \`click_button\`, \`have_css\`, \`within\`, and the waiting behavior that makes browser tests less timing-sensitive when used correctly.

This guide is for Rails teams that want browser-level confidence without turning the suite into a slow pile of screenshots. For broader RSpec structure, read the [RSpec Ruby testing guide](/blog/rspec-ruby-testing-guide). For Capybara outside the Rails system spec wrapper, the [Capybara Ruby testing guide](/blog/capybara-ruby-testing-guide) covers selectors, drivers, and matching in more depth.

## What System Specs Should Prove in a Rails Codebase

System specs should prove that a user can complete a critical workflow through the rendered application. They are not a replacement for model specs, request specs, authorization specs, or JavaScript unit tests. Their value is in the joined behavior: routing, templates, assets, browser interaction, database state, and visible outcomes.

Good system specs are few, intentional, and written around user journeys. They answer questions like these:

| Workflow | System spec value | Better covered elsewhere |
|---|---|---|
| User signs in and lands on dashboard | Confirms auth form, session wiring, redirect, flash, and page rendering | Password hashing branches, token expiry edge cases |
| Admin updates a role | Confirms browser flow and authorization boundary from UI | Policy object truth table |
| Customer checks out | Confirms multi-step form, totals display, and final confirmation | Payment gateway client unit behavior |
| Search filters results | Confirms visible filter controls and result rendering | Search ranking algorithm |
| File upload attaches document | Confirms multipart browser flow and success state | Storage adapter retries |

The trap is writing a system spec every time a controller changes. Browser specs have a real cost. They boot more of the app, need more database setup, and involve an external driver when JavaScript is required. Use them where integration risk is real.

## Install and Configure the RSpec System Spec Baseline

Most Rails apps that use \`rspec-rails\` already have the pieces. System specs live under \`spec/system\` and use \`type: :system\`. Rails system tests use Capybara under the hood, and RSpec exposes the same flow through its metadata.

A practical baseline is to set a default driven browser once, then override it per example or context when needed. Headless Selenium with Chrome is common for JavaScript scenarios.

\`\`\`ruby
# spec/rails_helper.rb
RSpec.configure do |config|
  config.before(:each, type: :system) do
    driven_by :rack_test
  end

  config.before(:each, type: :system, js: true) do
    driven_by :selenium, using: :headless_chrome, screen_size: [1400, 1400]
  end
end
\`\`\`

This default keeps non-JavaScript browser specs fast with \`rack_test\`, while letting examples tagged with \`js: true\` run in a real headless browser. The split is useful because many Rails flows render plain HTML and submit standard forms. They do not deserve the overhead of Selenium.

| Driver | JavaScript support | Typical use | Watch-outs |
|---|---|---|---|
| \`rack_test\` | No | Fast HTML flows, redirects, form posts | No browser JS, no remote server behavior |
| \`selenium\` with headless Chrome | Yes | Stimulus, Turbo, React islands, file previews | Slower, needs browser availability in CI |
| \`cuprite\` | Yes | Chrome DevTools Protocol driven specs | Extra gem and driver-specific behavior |
| Remote Selenium Grid | Yes | Cross-browser or containerized execution | More moving parts, network timing differences |

Do not tag every system spec with \`js: true\` by habit. That turns a targeted browser suite into a slow end-to-end suite. Make JavaScript pay rent.

## A System Spec That Uses Capybara Waiting Correctly

Capybara matchers wait for conditions up to the configured wait time. That means \`expect(page).to have_css(...)\` is usually better than sleeping. The matcher retries until the condition passes or times out.

Here is a realistic Rails system spec for an invite flow. It uses FactoryBot setup, visits a Rails route helper, scopes interactions with \`within\`, and asserts visible outcomes rather than implementation details.

\`\`\`ruby
# spec/system/team_invites_spec.rb
require 'rails_helper'

RSpec.describe 'Team invites', type: :system do
  let(:owner) { create(:user) }
  let(:team) { create(:team, owner: owner) }

  before do
    sign_in owner
  end

  it 'allows an owner to invite a teammate' do
    visit team_members_path(team)

    click_link 'Invite member'

    within('[data-testid="invite-member-form"]') do
      fill_in 'Email', with: 'new.member@example.test'
      select 'Editor', from: 'Role'
      click_button 'Send invite'
    end

    expect(page).to have_css('[data-testid="flash"]', text: 'Invitation sent')
    expect(page).to have_css('[data-testid="pending-invite"]', text: 'new.member@example.test')
  end
end
\`\`\`

Notice what the spec does not assert. It does not inspect the database directly after every click. It does not assert that a specific mailer class was called. It does not know which controller action handled the form. Those details can be covered elsewhere. The system spec proves the user-visible contract.

## Authentication Helpers Belong in Test Support, Not Every Spec

Rails teams often duplicate sign-in steps across system specs. That may be useful for one smoke test of the login page, but it is wasteful for workflows that simply need an authenticated user. Use a helper that signs in through the same auth library's test support when possible.

For Devise, teams commonly include integration helpers in system specs. The exact setup depends on your Devise and RSpec versions, but the pattern is stable: include the helper for system specs, then call \`sign_in user\` in setup.

\`\`\`ruby
# spec/support/system_auth.rb
RSpec.configure do |config|
  config.include Devise::Test::IntegrationHelpers, type: :system
end
\`\`\`

If you use a custom auth system, build a helper that creates the same session state your app expects. Keep one full login browser spec to protect the sign-in screen. Do not force every billing, admin, and settings spec to type a password unless the test is about login behavior.

## Turbo, Stimulus, and JavaScript Timing

Modern Rails apps often use Turbo and Stimulus. That changes what a browser spec should wait for. A form submission might replace a frame without a full page load. A modal might be injected after a click. A button might enable after a Stimulus controller validates input.

Capybara's waiting matchers still work, but the selector has to describe the right outcome. Waiting for \`current_path\` after a Turbo frame update may be wrong because the path may not change. Waiting for a row to appear inside a frame is better.

\`\`\`ruby
# spec/system/project_tasks_spec.rb
require 'rails_helper'

RSpec.describe 'Project tasks', type: :system, js: true do
  let(:user) { create(:user) }
  let(:project) { create(:project, owner: user) }

  before { sign_in user }

  it 'adds a task inside the Turbo frame' do
    visit project_tasks_path(project)

    within('turbo-frame#new_task') do
      fill_in 'Title', with: 'Review accessibility labels'
      click_button 'Add task'
    end

    within('turbo-frame#tasks') do
      expect(page).to have_css('[data-testid="task-row"]', text: 'Review accessibility labels')
    end
  end
end
\`\`\`

This spec waits for the new row where the UI contract says it should appear. It does not sleep. It does not assume a full navigation. It scopes the matcher to the frame so a duplicate label elsewhere on the page cannot accidentally satisfy the assertion.

## Selector Strategy for Rails Views

Capybara encourages human-facing selectors: labels, button text, links, and visible content. That is good for readability. It also catches accessibility regressions because broken labels break tests.

Use test IDs sparingly for elements that have no stable user-facing label or where repeated content makes ambiguity expensive. A good Rails view can support both.

| Element | Prefer | Use test ID when |
|---|---|---|
| Text input | \`fill_in 'Email'\` | The label is intentionally hidden and accessible naming is complex |
| Button | \`click_button 'Send invite'\` | Multiple identical buttons exist in repeated rows |
| Link | \`click_link 'Billing'\` | The link is icon-only and has an accessible label that is hard to target cleanly |
| Flash message | Text plus role or test ID | The layout includes repeated message text |
| Table row | Scope by row text, then act within it | Row content is duplicated or translated |

Do not put test IDs on every div. When tests stop using labels and buttons, they stop exercising important accessibility contracts. Use test IDs as stabilizers, not as a replacement for user language.

## Data Setup: Factories, Fixtures, and Database Isolation

System specs are vulnerable to oversized setup. A test that creates ten models before visiting a page is harder to debug than a unit spec with the same setup because failures appear in the browser. Keep factories small and name the scenario data.

Prefer data that makes the assertion obvious:

\`\`\`ruby
let!(:overdue_invoice) do
  create(:invoice, account: account, status: 'overdue', number: 'INV-2026-001')
end
\`\`\`

That is better than \`create(:invoice)\` when the page displays multiple invoices. The visible identifier in the assertion should connect back to the setup.

Database cleanup matters because system specs may run through a server thread while the test thread creates data. Rails system test support handles much of this in standard setups, but custom Database Cleaner configurations can break visibility between threads. If a system spec cannot see records created in setup, inspect transaction strategy before blaming Capybara.

Parallel execution adds another layer. Use unique values for visible fields, avoid shared mutable fixtures, and make uploaded filenames unique when the app stores them on disk or in object storage during tests.

## Debugging Failures Without Guessing

Screenshots are useful, but a screenshot alone rarely explains a Rails system failure. Capture the page HTML when a selector is missing. Log browser console messages for JavaScript-heavy failures if your driver exposes them. Print the current URL when an unexpected redirect occurs.

Capybara already saves screenshots for failures in many Rails configurations. You can add focused diagnostics around difficult flows:

\`\`\`ruby
# spec/support/system_debug.rb
RSpec.configure do |config|
  config.after(:each, type: :system) do |example|
    next unless example.exception

    warn "System spec failed at: #{page.current_url}"
    warn "Page title: #{page.title}" if page.respond_to?(:title)
  end
end
\`\`\`

Be careful with logging page bodies in CI. They can contain tokens, emails, or customer-like fixture data. Save enough context to debug the failure, not the entire session state by default.

## File Uploads and Downloads

Capybara supports attaching files through \`attach_file\`. The test should point at a fixture file and assert the application result. Do not assert browser download internals unless the feature is truly about downloads.

\`\`\`ruby
# spec/system/document_uploads_spec.rb
require 'rails_helper'

RSpec.describe 'Document uploads', type: :system do
  let(:user) { create(:user) }

  before { sign_in user }

  it 'uploads a signed agreement' do
    visit documents_path

    attach_file 'Agreement', Rails.root.join('spec/fixtures/files/agreement.pdf')
    click_button 'Upload'

    expect(page).to have_css('[data-testid="document-row"]', text: 'agreement.pdf')
    expect(page).to have_css('[data-testid="flash"]', text: 'Document uploaded')
  end
end
\`\`\`

For direct uploads through Active Storage, you may need a JavaScript driver because the browser performs more work. Keep one or two full direct-upload specs, then cover storage validations and model behavior lower in the pyramid.

## Reducing Flake in Capybara System Specs

Flake usually comes from one of five places: wrong driver, wrong wait target, shared state, external services, or hidden UI assumptions. Raising \`Capybara.default_max_wait_time\` can make a symptom less frequent, but it rarely fixes the cause.

| Symptom | Likely cause | Better fix |
|---|---|---|
| Button click does nothing in CI | Button is covered, disabled, or JavaScript has not initialized | Assert enabled state or wait for the component-ready marker |
| Text assertion passes locally, fails remotely | Race after Turbo update or async job | Wait for the final row, toast, or frame content |
| Spec sees another example's record | Shared fixture or non-isolated external state | Use unique data and clean external stores |
| Upload spec fails only headless | Hidden input or browser-specific file handling | Use Capybara-supported \`attach_file\` path and real labels |
| Login disappears mid-flow | Session helper mismatch or host configuration issue | Align app host, server host, and auth test helper |

Senior teams do not treat flake as a browser tax. They classify it. A timing issue in a Turbo frame is different from a data collision in Redis or an auth cookie scoped to the wrong host.

## When to Avoid a System Spec

Do not write a system spec for every validation branch. If a form has fifteen invalid states, cover the validation rules in model or form object specs, then write one browser spec that proves errors render correctly. Do not test every policy branch through the UI. Cover the policy directly, then write one system spec for a representative allowed and denied path if the UX matters.

Avoid system specs for third-party service behavior you do not control. Stub payment gateways, email providers, and geocoding APIs. The system spec can prove that your app sends the user down the right visible path when the service succeeds or fails. Contract tests or adapter specs can prove request shape.

## A Maintainable File Layout

A Rails app with system specs should keep support code discoverable:

\`\`\`text
spec/
  fixtures/
    files/
      agreement.pdf
  support/
    system_auth.rb
    system_debug.rb
  system/
    admin_users_spec.rb
    document_uploads_spec.rb
    project_tasks_spec.rb
    team_invites_spec.rb
\`\`\`

Require support files consistently from \`rails_helper.rb\`. Avoid hiding major behavior in random spec files. If a helper signs users in, configures drivers, or writes debug artifacts, it belongs under \`spec/support\`.

## Review Criteria for Rails Browser Specs

Before merging a system spec, ask what risk it covers. If the answer is "the page loads," that may be a smoke test, but it is not enough for most workflows. A strong system spec has a named actor, a realistic setup, user-visible actions, and assertions that would fail if the user could not complete the job.

Also review runtime. A single system spec can be worth several seconds if it covers checkout or onboarding. Ten redundant specs around the same form are harder to justify. Keep the suite small enough that developers still run it before risky changes.

Finally, review failure readability. The next person to debug the test should know which screen failed, which user action happened, and which visible outcome was missing. Capybara gives you readable primitives. Use them to keep the spec close to the user story.

## Frequently Asked Questions

### Should Rails system specs use \`rack_test\` or Selenium by default?

Use \`rack_test\` by default when many flows are server-rendered and do not need JavaScript. Tag JavaScript scenarios with \`js: true\` and switch those to Selenium or another browser driver. If your app is heavily JavaScript-driven, a browser default may be more honest.

### Why does \`expect(page).to have_text\` pass when the wrong area contains the text?

The matcher searches the page unless you scope it. Use \`within\` around a form, frame, table row, or component when repeated labels exist. Scoping makes the assertion describe the UI region that actually matters.

### Do I need to click through login in every system spec?

No. Keep a dedicated login system spec, then use auth test helpers for workflows that merely require an authenticated user. Repeating login steps slows the suite and makes unrelated specs fail when the login UI changes.

### How should I test Turbo frame updates?

Assert the frame's resulting content, not a full page navigation. Scope with \`within('turbo-frame#frame_id')\` and wait for the row, message, or control that represents the completed update.

### What is the best first fix for flaky Capybara specs?

Replace sleeps with a wait for the user-visible final state. If that does not solve it, classify the failure by driver, data isolation, auth state, external service, or JavaScript initialization. Random wait increases are a last resort.
`,
};
