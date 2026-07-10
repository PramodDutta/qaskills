import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Nightwatch Page Objects and Custom Commands Guide',
  description:
    'Advanced Nightwatch page objects and custom commands guide for maintainable suites, reusable browser flows, cleaner APIs, and lower selector churn.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Nightwatch Page Objects and Custom Commands Guide

A checkout test that knows the CSS selector for the email field, the password field, the remember-me checkbox, the coupon drawer, and the submit button is already doing too much. Nightwatch gives you two escape hatches before that test becomes a brittle script: page objects for screen-level vocabulary, and custom commands for behavior that belongs to the browser API itself.

This guide assumes you already know how to launch Nightwatch and write a basic assertion. The harder question is where reusable behavior should live. Put everything in page objects and you get fluent pages that hide too much. Put everything in global commands and every test can call business actions without context. Leave everything in tests and a rename in the frontend turns into a hundred edits.

The maintainable middle is explicit ownership. A page object should describe a known surface: selectors, sections, and actions that make sense only on that surface. A custom command should describe a reusable browser operation: clearing fields safely, waiting for network quiet through your app's own signal, logging accessibility metadata, or attaching debug state when an assertion fails.

If you are building a broader Nightwatch foundation, pair this article with the [Nightwatch testing guide](/blog/nightwatchjs-testing-guide). If you are evaluating whether the abstraction should survive a framework change, the [Nightwatch to Playwright migration guide](/blog/nightwatch-to-playwright-migration-guide) gives the comparison context.

## Page Objects Are an API Boundary, Not a Selector Folder

The easiest page object to write is a flat list of elements. That is also the easiest page object to outgrow. A selector catalog helps with churn, but it does not stop tests from describing the UI in implementation terms. A senior Nightwatch suite treats the page object as the public API for a screen.

