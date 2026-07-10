import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Capybara Waiting and Synchronization Guide',
  description:
    'Reduce Capybara flaky tests with implicit waits, matcher synchronization, async UI checks, and driver-aware debugging for stable Ruby suites.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Capybara Waiting and Synchronization Guide

The failing line often looks innocent: expect(page).to have_text('Saved'). The browser did click Save, the server did return 200, and the message did appear in the video. Capybara still failed because the test asked the wrong question at the wrong time. Synchronization in Capybara is not about sprinkling sleeps between actions. It is about using Capybara's waiting matchers so the test describes the browser state that must eventually be true.

This guide assumes you already use Capybara with RSpec or Minitest and want fewer flakes around async JavaScript, Turbo or Stimulus updates, Selenium drivers, and negative assertions. For a broader Ruby testing setup, read [Capybara Ruby testing guide](/blog/capybara-ruby-testing-guide). If your flake investigation touches test doubles and boundaries outside the browser, pair this with [RSpec mocks doubles stubs guide 2026](/blog/rspec-mocks-doubles-stubs-guide-2026).

## Capybara waits inside matchers, not after every command

Capybara's core design is polling. Methods such as have_css, have_text, have_current_path, and have_no_css wait up to the configured maximum time for a condition to become true. Plain Ruby predicates and immediate DOM reads do not get the same behavior. That difference explains many flakes: a test uses all to collect nodes immediately, then expects the count to change after an AJAX call that is still running.

The practical discipline is to express synchronization as an expectation. If a banner should appear, assert have_css on the banner. If a spinner should disappear, assert have_no_css on the spinner. If a row count should change, assert the specific row selector and text that prove the update landed. This gives Capybara a condition it can poll.

| Intent | Better Capybara expression | Risky expression | Why it matters |
|---|---|---|---|
| Wait for a save toast | expect(page).to have_css('.toast', text: 'Saved') | sleep 1; expect(page.text).to include('Saved') | The matcher polls until the toast exists and contains the text. |
| Wait for navigation | expect(page).to have_current_path('/settings') | expect(current_path).to eq('/settings') | current_path is an immediate read and can race with client routing. |
| Wait for removal | expect(page).to have_no_css('.modal') | expect(page).not_to have_css('.modal') | The have_no matcher waits for disappearance. |
| Wait for a filtered row | expect(page).to have_css('[data-testid="user-row"]', text: 'Priya') | expect(all('[data-testid="user-row"]').first.text).to include('Priya') | all returns what exists at that instant unless configured otherwise. |
| Wait for enabled button | expect(page).to have_button('Publish', disabled: false) | find('button', text: 'Publish').click | The state transition is asserted before the click. |
| Wait inside a region | within('[data-testid="results"]') { expect(page).to have_text('Invoice') } | expect(page).to have_text('Invoice') | The scoped assertion avoids matching stale text elsewhere on the page. |

## Configuring the wait budget without hiding slow UI

Capybara.default_max_wait_time is a budget, not a forced delay. A matcher stops as soon as the condition is satisfied. Setting it to 5 seconds does not make every assertion take 5 seconds. It allows legitimately async behavior to finish without writing manual polling loops.

Do not set a giant global wait time to mask unstable pages. A 30 second default makes real regressions expensive and slows negative assertions when the condition never changes. A smaller global value, with local increases around known long operations, gives a cleaner signal. File upload processing, report generation, and third-party callback simulation may deserve a larger wait. A simple button enablement should not.

