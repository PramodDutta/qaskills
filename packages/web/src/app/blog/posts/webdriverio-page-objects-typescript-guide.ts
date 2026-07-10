import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'WebdriverIO Page Objects with TypeScript',
  description:
    'Learn WebdriverIO Page Objects with TypeScript using typed selectors, component objects, waits, and maintainable test flows for real UI suites.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# WebdriverIO Page Objects with TypeScript

A checkout button that moved from a footer to a sticky panel should not force fifty spec files to learn a new selector. That is the practical reason Page Objects still matter in WebdriverIO: they keep UI knowledge close to the screen, while tests keep the business story readable.

TypeScript changes the design pressure. A JavaScript page object can hide messy selectors, but a TypeScript page object can also protect call sites from passing the wrong value, returning a stale element, or mixing sync-looking code with WebdriverIO's promise-based browser commands. The difference is not academic. Large WebdriverIO suites usually fail from ordinary entropy: a selector copied into three specs, a wait added in the wrong layer, a helper that returns \`any\`, or a component that behaves differently on mobile but is still modeled as a single button.

This guide assumes you already know how to launch WebdriverIO and write a spec. The focus is the engineering layer between a test and the browser: typed page classes, reusable component objects, selectors that survive redesign, and page methods that describe user intent without becoming a second application.

Use this alongside a broader [WebdriverIO testing complete guide](/blog/webdriverio-testing-complete-guide) when you are setting up the framework itself, and pair it with [WebdriverIO visual service blockout guide](/blog/webdriverio-visual-service-blockout-guide) when page objects need to expose stable regions for screenshots.

## Model the Screen Boundary, Not Every DOM Node

The smallest useful page object is not a mirror of the HTML. If a product page contains forty elements and a test only needs search, filtering, and adding to cart, modeling all forty creates maintenance without value. A page object earns its keep when it names behavior at the same level a test cares about.