For a login screen, the test should say \`login.signInAs(user)\`, not \`setValue('@email')\`, \`setValue('@password')\`, and \`click('@submit')\` every time. The page still exposes low-level elements when a test needs a specific assertion, but the default path is business-level intent.

Nightwatch page objects are regular JavaScript modules. They commonly expose \`url\`, \`elements\`, \`sections\`, and \`commands\`. The \`commands\` property is where page-specific actions live. Nightwatch calls those command functions with the page or section as \`this\`, and browser commands are available through \`this.api\`.

| Page object part | Belongs there | Usually does not belong there |
|---|---|---|
| \`url\` | Stable route or route factory for a page | Environment selection, user creation, API setup |
| \`elements\` | Selectors that describe page-owned controls | Selectors from unrelated modal frameworks or third-party widgets |
| \`sections\` | Repeated regions with their own elements, such as nav, filters, cart lines | One-off div wrappers used only for styling |
| \`commands\` | Operations a user can perform on that page | Cross-page wait utilities, file fixtures, database cleanup |
| Test file | Scenario, data choice, assertions, and orchestration | Repeated selector mechanics or browser plumbing |

The boundary matters because page objects become a contract between tests and the application. If a selector changes, you edit the page object. If the product flow changes, you edit the page command and a small number of affected scenarios. If the expected outcome changes, you edit the test because that is the scenario's responsibility.

## A Login Page Object That Reads Like Product Behavior

Here is a Nightwatch page object that keeps selectors, form mechanics, and page-owned assertions together. The command returns \`this\` so callers can keep chaining Nightwatch expectations.

\`\`\`js
// nightwatch/pages/login.js
module.exports = {
  url() {
    return this.api.launchUrl + '/login';
  },

  elements: {
    email: 'input[name="email"]',
    password: 'input[name="password"]',
    rememberMe: 'input[name="remember"]',
    submit: 'button[type="submit"]',
    flash: '[data-testid="flash-message"]',
  },

  commands: [
    {
      open() {
        return this.navigate().waitForElementVisible('@email');
      },

      signInAs(email, password, options = {}) {
        this.waitForElementVisible('@email')
          .clearValue('@email')
          .setValue('@email', email)
          .clearValue('@password')
          .setValue('@password', password);

        if (options.rememberMe === true) {
          this.click('@rememberMe');
        }

        return this.click('@submit');
      },

      expectSignedInMessage() {
        return this.expect.element('@flash').text.to.contain('Signed in');
      },
    },
  ],
};
\`\`\`

The corresponding test is intentionally short. It shows the page behavior, not the implementation mechanics.

\`\`\`js
// nightwatch/tests/login.spec.js
describe('login', function () {
  it('signs in an active user with remembered session enabled', function (browser) {
    const login = browser.page.login();

    login.open().signInAs('sdet@example.test', 'correct-horse', { rememberMe: true });

    login.expectSignedInMessage();
    browser.assert.urlContains('/dashboard');
  });
});
\`\`\`

This example is small, but the design scales. The command does not create users, seed billing plans, or assert every dashboard widget. It owns the login page interaction and one page-local message. The test still controls the scenario and the cross-page outcome.

## Sections Prevent Repeated Widgets From Leaking

Nightwatch sections are useful when the same page contains repeated or nested regions. A product row, address form, settings panel, or side navigation often has enough behavior to deserve its own mini API.

Do not make a section just because a div has a class. Make one when tests need to speak to a stable concept. A cart line with quantity, remove, price, and stock warning controls is a good candidate. The section can expose \`increaseQuantity\`, \`remove\`, and \`expectBackorderWarning\` without forcing every test to rebuild a selector chain.

| Repeated UI | Section command worth writing | Smell to avoid |
|---|---|---|
| Cart line item | Change quantity, remove item, assert line total | A command that knows checkout payment details |
| Account sidebar | Open billing, open profile, assert active nav item | A command that logs in before navigation |
| Search result row | Open result, save result, assert highlighted match | Index-based selectors with no domain identity |
| Data table row | Expand row, open action menu, assert status cell | Full table sorting logic hidden in a row section |
| Modal dialog | Confirm, cancel, assert validation message | Reusing one generic modal for unrelated product dialogs |

Sections also make tests less fragile around layout changes. If the cart line moves from a table to a list, the section root and element selectors change. The test still asks the line item to change quantity.

## Global Custom Commands Should Feel Like Missing Browser Primitives

Custom commands are Nightwatch's way to extend the browser API. A good custom command is reusable across pages and still low-level enough that it does not smuggle product behavior into every test.

Consider a common field operation: wait until a field is visible, clear it, type a new value, and optionally assert the value. If every page object reimplements that sequence, you invite drift. If every test writes it manually, you get noise. A global command is a cleaner home.

\`\`\`js
// nightwatch/custom-commands/clearAndSetValue.js
module.exports = class ClearAndSetValue {
  async command(selector, value) {
    await this.api.waitForElementVisible(selector);
    await this.api.clearValue(selector);
    await this.api.setValue(selector, value);
    return this;
  }
};
\`\`\`

Register the command path in your Nightwatch configuration. The exact file can vary by project, but the important property is \`custom_commands_path\`.

\`\`\`js
// nightwatch.conf.js
module.exports = {
  src_folders: ['nightwatch/tests'],
  page_objects_path: ['nightwatch/pages'],
  custom_commands_path: ['nightwatch/custom-commands'],

  test_settings: {
    default: {
      launch_url: 'http://localhost:3000',
      desiredCapabilities: {
        browserName: 'chrome',
      },
    },
  },
};
\`\`\`

The command can then be used from tests or page commands through \`this.api\`.

\`\`\`js
// inside a page-specific command
updateProfileName(name) {
  this.api.clearAndSetValue('[data-testid="profile-name"]', name);
  return this.click('@saveProfile');
}
\`\`\`

The command does not know what a profile is. That is deliberate. The browser API receives a reusable primitive; the page object composes it into product behavior.

## Choosing Between Page Commands and Custom Commands

The split is not about how many files you want. It is about vocabulary. Page commands speak in the language of a screen. Custom commands speak in the language of browser automation.

| Behavior | Put it in a page object when | Put it in a custom command when |
|---|---|---|
| Fill a login form | The action depends on login page element names | The same safe field operation applies everywhere |
| Wait for a spinner to disappear | The spinner is page-specific or section-specific | Your app exposes one global busy indicator |
| Attach diagnostics | The data is page-owned, such as cart state | The data is browser-owned, such as cookies, logs, or local storage |
| Select an option from a custom dropdown | The dropdown has screen-specific labels or rules | The component is shared and the interaction pattern is identical |
| Assert a toast | The message is part of one workflow | The toast container and polling behavior are shared across the app |

When in doubt, start with a page command. Promote to a custom command only after a second or third page needs the same browser-level behavior. This keeps your global command list small enough to be learnable.

## Keep Assertions Close to Ownership

Assertions are where page object design gets controversial. Some teams ban assertions inside page objects. Others hide all assertions behind fluent page APIs. Both extremes create trouble.

A useful rule is ownership: a page object may assert facts it owns, especially facts that are structural and repeated. It may assert that a login error message is visible, that a settings toggle is enabled, or that a cart line total contains a value. It should not assert the entire business outcome of a scenario that spans multiple pages.

That distinction keeps failure messages useful. If \`login.expectInvalidPasswordMessage()\` fails, the problem is local. If \`checkout.expectOrderCompleted()\` also verifies email delivery, inventory adjustment, and analytics events, the name is hiding too much.

Nightwatch expectations are chainable, so page assertion commands can stay compact:

\`\`\`js
commands: [
  {
    expectValidationErrors(messages) {
      messages.forEach((message) => {
        this.expect.element('@validationSummary').text.to.contain(message);
      });
      return this;
    },
  },
]
\`\`\`

This code is page-specific because \`@validationSummary\` is part of the page object's element map. A global command would have to accept a selector and message list, which is fine only if validation summaries are uniform across the product.

## Make Page APIs Hard to Misuse

A page object is not just a convenience wrapper. It can enforce sequencing. If a command assumes the page is loaded, have the command wait for the primary element. If a destructive button opens a confirmation dialog, expose \`deleteProjectAndConfirm\` or a separate dialog section instead of requiring tests to remember every click.

The point is not to hide all waiting. The point is to put waits where the application contract is known. A login page knows that the email field is the readiness signal. A report page may know that the export button is enabled only after a query finishes. A generic \`pause(1000)\` knows nothing.

Good page APIs also avoid boolean traps. \`signInAs(email, password, true)\` is unreadable six months later. Prefer options objects, specific method names, or separate commands. \`signInAs(email, password, { rememberMe: true })\` is clear. \`signInAndRemember(email, password)\` is clearer if that flow is common.

## Handling Async Work Without Hiding Flakiness

Nightwatch commands queue browser work, and modern command classes can use async functions. The trap is adding waits that make flakes quieter without making behavior more deterministic.

Use page readiness signals that belong to the product. Examples include a disabled submit button becoming enabled, an \`aria-busy\` attribute changing to \`false\`, a results count updating, or a known toast appearing. Avoid blind sleeps except for debugging. A custom command called \`waitForAppIdle\` is valuable only if it reads a real app signal.

\`\`\`js
// nightwatch/custom-commands/waitForAppIdle.js
module.exports = class WaitForAppIdle {
  async command() {
    await this.api.waitUntil('global app busy flag is false', async function () {
      const result = await this.execute(function () {
        return window.__APP_TEST_STATE__ && window.__APP_TEST_STATE__.busy === false;
      });

      return result.value === true;
    });

    return this;
  }
};
\`\`\`

Only write a command like this if your app intentionally exposes \`window.__APP_TEST_STATE__\` in test builds. Do not scrape random framework internals and call it stable. The command is powerful because it turns a known testability hook into a shared primitive.

## Naming Conventions That Keep Suites Navigable

Nightwatch page object names should match product surfaces, not routes alone. \`login\`, \`checkout\`, \`accountSettings\`, and \`adminUserDrawer\` are easier to scan than \`page1\` or \`dashboard2\`. Commands should be verbs from the user's perspective: \`signInAs\`, \`applyCoupon\`, \`chooseShippingMethod\`, \`expectPaymentDeclined\`.

Global custom commands should be named like browser verbs: \`clearAndSetValue\`, \`saveBrowserDiagnostics\`, \`waitForAppIdle\`, \`selectComboboxOption\`. If a custom command name contains a product noun, challenge it. \`createTrialAccount\` probably belongs in an API fixture helper or page object. \`selectComboboxOption\` belongs in browser automation.

Consistency helps new contributors. It also helps AI coding agents generate useful tests because the suite exposes clear, domain-specific verbs instead of selector soup.

## Folder Structure for Larger Nightwatch Suites

A small suite can keep all pages in one directory. A larger product usually benefits from grouping by product area, while keeping command utilities separate.

\`\`\`text
nightwatch/
  custom-commands/
    clearAndSetValue.js
    saveBrowserDiagnostics.js
    waitForAppIdle.js
  pages/
    auth/
      login.js
      passwordReset.js
    billing/
      checkout.js
      invoiceHistory.js
    admin/
      userList.js
      userDrawer.js
  tests/
    auth/
      login.spec.js
    billing/
      checkout.spec.js
\`\`\`

Do not let folder structure become a second routing system. Group files by how testers and developers reason about the product. If an area is owned by a team, mirrors a bounded domain, or has its own release risk, it is a good grouping candidate.

## Refactoring Existing Selector-Heavy Tests

You do not need a big-bang rewrite. Start with the flows that fail often or block frequent releases. Copy the selectors into a page object, move repeated action sequences into commands, and leave the assertions in the test until you understand which ones are page-owned.

The first pass can be mechanical:

1. Identify repeated selectors in three or more tests.
2. Create a page object with those elements.
3. Move one repeated action into a page command.
4. Replace the tests that use that action.
5. Run only the affected tests and inspect failure messages.

After that, improve the API. Rename \`fillForm\` to \`requestPasswordReset\` or \`createShippingAddress\`. Replace positional arguments with an object. Add a section where repeated row behavior is leaking into tests.

Refactoring page objects is still code design. Small migrations preserve trust. A massive abstraction pass can make every failing test look unfamiliar at once.

## Common Failure Modes

The first failure mode is the god page object. A \`dashboard\` page with every nav item, modal, notification, table, and settings workflow becomes another test framework hidden inside Nightwatch. Split by meaningful surfaces and sections.

The second is the global business command. A command like \`browser.completeCheckout()\` looks convenient until checkout changes. Because it is global, unrelated tests start depending on it. Keep product flows in page objects or higher-level scenario helpers, not browser commands.

The third is assertion laundering. If a test only calls \`page.verifyEverything()\`, you have lost scenario clarity. Page commands should improve readability, not erase what the test proves.

The fourth is over-waiting. Commands that wrap every action in long waits can hide real performance regressions and make failures expensive. Prefer short, meaningful waits tied to UI state.

## A Review Checklist for Nightwatch Abstractions

Before merging a new page object or command, review it like production code.

| Review question | Acceptable answer | Risky answer |
|---|---|---|
| What owns this behavior? | A named page, section, or browser primitive | A vague helper used because it was convenient |
| Can the command be misread? | Method name describes user intent or browser action | Method name hides side effects |
| What readiness signal is used? | A visible element, enabled control, app test hook, or expected URL | Fixed sleep without a product reason |
| Where will a selector change be edited? | One page object or one section | Several tests plus a helper |
| Does the failure message still explain the scenario? | Yes, the test keeps the business assertion visible | No, a broad helper swallows the assertion context |

The best Nightwatch abstractions are boring in the right way. They make tests shorter without making them mysterious. They make selector churn cheap without pretending browser tests are unit tests. They also give AI coding agents a safer surface: generate calls to known page APIs, not ad hoc selectors copied from the DOM.

## Frequently Asked Questions

### Should every Nightwatch page object command return \`this\`?

Return \`this\` when the command is part of a fluent page workflow. If a command intentionally returns data from \`execute\`, a cookie lookup, or a diagnostic helper, return that data and make the method name obvious. Mixing both styles in one method is what causes confusion.

### Can a Nightwatch page object call a global custom command?

Yes. Page commands can call browser commands through \`this.api\`. That is a good pattern when the global command is a browser primitive, such as clearing and setting a field, while the page command supplies the page-owned selector and business name.

### How many assertions should live inside a page object?

Keep page-owned assertions there, especially repeated validation messages, active states, and structural checks. Keep scenario outcomes in the test. A checkout page can assert that the payment error appears; the test should still say whether the order was created or blocked.

### Are sections worth it for small components?

Use sections when they reduce duplicated selector composition or give a repeated region a clear API. A single static wrapper does not need a section. A row, card, modal, or panel with multiple controls often does.

### What is the safest first refactor for an old Nightwatch suite?

Move one noisy flow into one page object, not the whole app. Pick a flow with repeated selectors and frequent maintenance pain. Preserve the existing assertions, then gradually promote repeated page-owned checks into named commands.
`,
};