\`\`\`ruby
# spec/support/capybara.rb
require 'capybara/rspec'
require 'selenium/webdriver'

Capybara.default_max_wait_time = 5
Capybara.server = :puma, { Silent: true }

Capybara.register_driver :selenium_chrome_headless do |app|
  options = Selenium::WebDriver::Chrome::Options.new
  options.add_argument('--headless=new')
  options.add_argument('--window-size=1440,1000')

  Capybara::Selenium::Driver.new(app, browser: :chrome, options: options)
end

Capybara.javascript_driver = :selenium_chrome_headless

RSpec.configure do |config|
  config.before(:each, type: :system) do
    driven_by Capybara.javascript_driver
  end
end
\`\`\`

For a one-off slow assertion, use using_wait_time. Keep the larger wait as close as possible to the condition that needs it. That makes the exception obvious during code review.

\`\`\`ruby
it 'shows the generated audit report' do
  visit '/reports/audit'

  click_button 'Generate report'

  using_wait_time 20 do
    expect(page).to have_css('[data-testid="report-status"]', text: 'Ready')
    expect(page).to have_link('Download PDF')
  end
end
\`\`\`

## The negative assertion trap

The most common Capybara synchronization bug is a negative assertion written with a positive matcher and RSpec not_to. expect(page).not_to have_css('.spinner') can pass immediately if the spinner has not appeared yet, even though the app is about to show it. expect(page).to have_no_css('.spinner') waits for the selector to be absent. The distinction matters when testing transitions.

If you need to prove that a spinner appeared and then disappeared, assert both phases. This prevents a false pass where the app never started work. It also makes the failure message clearer: either the spinner never appeared, or it appeared and did not go away.

| Scenario | Assertion sequence | Failure tells you |
|---|---|---|
| Background save indicator | expect(page).to have_css('.saving'); expect(page).to have_no_css('.saving') | Whether the save state never started or never completed. |
| Modal close animation | click_button 'Close'; expect(page).to have_no_css('[role="dialog"]') | The dialog remained visible beyond the wait budget. |
| Toast timeout | expect(page).to have_css('.toast'); expect(page).to have_no_css('.toast') | The toast lifecycle is broken, not merely delayed. |
| Search results refresh | expect(page).to have_css('.loading'); expect(page).to have_no_css('.loading'); expect(page).to have_text('No results') | The test waits for the refresh boundary before checking content. |
| Disabled form submit | expect(page).to have_button('Submit', disabled: true) | The UI correctly blocks submission before required fields exist. |
| Re-enabled form submit | fill_in 'Name', with: 'Asha'; expect(page).to have_button('Submit', disabled: false) | The state moved from invalid to valid. |

## Synchronizing with Turbo, Stimulus, and client rendering

Rails teams using Hotwire often see failures where the server returned the correct Turbo Stream, but the DOM assertion ran before the replacement finished. Capybara does not know about Turbo directly. It waits for DOM conditions. That is enough if the test asserts the final element in the replaced frame.

Prefer stable frame and test id selectors over text that can exist before and after the update. If the old row and new row both contain the same username, text alone does not prove the replacement landed. A status cell, timestamp, or data attribute tied to the updated state is a better wait target.

\`\`\`ruby
RSpec.describe 'project membership', type: :system do
  it 'promotes a member through a turbo frame update' do
    visit '/admin/projects/alpha/members'

    within('[data-testid="member-row-priya"]') do
      expect(page).to have_text('Viewer')
      click_button 'Promote'
    end

    within('turbo-frame#members') do
      expect(page).to have_css('[data-testid="member-row-priya"]', text: 'Maintainer')
      expect(page).to have_no_css('[data-testid="promotion-spinner"]')
    end
  end
end
\`\`\`

When a Stimulus controller changes an attribute, assert the attribute through a selector. For example, expect(page).to have_css('[data-testid="publish-button"][aria-busy="false"]'). Avoid evaluating JavaScript flags unless the user-facing DOM has no equivalent. Browser tests should usually synchronize on behavior visible to the browser, not implementation variables.

## Avoiding immediate reads after async actions

Capybara exposes methods that look convenient but bypass waiting when misused. text, value, current_url, current_path, and all are reads. They can be correct after a wait, but they are poor synchronization points by themselves. If you need a value, first wait for an element condition that proves the value is ready, then read it.

A good pattern is wait, then extract. For example, wait for an invoice number selector whose text matches the expected format, then read the text to use in a later assertion. This keeps the synchronization local and avoids adding sleeps between dependent actions.

\`\`\`ruby
it 'creates an invoice number that can be opened from search' do
  visit '/invoices/new'

  fill_in 'Customer', with: 'Contoso QA'
  click_button 'Create invoice'

  expect(page).to have_css('[data-testid="invoice-number"]', text: /INV-[0-9]{6}/)
  invoice_number = find('[data-testid="invoice-number"]').text

  visit '/invoices'
  fill_in 'Search', with: invoice_number

  expect(page).to have_css('[data-testid="invoice-result"]', text: invoice_number)
end
\`\`\`

The extraction is safe because it follows a waiting matcher. Without that first expectation, find may wait for the element but not necessarily for its final text. The test could capture an empty placeholder and then fail later in a confusing place.

## Driver differences that change timing

RackTest is fast because it does not run JavaScript. Selenium, Cuprite, Apparition, and remote browsers execute JavaScript and can expose timing that RackTest never sees. A test that passes with RackTest but fails with Selenium may not be flaky. It may be testing a page that relies on client behavior without using a JavaScript-capable driver.

Match the driver to the feature. Non-JavaScript pages can run with RackTest. Any page with client routing, fetch, Turbo Streams, WebSockets, animation-gated controls, or rich widgets should use a JavaScript driver. Mixing them casually creates false confidence.

| Driver choice | JavaScript support | Synchronization implication | Use with care when |
|---|---:|---|---|
| RackTest | No | Server response is immediate, no browser event loop | The page behavior depends on JavaScript. |
| Selenium Chrome headless | Yes | Real browser timing, waits need DOM conditions | CI machines have constrained CPU or different window sizes. |
| Selenium remote grid | Yes | Network and remote browser overhead are added | Debugging needs screenshots, videos, and driver logs. |
| Cuprite | Yes | Fast Chrome DevTools based execution | Browser compatibility outside Chromium matters. |
| Visible local Chrome | Yes | Useful for observing timing and focus issues | Headed behavior differs because of animations or OS dialogs. |

## Debugging a flake without adding sleep

When a Capybara test flakes, collect the page state at the failing moment. save_and_open_screenshot is useful locally. In CI, configure screenshot artifacts and HTML dumps on failure. The goal is to learn whether the expected element was absent, hidden, covered, stale, or present with different text.

Then classify the wait problem. Was the assertion immediate? Was the selector ambiguous? Did the app show a loading state the test ignored? Did a negative assertion pass before the transition started? Did the driver run at a viewport where the element moved into a menu? Each answer points to a different repair.

Good repairs make the test more descriptive. They do not only make the test slower. Replace sleep 2 with a wait for the exact row, button state, route, or message that matters. If no visible state exists, that is product feedback: the UI may be missing an accessible progress or completion signal.

## Waiting for network-adjacent UI without network hooks

Capybara does not need to know whether the page used fetch, XMLHttpRequest, Turbo, ActionCable, or a polling endpoint. In most system tests, the user-visible result is the contract. A network hook that waits until all requests are idle can be tempting, but it can also make the test depend on implementation details and background activity that does not matter to the user.

Take a search page that sends a request on every keystroke. Waiting for network idle is fragile because analytics, autocomplete, or presence pings may keep the browser active. Waiting for the results region to show the query term, count, or empty-state message is more accurate. The test cares that the search results reflect the search, not that the browser has no outstanding requests.

There are exceptions. If the application has no visible transition and the only reliable signal is a JavaScript event or API response, consider adding a visible or accessible state first. A busy indicator, aria-busy attribute, status region, or test id attached to the updated component gives both users and tests a better contract. If you cannot change the product, a driver-specific network wait may be acceptable as a temporary bridge, but it should be documented as technical debt.

| UI pattern | Prefer this wait | Avoid this shortcut | Reason |
|---|---|---|---|
| Autocomplete results | Result option with expected label | Sleep after typing | Keystroke debounce varies by browser and CPU. |
| Turbo frame replacement | New element inside the frame | Waiting for any request to finish | Multiple requests may overlap, and the frame is the user contract. |
| File processing | Status text such as Processing then Ready | Large global wait time | The long wait belongs to that workflow only. |
| Infinite scroll | Newly appended item or page count | Assuming scroll triggers immediately | Intersection observers fire differently by viewport. |
| WebSocket notification | Notification badge or message row | Polling a server flag from the test | The browser must prove it received the pushed update. |

## Selectors that make synchronization possible

Selector quality and waiting quality are connected. A selector that matches old and new states cannot synchronize the transition. If a row says Priya before and after a role change, waiting for Priya is useless. The selector or text must identify the changed state: role badge, status cell, timestamp, version, or count.

Use data-testid sparingly but deliberately. It is valuable for dynamic controls whose accessible name is not unique, for repeated rows, and for landmarks that represent completion. Accessible selectors such as button text and labels should remain the first choice when they are stable and meaningful. Test ids fill the gap when product text is not a precise state boundary.

For repeated components, include the entity id in a parent selector and assert inside it. That keeps Capybara from matching a stale row elsewhere on the page. It also makes screenshots easier to read because the failed assertion points to a real region of the UI.

| Bad synchronization target | Better target | What changed |
|---|---|---|
| Page contains Settings | Save button becomes disabled false | The form is ready for interaction. |
| Row contains user name | Specific user row contains Maintainer | The role update is proven. |
| Any toast exists | Toast contains Saved profile | The correct action completed. |
| Modal text appears | Dialog role with expected title appears | The overlay, not hidden template text, is visible. |
| Results section exists | Results section has aria-busy false and expected count | The async refresh completed. |

## Triage notes for Capybara flakes

When a failure report arrives, record the failing driver, viewport, selector, matcher type, screenshot, HTML snapshot, and whether the assertion was positive or negative. That small set of facts usually identifies the repair path. Without it, teams debate whether the environment is slow and add sleeps.

If the screenshot shows the expected UI, inspect whether the selector was scoped correctly or whether the element appeared after the assertion timed out. If the screenshot shows a previous page, the test probably needs have_current_path or a landmark wait after navigation. If the screenshot shows the right page with a loading state, wait for the loading boundary. If the HTML has the element but the screenshot does not, the element may be hidden, covered, or outside the viewport.

Also look for test order dependencies. A Capybara wait cannot fix polluted data. If a previous example leaves a modal preference, feature flag, or account state behind, a later test may wait forever for a state that is no longer valid for that user. Synchronization and isolation work together; one cannot replace the other.

## Frequently Asked Questions

### Is sleep ever acceptable in a Capybara test?

Rarely. A fixed sleep can be useful during local diagnosis, but it should not be the committed synchronization strategy. Prefer waiting matchers. If there is no stable DOM condition to wait for, add one to the application.

### What default_max_wait_time should a Rails system test suite use?

Five seconds is a common starting point for local and CI browser suites. Increase it locally around specific long operations with using_wait_time. Avoid a huge global wait because it hides real slowness and makes failures expensive.

### Why does have_no_css behave differently from not_to have_css?

have_no_css is designed to wait for absence. not_to have_css can pass immediately when the element is absent at the first poll, even if the app is about to show it. For disappearance, use have_no_css.

### Should I wait for AJAX requests directly?

Usually no. Wait for the DOM result of the AJAX request: new row, changed status, removed spinner, enabled button, or updated count. Direct network waiting couples the test to implementation and can miss client rendering failures.

### How do I fix a test that only flakes on Selenium in CI?

Capture screenshots and HTML on failure, confirm the viewport, then replace immediate reads with waiting matchers. Also check whether the page uses JavaScript while the test was previously passing under RackTest.
`,
};
