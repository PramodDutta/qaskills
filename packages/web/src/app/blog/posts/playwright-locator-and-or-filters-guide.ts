import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Locator and or Filters Guide for Precise Tests',
  description: 'Use this Playwright locator and or filters guide to compose resilient selectors, avoid strictness traps, diagnose ambiguity, and keep UI tests readable.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Playwright Locator and or Filters Guide for Precise Tests

This Playwright locator and or filters guide shows how to express three different selection ideas. Use \`locator.and(otherLocator)\` when an element must satisfy both locator descriptions, \`locator.or(otherLocator)\` when either of two UI alternatives is acceptable, and \`locator.filter(options)\` when you already have a candidate set and need to narrow it by text or a related descendant. These operators are most reliable when the base locators reflect user-visible roles, names, labels, or application-owned test IDs.

The central rule is to compose meaning, not CSS fragments. Start from the element or container a user recognizes, narrow only as far as the action requires, and preserve Playwright's strictness as an ambiguity detector. For broader test-stack context, see the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). For a foundation in user-facing locator contracts, use the [Playwright locator best practices](/blog/playwright-best-practices-locators-2026).

## Read Locator Composition as Set Operations

A locator represents a dynamically resolved set of elements, not a stored element handle. Composition changes that set. Thinking in sets makes the APIs easier to choose and review.

| Operation | Set meaning | Typical question | Main risk |
|---|---|---|---|
| \`and()\` | Intersection | Which button has this role and title? | Two locators may describe different elements |
| \`or()\` | Union | Did the app show the dashboard or a security dialog? | Both alternatives may match |
| \`filter({ hasText })\` | Candidate subset by text | Which row mentions this customer? | Broad text can match nested content |
| \`filter({ has })\` | Candidate subset by descendant | Which card contains this heading? | Inner locator scope can be misunderstood |
| Chained locator | Descendants of current candidates | Which button is inside this row? | Incorrect container boundary |

An action such as \`click()\` generally expects its locator to resolve to exactly one element. If a composed locator produces two, strictness protects the test from choosing arbitrarily. Do not immediately silence the error with \`.first()\`. First decide whether both matches are valid product states, duplicate markup, or an insufficient locator.

Locators re-resolve before each action. If React replaces a button after a state update, the same locator can find the new node. This is one reason to retain locator descriptions rather than querying the DOM manually and storing element references.

## Use and() for Independent Facts About One Element

\`and()\` is valuable when two strong, independent descriptions should identify the same element. For example, a toolbar contains several buttons named Subscribe in different contextual modes, and the active action also has a stable title attribute.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('subscribes from the active toolbar action', async ({ page }) => {
  await page.goto('/topics/testing');

  const subscribe = page
    .getByRole('button', { name: 'Subscribe' })
    .and(page.getByTitle('Subscribe to Testing'));

  await expect(subscribe).toBeVisible();
  await subscribe.click();
  await expect(page.getByText('Subscription active', { exact: true })).toBeVisible();
});
\`\`\`

The two operands are evaluated from the same page or compatible frame context, and their intersection must describe the element itself. \`and()\` is not a way to say “a card and a button inside that card.” For parent-child relationships, locate the card, then locate or filter for its descendant.

Use intersection when it communicates a product contract. Role plus accessible name already provides two semantic facts in one call. Adding another locator should resolve real ambiguity, not decorate every selector.

| Candidate design | Result | Recommendation |
|---|---|---|
| Button role AND title on same button | Valid intersection | Use if title is a stable contract |
| Card test ID AND heading inside card | Different elements | Use \`filter({ has })\` |
| Input label AND placeholder on same input | Valid intersection | Useful during label migration |
| Link name AND URL-shaped CSS selector | Same element, mixed abstraction | Prefer user-facing contract unless URL matters |
| Two test IDs on one node | Usually redundant | Fix markup or use one canonical ID |

An intersection can help during a controlled migration. Suppose an application is adding accessible labels to previously test-ID-only controls. For a short period, a test can assert that both descriptions point to the same node, which turns locator composition into an accessibility contract check.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('checkout action exposes the agreed accessible name', async ({ page }) => {
  await page.goto('/cart');

  const canonicalAction = page
    .getByTestId('checkout-submit')
    .and(page.getByRole('button', { name: 'Place order' }));

  await expect(canonicalAction).toHaveCount(1);
  await expect(canonicalAction).toBeEnabled();
});
\`\`\`

Once the migration is complete, consider whether the role locator alone expresses everything needed. Extra predicates are not automatically more stable. They create more application properties that must remain unchanged.

## Use or() for Explicitly Alternative UI States

\`or()\` describes a union. Its best use is a product flow with two legitimate outcomes at the same checkpoint. An authenticated user may arrive at the dashboard, while an expired security acknowledgment may produce a modal. The test can wait for either and branch based on what is actually visible.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('opens the dashboard after handling an optional security notice', async ({ page }) => {
  await page.goto('/app');

  const dashboard = page.getByRole('heading', { name: 'Your dashboard' });
  const notice = page.getByRole('dialog', { name: 'Security notice' });

  await expect(dashboard.or(notice).first()).toBeVisible();

  if (await notice.isVisible()) {
    await notice.getByRole('button', { name: 'Acknowledge' }).click();
  }

  await expect(dashboard).toBeVisible();
});
\`\`\`

Why use \`.first()\` here? Both dashboard and notice can briefly be present at the same time, which would make an assertion on the union fail strictness. The branch still checks the specific notice and ends with the required dashboard assertion. The use of \`.first()\` is a deliberate synchronization choice, not a blanket ambiguity workaround.

If the two states must be mutually exclusive, assert that contract instead of taking the first match. A helper can wait for the union, then count visible alternatives and fail descriptively when the UI violates the model.

\`\`\`ts
import { expect, type Locator } from '@playwright/test';

async function expectExactlyOneVisible(
  alternatives: readonly [Locator, ...Locator[]],
): Promise<Locator> {
  const union = alternatives.reduce((current, next) => current.or(next));
  await expect(union.first()).toBeVisible();

  const visibility = await Promise.all(
    alternatives.map((locator) => locator.isVisible()),
  );
  const visible = alternatives.filter((_, index) => visibility[index]);

  expect(visible, 'expected exactly one visible UI state').toHaveLength(1);
  return visible[0];
}
\`\`\`

The nonempty tuple makes the \`reduce\` call safe at the type boundary. The returned locator remains live and can be asserted or used for further scoping.

Do not use \`or()\` to mask an unknown state. “Success banner or error banner” is not a valid assertion if the scenario expects success. That union will happily pass for a product failure. Alternative locators should represent outcomes that the scenario genuinely accepts, followed by branch-specific behavior.

## Narrow Repeated Containers with hasText

Lists, tables, cards, and menus frequently repeat the same structure. Start with the repeated container and filter it by text that identifies the desired record. Then locate the action inside that narrowed container.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('suspends the Acme Europe workspace', async ({ page }) => {
  await page.goto('/admin/workspaces');

  const workspace = page
    .getByRole('row')
    .filter({ hasText: 'Acme Europe' });

  await expect(workspace).toHaveCount(1);
  await workspace.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'Suspend' }).click();
  await expect(workspace.getByText('Suspended', { exact: true })).toBeVisible();
});
\`\`\`

\`hasText\` checks text within the candidate, including descendant text. That is convenient but can be broader than expected. A row containing “Acme” in one column and “Europe plan” in another also satisfies \`hasText: 'Acme Europe'\` only according to its combined text and whitespace behavior, which may not match the visual separation you intended. When field boundaries matter, use descendant locators with roles or test IDs.

A regular expression can enforce an exact or structured match. Prefer patterns that reflect realistic UI text and avoid brittle whitespace assumptions.

\`\`\`ts
const invoice = page
  .getByRole('row')
  .filter({ hasText: /INV-\\d{4}/ })
  .filter({ hasText: 'Awaiting payment' });

await expect(invoice).toHaveCount(1);
await invoice.getByRole('link', { name: 'Review invoice' }).click();
\`\`\`

The regular expression matches the literal prefix followed by four digits. Multiple filters are applied cumulatively, so the row must contain both an invoice identifier and the status. If those fields have semantic cells, a \`has\` filter is often clearer.

## Express Container Relationships with has and hasNot

The \`has\` option retains candidates that contain an element matching the inner locator. The inner locator is evaluated relative to each candidate, not from the document root. This is ideal for selecting a card by its heading or a row by a particular cell.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('opens the report card owned by Finance', async ({ page }) => {
  await page.goto('/reports');

  const card = page
    .getByTestId('report-card')
    .filter({
      has: page.getByRole('heading', { name: 'Quarterly revenue' }),
    })
    .filter({
      has: page.getByText('Owner: Finance', { exact: true }),
    });

  await expect(card).toHaveCount(1);
  await card.getByRole('link', { name: 'Open report' }).click();
  await expect(page.getByRole('heading', { name: 'Quarterly revenue' })).toBeVisible();
});
\`\`\`

The inner locator must be found inside the candidate card. Do not write an inner locator that begins from an unrelated ancestor and expect Playwright to search upward. CSS has historically made parent selection awkward; locator filtering solves the problem by beginning with the parent candidates and asking which contain the child.

\`hasNot\` performs the complementary check. It is useful when absence is the business discriminator, such as selecting active projects that do not contain an Archived badge.

\`\`\`ts
const activeProjects = page
  .getByTestId('project-card')
  .filter({
    hasNot: page.getByText('Archived', { exact: true }),
  });

await expect(activeProjects).toHaveCount(3);
\`\`\`

The count of three must come from controlled test data. In a shared environment it would be fragile, because another project could change the total. Prefer creating isolated projects or filtering to a test-owned organization before asserting a count.

Some Playwright versions also provide text-negation filtering. Consult the installed Playwright API documentation at https://playwright.dev/docs/api/class-locator for the currently supported filter options. Avoid asking an AI agent to guess an option from naming symmetry.

## Pick Chaining, Filtering, or Intersection Intentionally

Several locator expressions can look similar while encoding different relationships. Reviewers should read left to right and say the relationship aloud.

| Expression shape | Relationship | Plain-language reading |
|---|---|---|
| \`card.getByRole('button')\` | Descendant | A button inside this card |
| \`cards.filter({ has: heading })\` | Parent contains child | A card containing this heading |
| \`button.and(page.getByTitle(...))\` | Same element | A button that also has this title |
| \`dialog.or(dashboard)\` | Alternative set | The dialog or the dashboard |
| \`rows.filter({ hasText: name })\` | Container text | A row whose subtree includes this name |

Suppose the DOM contains an article, a heading, and a button. If you need the button in the article identified by its heading, filter the article and then chain to the button. Intersecting the article locator and heading locator produces nothing because they are different elements.

\`\`\`ts
const article = page
  .getByRole('article')
  .filter({
    has: page.getByRole('heading', { name: 'API test results' }),
  });

const download = article.getByRole('link', { name: 'Download CSV' });
await expect(download).toHaveAttribute('href', /results\\.csv$/);
\`\`\`

The pattern also communicates scope to Playwright's waiting behavior. The link is resolved inside the matching article each time it is used. A long global CSS selector may reach the same node today, but it hides the product relationships that make failures understandable.

## Preserve Strictness as a Test Signal

Playwright locators are strict for operations that imply one target. If \`getByRole('button', { name: 'Delete' })\` finds two visible buttons, \`click()\` fails instead of choosing one. That is usually the right outcome. The application may have duplicated controls, the test may have ignored container scope, or a transition may have left two screens mounted.

Use \`count()\` and targeted assertions during diagnosis:

\`\`\`ts
const deleteButtons = page.getByRole('button', { name: 'Delete' });

console.log('delete button count:', await deleteButtons.count());
await expect(page.getByRole('dialog', { name: 'Delete project' })).toBeVisible();

const dialog = page.getByRole('dialog', { name: 'Delete project' });
const confirmDelete = dialog.getByRole('button', { name: 'Delete' });
await expect(confirmDelete).toHaveCount(1);
await confirmDelete.click();
\`\`\`

This repair identifies the intended container. By contrast, \`deleteButtons.last().click()\` bakes current DOM order into the test without explaining why the last one is correct.

There are legitimate uses for \`.first()\`, \`.last()\`, and \`.nth()\`: asserting ordering itself, selecting a carousel item by position, or synchronizing on an alternative union as shown earlier. Make the positional meaning explicit in the test name and assertions. Position is weak when a stable user-visible identity exists.

## Avoid Cross-Frame and Scope Mistakes

Locators in composition need compatible search contexts. A locator inside an iframe and a locator on the top-level page do not suddenly become a meaningful intersection. Enter the frame with \`frameLocator()\`, then build relationships within that frame.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('confirms payment inside the hosted checkout frame', async ({ page }) => {
  await page.goto('/checkout');

  const checkout = page.frameLocator('[title="Hosted checkout"]');
  const confirmation = checkout.getByRole('heading', { name: 'Payment confirmed' });
  const challenge = checkout.getByRole('heading', { name: 'Verify payment' });

  await expect(confirmation.or(challenge).first()).toBeVisible();

  if (await challenge.isVisible()) {
    await checkout.getByLabel('Verification code').fill('123456');
    await checkout.getByRole('button', { name: 'Verify' }).click();
  }

  await expect(confirmation).toBeVisible();
});
\`\`\`

The code uses an illustrative verification code in a controlled test environment. Production payment challenges should never be bypassed or hard-coded. The important locator point is that both alternatives share the frame context.

Scope mistakes also occur with \`has\`. If the inner locator effectively points outside the candidate, no candidate matches. Reduce the expression: assert the base candidate count, assert the inner locator independently where appropriate, then reintroduce the filter. Playwright's locator highlighting and trace viewer can show what each stage matched.

## Diagnose an or() Strictness Failure

A realistic test waits for either a “Report ready” status or a “Generation failed” alert:

\`\`\`ts
const ready = page.getByText('Report ready', { exact: true });
const failed = page.getByRole('alert').filter({ hasText: 'Generation failed' });

await expect(ready.or(failed)).toBeVisible();
\`\`\`

It passes locally but intermittently fails in CI with a strict-mode error showing both nodes. The product briefly renders the failure alert from the first request while an automatic retry completes and renders the ready status. The locator accurately exposes two simultaneous states. The defect is not “Playwright or is flaky.” The UI has a stale alert or the test's state model permits overlap.

Diagnosis:

1. Open the Playwright trace and inspect the DOM at the failed assertion.
2. Check the counts of \`ready\` and \`failed\` separately.
3. Confirm whether both are visible or one is hidden but still relevant to matching.
4. Review application request logs to identify overlapping attempts.
5. Decide the intended product rule: mutually exclusive states or transient overlap.

If overlap is valid, wait on \`ready.or(failed).first()\`, inspect \`failed.isVisible()\`, and make the branch outcome explicit. If overlap is invalid, keep the strict failure and fix the stale alert. What people get wrong is adding \`.first()\` before deciding which contract applies. That can convert a valuable UI-consistency signal into nondeterministic branching.

## Build Locator Helpers That Retain Meaning

Page objects and component helpers should return locators, not hide every assertion and action behind procedural methods. Returning a narrowed container lets tests express scenario-specific behavior while centralizing structure.

\`\`\`ts
import type { Locator, Page } from '@playwright/test';

export class OrdersTable {
  readonly rows: Locator;

  constructor(private readonly page: Page) {
    this.rows = page.getByRole('row').filter({
      has: page.getByRole('cell'),
    });
  }

  rowForOrder(orderId: string): Locator {
    return this.rows.filter({
      has: this.page.getByRole('cell', { name: orderId, exact: true }),
    });
  }
}
\`\`\`

The helper begins with rows containing cells, which excludes a header row only if that header uses columnheader elements rather than cells. Confirm the application's accessibility tree rather than assuming markup. The order ID is matched as an exact accessible name within a cell, reducing accidental matches against notes or totals.

Avoid helpers named \`getElement\` that accept arbitrary selector strings. They discard the domain language that locator composition can preserve. Prefer \`rowForOrder\`, \`cardOwnedBy\`, or \`dialogForPolicy\`. An AI coding agent given these contracts is more likely to reuse intended abstractions than invent new CSS paths.

## Review Composed Locators with a Focused Checklist

When a pull request introduces \`and()\`, ask whether both operands describe the same node. For \`or()\`, ask whether both outcomes are acceptable and what happens if both appear. For \`filter()\`, ask whether the base candidates are the intended containers and whether the inner locator is relative to them.

Then check data isolation. A perfect locator still fails if a shared environment contains two customers with the same display name. Stable selectors do not replace controlled fixtures. Create test-owned records with unique identifiers, but keep visible assertions focused on user meaning.

Finally, test the failure message. Temporarily change the expected name locally and inspect the trace or assertion output. A locator such as “row containing cell named ORD-1042” creates a useful diagnostic. A generated CSS chain with multiple \`:nth-child\` segments creates repair work.

Keep operator depth modest. If a locator has several filters, intersections, positional selections, and a union, split it into named intermediate locators. Names expose the intended sets and allow count assertions at the boundary where ambiguity enters.

The goal is not the shortest expression. It is a locator whose set logic, user meaning, and accepted UI states are obvious to the next engineer.

## Frequently Asked Questions

### When should I use and() instead of filter({ has })?

Use \`and()\` when both locators must identify the same element, such as a button that also has a particular title. Use \`filter({ has })\` when you start with parent candidates and want only those containing a matching descendant, such as a card containing a named heading. If one operand describes the parent and the other describes its child, intersection is the wrong relationship. Say the locator aloud before choosing the operator.

### Why does an or() locator cause a strict-mode violation?

\`or()\` forms a union, so it can match both alternatives. An operation requiring one target fails when both resolve. Determine whether simultaneous matches are valid. If overlap is expected for synchronization, assert visibility on \`union.first()\`, then inspect and handle the specific alternatives. If states should be mutually exclusive, preserve the failure and fix either the product or locator model. Do not add \`.first()\` reflexively, because it can hide contradictory UI.

### Does hasText match text in descendant elements?

Yes. Filtering with \`hasText\` considers text within the candidate's subtree, which makes it convenient for rows and cards but sometimes broader than intended. If column or field boundaries matter, use \`filter({ has: ... })\` with a semantic descendant such as a cell, heading, or test ID. Use exact text or a carefully scoped regular expression when appropriate, and assert the resulting candidate count in controlled test data.

### Can I combine and(), or(), and filter() in one locator?

You can compose them, but each additional operation should express a clear set relationship. Deeply nested composition is difficult to diagnose and may hide an incorrect state model. Prefer named intermediate locators, assert counts at meaningful boundaries, and keep alternative-state branching explicit. Also ensure operands share a compatible page or frame context. If the final expression needs positional selection, document why position is part of the product contract rather than a shortcut around ambiguity.
`,
};