In WebdriverIO, element getters are lazy. A getter such as \`get emailInput() { return $('#email'); }\` does not query the DOM until the test awaits an element command. That laziness is useful because it avoids storing stale references during navigation and rerendering. It also means getters should stay cheap and side-effect free. Avoid getters that wait, click, or derive application state through several browser calls. Put behavior in explicit methods where the async boundary is visible.

The base class below is deliberately small. It gives every page an \`open\` method and a \`waitUntilReady\` contract, but it does not become a dumping ground for arbitrary browser helpers. Shared helpers are useful when they encode a real pattern, not when they become a second global API.

\`\`\`ts
// test/pageobjects/page.ts
import { browser } from '@wdio/globals';

export abstract class Page {
  protected abstract readonly path: string;
  protected abstract waitUntilReady(): Promise<void>;

  async open(query = ''): Promise<void> {
    await browser.url(\`\${this.path}\${query}\`);
    await this.waitUntilReady();
  }
}
\`\`\`

The \`protected abstract\` shape is doing useful work. A new page object cannot compile until it declares a route and a readiness condition. That is better than letting every spec decide whether the page has loaded.

## Typed Getters and User-Level Methods

Selectors are implementation details, but they should not be invisible magic. A page object should make selectors discoverable to maintainers and expose methods that match user actions. For a login screen, the public API should read like \`loginPage.signIn(email, password)\`, not \`loginPage.email.setValue(...)\` repeated in every test.

\`\`\`ts
// test/pageobjects/login.page.ts
import { $, expect } from '@wdio/globals';
import type { ChainablePromiseElement } from 'webdriverio';
import { Page } from './page';

export class LoginPage extends Page {
  protected readonly path = '/login';

  private get emailInput(): ChainablePromiseElement {
    return $('[data-testid=\"login-email\"]');
  }

  private get passwordInput(): ChainablePromiseElement {
    return $('[data-testid=\"login-password\"]');
  }

  private get submitButton(): ChainablePromiseElement {
    return $('button[type=\"submit\"]');
  }

  get errorBanner(): ChainablePromiseElement {
    return $('[role=\"alert\"]');
  }

  protected async waitUntilReady(): Promise<void> {
    await expect(this.emailInput).toBeDisplayed();
    await expect(this.submitButton).toBeClickable();
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.setValue(email);
    await this.passwordInput.setValue(password);
    await this.submitButton.click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.errorBanner).toHaveText(expect.stringContaining(message));
  }
}

export const loginPage = new LoginPage();
\`\`\`

Two details are worth copying. First, most element getters are private. Tests should not depend on the email selector unless a test truly asserts something about the email field. Second, the assertion method accepts the message as a parameter. That keeps the page object honest: it does not decide the business rule, it only knows how the login screen displays an error.

## Choosing Selectors That Survive Product Work

WebdriverIO supports CSS selectors, text selectors, accessibility selectors, and framework-specific strategies depending on setup. Page objects should not pretend all selectors have the same maintenance cost. A selector that names user-facing semantics is usually stronger than one that follows layout, but a test id can be the clearest contract when text is localized or design changes frequently.

| Selector style | Example | Good fit | Main risk |
|---|---|---|---|
| Test id attribute | \`[data-testid=\"submit-order\"]\` | Product flows where QA and developers agree on stable automation hooks | Can drift from accessible names if nobody reviews it |
| ARIA role/name | \`$('button=Pay now')\` or role-based helpers in custom utilities | Controls where accessible name is part of the contract | Localization and copy experiments can require test updates |
| Visible text | \`$('=Reset password')\` | Short smoke tests over static copy | Fragile when marketing or UX changes wording |
| Structural CSS | \`.panel > div:nth-child(2) button\` | Rare cases with third-party markup and no stable attributes | Breaks during layout refactors |
| Input attributes | \`input[name=\"email\"]\` | Forms with stable field names | Weak for component libraries that generate names |

For TypeScript suites, define selector policy in code review, not in a wiki nobody reads. If a page object introduces \`nth-child\`, the reviewer should ask whether the application can expose a test id or accessible role. If the answer is no because the markup comes from a vendor widget, wrap that selector in a component object with a clear name and keep the damage contained.

## Component Objects for Repeated Widgets

The first scale problem is not pages, it is repeated page fragments. Navigation bars, date pickers, toast stacks, product cards, and table rows appear on multiple screens. If every page object models the same toast message differently, tests become inconsistent even when the UI is consistent.

Component objects work best when they receive a root element. That keeps their selectors scoped and prevents accidental matches elsewhere on the screen.

\`\`\`ts
// test/pageobjects/components/product-card.ts
import { expect } from '@wdio/globals';
import type { ChainablePromiseElement } from 'webdriverio';

export class ProductCard {
  constructor(private readonly root: ChainablePromiseElement) {}

  private get title(): ChainablePromiseElement {
    return this.root.$('[data-testid=\"product-title\"]');
  }

  private get addButton(): ChainablePromiseElement {
    return this.root.$('[data-testid=\"add-to-cart\"]');
  }

  async addToCart(): Promise<void> {
    await expect(this.addButton).toBeClickable();
    await this.addButton.click();
  }

  async expectNamed(expectedName: string): Promise<void> {
    await expect(this.title).toHaveText(expectedName);
  }
}

// test/pageobjects/catalog.page.ts
import { $$, expect } from '@wdio/globals';
import type { ChainablePromiseArray } from 'webdriverio';
import { Page } from './page';
import { ProductCard } from './components/product-card';

export class CatalogPage extends Page {
  protected readonly path = '/catalog';

  private get cards(): ChainablePromiseArray {
    return $$('[data-testid=\"product-card\"]');
  }

  protected async waitUntilReady(): Promise<void> {
    await expect(this.cards[0]).toBeDisplayed();
  }

  async productAt(index: number): Promise<ProductCard> {
    const card = await this.cards[index];
    await expect(card).toBeDisplayed();
    return new ProductCard(card);
  }
}
\`\`\`

The component constructor accepts the WebdriverIO element rather than a selector string. That lets the catalog page decide how to find product cards, while the component decides how to operate inside one card. When product cards appear in recommendations, search results, and wish lists, those page objects can reuse the same component without inheriting from the catalog page.

## Where Waits Belong

Waits are part of page object design, not an afterthought. A test that calls \`pause(1000)\` after every click is telling you the page object failed to describe readiness. WebdriverIO's \`expect-webdriverio\` assertions already wait by default, so many explicit \`waitUntil\` calls can be replaced with assertions against the next observable state.

Use waits at boundaries:

| Boundary | Better page object behavior | Avoid |
|---|---|---|
| Opening a page | Wait for a stable landmark or primary action | Waiting for arbitrary network silence |
| Submitting a form | Click, then assert the success route, banner, or validation state | Returning immediately after click |
| Updating a filter | Wait for the list count, URL query, or selected chip | Sleeping for animation duration |
| Closing a modal | Assert modal root is not displayed or removed | Clicking outside and hoping |
| Download action | Wait on WebdriverIO download helper or filesystem assertion where configured | Assuming the button click is enough |

Page methods should either complete the user action or make it clear they only perform a low-level step. A method named \`submit\` can click and return. A method named \`createAccount\` should wait until the account is created or a validation failure is visible. Ambiguous methods are where flakiness hides.

## Keeping Assertions Out of the Wrong Layer

There is a common argument that page objects should never assert. In practice, absolute rules create awkward code. The better distinction is between UI-state assertions and business assertions.

A page object can assert that an error banner is visible, a table row contains a label, or a submit button is disabled. Those are assertions about how the page exposes information. A spec should assert that the specific plan, price, permission, or workflow result is correct. That keeps the test scenario in the spec and the UI mechanics in the page object.

For example, \`billingPage.expectInvoiceStatus('Paid')\` is fine because the page object knows how invoice status is rendered. \`billingPage.expectEnterpriseUpgradeRules()\` is suspicious because the page object now owns policy. Keep policy in fixtures, service builders, or the test itself.

## Page Object API Review Checklist

| Review question | Why it matters | Example correction |
|---|---|---|
| Does the public method name describe a user action? | Specs should read like workflow prose | Rename \`clickBlueButton\` to \`confirmRefund\` |
| Are selectors private unless specs need them? | Prevents selector leakage into tests | Expose \`expectError\`, not \`errorBanner\` |
| Does navigation wait for a stable page landmark? | Avoids first-action flake | Wait for heading and primary CTA |
| Is the component scoped to a root element? | Prevents cross-card selector matches | Use \`root.$(...)\` inside row/card objects |
| Are retries hidden from business tests? | Tests should not own animation timing | Put wait logic in the action method |
| Are return types explicit? | Stops accidental \`any\` from spreading | Return \`Promise<ProductCard>\` instead of untyped values |
| Does the method avoid reimplementing app logic? | Page objects should not become product engines | Let the spec decide expected eligibility |

## Spec Files That Stay Readable

The payoff appears in specs. A page object suite should make a test shorter, but more importantly, it should make the failure location obvious. When a sign-in test fails, the stack should point to \`signIn\` or \`expectError\`, not a random selector buried in the spec.

\`\`\`ts
// test/specs/login.e2e.ts
import { loginPage } from '../pageobjects/login.page';
import { dashboardPage } from '../pageobjects/dashboard.page';

describe('login', () => {
  it('rejects a locked account without navigating away', async () => {
    await loginPage.open();
    await loginPage.signIn('locked@example.com', 'correct-password');
    await loginPage.expectError('Your account is locked');
  });

  it('opens the dashboard for an active user', async () => {
    await loginPage.open();
    await loginPage.signIn('active@example.com', 'correct-password');
    await dashboardPage.expectLoadedFor('active@example.com');
  });
});
\`\`\`

Notice that the test does not know whether the dashboard uses a toast, a heading, an avatar menu, or a session endpoint to show the active user. The dashboard page owns that UI evidence. The spec owns the scenario.

## Handling Responsive and Role-Based Screens

Page objects become awkward when one route has multiple layouts. A mobile catalog may use a bottom sheet for filters while desktop uses a sidebar. An admin user may see controls that a member cannot. Do not solve this by adding Boolean flags to every method. Model the variation explicitly.

One option is a shared interface with separate implementations:

\`\`\`ts
export interface FilterPanel {
  chooseBrand(name: string): Promise<void>;
  apply(): Promise<void>;
}

export class DesktopFilterPanel implements FilterPanel {
  async chooseBrand(name: string): Promise<void> {
    await $('[data-testid=\"desktop-filter\"] input[value=\"' + name + '\"]').click();
  }

  async apply(): Promise<void> {
    await $('[data-testid=\"apply-desktop-filters\"]').click();
  }
}

export class MobileFilterPanel implements FilterPanel {
  async chooseBrand(name: string): Promise<void> {
    await $('[data-testid=\"open-filter-sheet\"]').click();
    await $('[data-testid=\"mobile-filter\"] input[value=\"' + name + '\"]').click();
  }

  async apply(): Promise<void> {
    await $('[data-testid=\"apply-mobile-filters\"]').click();
  }
}
\`\`\`

This design is more verbose than a single method with branches, but it keeps selectors honest. When the mobile sheet changes, you know which class to update. When a shared behavior changes, the interface tells you what both implementations must still support.

## Common Failure Modes in TypeScript Page Objects

The first failure mode is overexposure. A page object exports every selector, so specs still perform low-level UI work. The second is underexposure, where a page object exports only huge methods such as \`completeCheckoutWithValidUserAndCoupon\`, making tests unable to express edge cases. Good page objects sit between those extremes.

The third failure mode is type theater. Adding TypeScript annotations to functions returning \`any\` does not improve maintainability. Prefer explicit return types, avoid generic helpers that erase element types, and let the compiler complain when a component API changes.

The fourth is hiding too much waiting. If a page method swallows failures with broad retries, the suite may pass slowly while the product is broken. Wait for specific states and let failures be loud. A failed \`toBeClickable\` on a named button is useful. A timeout in a generic \`retryAction\` helper is not.

## Migrating a Selector-Heavy Suite Gradually

Do not pause delivery to rewrite every spec into page objects. Pick one unstable workflow, create page and component objects for that workflow, and stop adding new raw selectors to the touched specs. When an old selector fails, move only that local behavior behind the page object instead of performing a broad refactor. This keeps the migration tied to real maintenance pain.

The useful review rule is simple: a spec may describe data, role, and expected outcome, but it should not know the DOM path for a control that belongs to an existing page object. Over time, the most volatile selectors move behind typed methods first. Stable one-off admin screens can wait.

## Frequently Asked Questions

### Should WebdriverIO page objects be classes or plain objects?

Classes work well because WebdriverIO's lazy element getters map naturally to class getters, inheritance can provide a small route/readiness contract, and component objects can hold a root element. Plain objects are fine for tiny suites, but they become harder to type once you need shared components or responsive variants.

### Should selectors use data-testid or accessible names?

Use accessible names when the name is part of the user contract and stable in the locale under test. Use test ids for controls affected by localization, frequent copy tests, or icon-only UI. The worst choice is layout CSS that encodes DOM shape instead of intent.

### Where should WebdriverIO assertions live?

Keep business assertions in specs and UI-state assertions in page objects. A page object can assert that a toast contains text or a modal disappeared. A spec should decide which invoice status, permission, or validation rule is expected.

### Do page objects make tests slower?

Not by themselves. Slow suites usually come from unnecessary navigation, broad waits, and repeated setup. Page objects can improve speed when they centralize readiness checks and remove defensive pauses, but they can hurt speed if every method waits for unrelated page state.

### How big should a page object be before splitting it?

Split when a repeated fragment has its own behavior or when one class mixes unrelated regions. Product cards, table rows, date pickers, and filter drawers are good component object candidates. Do not split just to reduce line count if the page still has one coherent workflow.
`,
};
