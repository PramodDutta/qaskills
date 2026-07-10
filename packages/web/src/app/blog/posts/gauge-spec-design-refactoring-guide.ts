import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Gauge Spec Design and Refactoring Guide',
  description:
    'Improve Gauge spec design with cleaner acceptance flows, reusable steps, tag strategy, refactoring tactics, and maintainable Java or JS suites.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Gauge Spec Design and Refactoring Guide

A Gauge suite usually starts tidy: one spec, a few readable steps, and a happy team because product owners can scan the behavior. Six months later, the same suite has duplicate login phrases, tags that mean different things in different folders, and step implementations full of branching because one English sentence is trying to serve five workflows. The problem is rarely Gauge itself. The problem is spec design drifting without refactoring discipline.

Gauge is intentionally lightweight. Specs are Markdown files, scenarios are executable examples, and step implementations live in the language runner you choose. That freedom is useful, but it also means the suite will reflect the habits of the team. If everyone writes steps at a different abstraction level, the specs become a second codebase with all the usual maintenance problems: duplication, unclear ownership, slow feedback, and brittle setup.

This guide is for teams already using Gauge who want sharper specs and cleaner refactoring. It assumes you understand basic Gauge concepts. For a broader introduction, use the [Gauge testing complete guide](/blog/gauge-testing-complete-guide). If your open question is whether Gauge or Cucumber better fits your acceptance testing style, the [Gauge vs Cucumber BDD comparison](/blog/gauge-vs-cucumber-bdd-frameworks) covers that tradeoff directly.

## Writing Specs Around Decisions, Not Screens

Gauge specs should describe business decisions and observable outcomes. They should not read like a tour through every input on a page. The more a spec mirrors the UI, the more often it changes for harmless interface work. The more it mirrors the decision being tested, the longer it remains useful.

Consider a checkout flow. A weak scenario says "Click shipping tab, type postal code, click continue, click payment tab." A better scenario says "A customer with a domestic address receives standard shipping options." The step implementation can use the current UI, API, or fixture helpers. The spec stays focused on what the business cares about.

| Spec smell | What it usually means | Refactoring move |
|---|---|---|
| Step starts with "Click" or "Type" | Scenario is bound to UI mechanics | Raise the step to user intent or domain state |
| Same setup repeated in every scenario | Context belongs in a reusable concept or helper | Extract setup steps and data builders |
| Scenario name repeats the first step | Scenario has no distinct claim | Rename around the rule under test |
| Step has many optional words | One implementation is hiding unrelated flows | Split into narrower steps |
| Tags encode execution order | Suite depends on accidental sequencing | Fix isolation and remove ordering assumptions |

Gauge gives you Markdown headings, tables, and tags. Use them to make the spec readable as a document. The reader should understand the behavior before opening the step implementation.

\`\`\`markdown
# Checkout shipping eligibility

Tags: checkout, shipping, acceptance

## Domestic customers see standard shipping

* A customer cart contains "Wireless Keyboard"
* The delivery address is in "Karnataka"
* The customer reviews shipping methods
* "Standard Delivery" is offered
* "International Priority" is not offered

## Export-restricted items block overseas delivery

Tags: export-control

* A customer cart contains "Lithium Battery Pack"
* The delivery address is in "Germany"
* The customer reviews shipping methods
* The checkout blocks delivery with reason "Export restricted item"
\`\`\`

The step names are not magic prose. They are API design. Treat them as public methods called by non-programmer readers. If you would not put a method named \`clickContinueAndMaybeWaitForSpinner\` in production code, do not put that concept into a Gauge spec either.

## Step Vocabulary That Can Survive Refactors

Gauge step implementations are where readability meets engineering reality. In Java, a step is mapped with the \`@Step\` annotation. A clean step signature has a clear phrase, a small number of parameters, and no hidden branching based on vague text.

\`\`\`java
package specs.checkout;

import com.thoughtworks.gauge.Step;
import org.junit.jupiter.api.Assertions;

public class ShippingSteps {
  private final CheckoutDriver checkout = new CheckoutDriver();

  @Step("A customer cart contains <productName>")
  public void cartContainsProduct(String productName) {
    checkout.createCartWithProduct(productName);
  }

  @Step("The delivery address is in <region>")
  public void deliveryAddressIsIn(String region) {
    checkout.setDeliveryRegion(region);
  }

  @Step("The customer reviews shipping methods")
  public void customerReviewsShippingMethods() {
    checkout.openShippingMethods();
  }

  @Step("<methodName> is offered")
  public void shippingMethodIsOffered(String methodName) {
    Assertions.assertTrue(
      checkout.availableShippingMethods().contains(methodName),
      () -> "Expected shipping method to be offered: " + methodName
    );
  }

  @Step("<methodName> is not offered")
  public void shippingMethodIsNotOffered(String methodName) {
    Assertions.assertFalse(
      checkout.availableShippingMethods().contains(methodName),
      () -> "Expected shipping method to be absent: " + methodName
    );
  }
}
\`\`\`

The implementation delegates to a driver. That driver might use Playwright, Selenium, REST calls, or direct test fixtures. Gauge should not force every step method to know low-level automation details. Keeping the driver behind a domain API makes step refactoring safer.

Parameter design matters. If a step takes a giant string such as "domestic valid premium customer with coupon," you have created a mini language with no parser. Prefer one concept per parameter, or use a Gauge table when the data has structure.

## Tables for Data, Not Hidden Control Flow

Gauge tables are useful when the scenario needs multiple rows of domain data. They become harmful when a table tries to encode an entire workflow. A table should answer "what data is involved?" rather than "what should the runner do next?"

Good table usage:

\`\`\`markdown
## Bulk discount is applied by product family

* The cart contains products
  | sku      | family     | quantity |
  | KB-101   | keyboard   | 2        |
  | MS-220   | mouse      | 1        |
* The customer applies coupon "DESKSET"
* The cart discount total is "15.00"
\`\`\`

A Java step can receive the table through Gauge's \`Table\` type and convert rows into domain objects:

\`\`\`java
package specs.checkout;

import com.thoughtworks.gauge.Step;
import com.thoughtworks.gauge.Table;
import com.thoughtworks.gauge.TableRow;
import java.util.List;

public class CartSteps {
  private final CheckoutDriver checkout = new CheckoutDriver();

  @Step("The cart contains products <products>")
  public void cartContainsProducts(Table products) {
    List<TableRow> rows = products.getTableRows();

    for (TableRow row : rows) {
      checkout.addProduct(
        row.getCell("sku"),
        row.getCell("family"),
        Integer.parseInt(row.getCell("quantity"))
      );
    }
  }

  @Step("The cart discount total is <amount>")
  public void cartDiscountTotalIs(String amount) {
    checkout.assertDiscountTotal(amount);
  }
}
\`\`\`

Bad table usage is easy to spot. If a table has columns like \`action\`, \`target\`, and \`expected\`, you are rebuilding keyword-driven testing inside Gauge. That usually produces specs that are neither readable acceptance tests nor maintainable automation code.

## Tags as Execution Metadata

Tags should express stable selection criteria: feature area, risk, layer, capability, or ownership. Tags should not become a junk drawer for temporary notes. A mature Gauge suite often has a short tag taxonomy documented in the repository.

| Tag family | Example | Use it for | Avoid using it for |
|---|---|---|---|
| Product area | \`checkout\`, \`billing\` | Ownership, dashboards, targeted runs | Exact page names |
| Risk tier | \`smoke\`, \`critical-path\` | Fast gates and release checks | Marking every test as important |
| Test layer | \`api\`, \`ui\` | Routing to the right runner | Hiding mixed concerns |
| Data need | \`requires-seeded-catalog\` | Environment preparation | Test ordering |
| Defect link | \`regression-4821\` | Preserving a fixed bug example | Permanent replacement for readable names |

Gauge command line filtering supports tag expressions, so the taxonomy affects day-to-day execution. Keep expressions simple enough that engineers can reason about them during incidents.

\`\`\`bash
gauge run specs
gauge run specs --tags "smoke"
gauge run specs --tags "checkout & !slow"
gauge run specs/checkout --tags "critical-path"
\`\`\`

When a tag no longer drives selection, reporting, ownership, or environment setup, delete it. Tags are not free. Every stale tag encourages someone to copy it into another spec because it looks official.

## Refactoring Without Breaking Trust

Refactoring Gauge specs is sensitive because the files are often read by product managers, QA leads, and developers. A large rename can look like behavioral churn even when execution is unchanged. Work in small slices and preserve the intent of each scenario.

Start with duplicate step phrases. Run a search for near-identical sentences: "User logs in", "The user is logged in", "I login as user", "Login as valid customer." Pick one phrase that matches your domain language. Keep the implementation behind that phrase narrow. Replace call sites a few specs at a time.

Next, split overloaded steps. If a step method contains a switch statement on a parameter called \`type\`, it is probably doing too much. A step named "The customer completes checkout as <type>" may hide guest checkout, saved card checkout, wallet checkout, and invoice checkout. These deserve separate scenario steps because the risks are different.

Then review setup. Slow Gauge suites often spend most of their time building state through the UI. If the behavior under test is shipping eligibility, create the cart and customer state through APIs or fixtures, then reserve the UI for the decision you are validating. The spec can still describe the state in business language.

## Keeping Concepts Useful

Gauge supports concepts, reusable groups of steps stored in concept files. Concepts are helpful when several specs genuinely share the same domain setup. They are harmful when used to hide five important assertions behind one friendly phrase.

Use a concept for stable setup:

\`\`\`markdown
# Customer with paid subscription

* A customer account exists with plan "Pro"
* The account has an active payment method
* The billing cycle started on "2026-07-01"
\`\`\`

Do not use a concept to flatten a whole scenario into one line. If the reader cannot see the rule, the concept is too broad. A good test is whether a failure inside the concept points to a setup concern or to the behavior being tested. If it points to behavior, keep the steps visible in the scenario.

## Reviewing Specs Like Code

Spec review should be explicit. Do not merge Gauge changes by only checking that the suite passes. Review the language, abstraction level, tags, data setup, and failure messages. Specs are production assets because release confidence depends on them.

The reviewer should ask:

| Review question | Why it matters |
|---|---|
| Does the scenario name state a rule or risk? | Reports need to explain what broke |
| Can a product stakeholder read it without runner knowledge? | Gauge's value is shared understanding |
| Are setup steps cheaper than UI setup where possible? | Slow acceptance suites get ignored |
| Does each assertion fail with useful context? | Debug time dominates maintenance cost |
| Are new tags from the documented taxonomy? | Tag sprawl ruins selective execution |

Also review deletion. Old acceptance tests often survive because nobody knows whether they still matter. When a scenario duplicates lower-level coverage and no longer describes a release risk, remove it or move the behavior to the right layer. A smaller Gauge suite with clear ownership beats a large suite that everyone fears touching.

## Runner Boundaries and Step Ownership

Gauge supports multiple language runners, and larger organizations sometimes have Java specs in one area and JavaScript specs in another. That is workable, but step ownership must be clear. A shared phrase such as "The user is authenticated" should not mean browser login in one runner, direct token creation in another, and database insert in a third unless the difference is intentional and documented.

Create ownership around domains, not around file extensions. Checkout steps belong to the checkout team or quality group even if the implementation is Java. Account-management steps belong to that domain even if the runner is JavaScript. This prevents a platform team from becoming the accidental owner of every vague reusable step.

When a step is shared across specs, give it a compatibility mindset. Changing the phrase, parameter meaning, or setup behavior can break several product areas. Search usage before refactoring. If the behavior must change, create a new phrase and migrate call sites deliberately. That is slower than editing one method, but it avoids hidden semantic changes in acceptance tests.

Keep runner-specific helper code out of spec vocabulary. A Gauge spec should not reveal that one team uses Selenium and another uses REST Assured. Those choices live under drivers and fixtures. The spec should reveal the business state and expected result.

## A Refactoring Sequence for a Messy Suite

When a Gauge suite is already messy, do not start by rewriting every spec. Start with measurement. List the most repeated step phrases, the slowest specs, the tags used in CI, and the scenarios that fail most often. That gives you an order of attack based on maintenance pain rather than personal preference.

First, standardize setup language in one product area. Checkout, account management, or billing is a better slice than "all login steps everywhere." Pick the dominant phrase, move low-level automation into a driver, and migrate the specs that use that product area. The rest of the repository can keep working while the team learns the new vocabulary.

Second, remove step branching. A step method with several \`if\` blocks usually means the English sentence is too vague. Split it into phrases that match real domain actions. This may increase the number of step definitions, but it reduces the mental cost of each one. A clean suite can have many small steps. The problem is not count. The problem is ambiguity.

Third, move expensive setup down a layer. If twenty specs create the same catalog through the UI, replace that setup with an API or fixture helper and keep one UI scenario that proves the catalog form works. Gauge remains readable because the spec still says the catalog exists. The implementation becomes faster because it stops pretending every behavior needs a browser journey.

Fourth, prune tags. Export all tags, group them by purpose, and delete the ones nobody uses for selection or reporting. Rename tags only when you can update CI commands at the same time. A tag rename that misses one scheduled run can silently drop coverage.

Finally, review failure messages. Refactored steps should fail with domain context: product SKU, account id, visible status, role, and route. A readable spec is wasted if the failure says only "expected true but was false." The goal is not elegant Markdown alone. The goal is a suite that explains product risk quickly when it turns red.

## Frequently Asked Questions

### Should Gauge specs use "I" language?

Only if your team has agreed that it improves readability. Many enterprise suites read better with domain nouns such as "The billing admin" or "A customer." The important rule is consistency. Mixing "I", "user", "customer", and role names makes step reuse messy.

### How do I rename a heavily used Gauge step safely?

Add the new step phrase, delegate it to the same helper, migrate specs in small batches, then remove the old phrase after search shows no remaining usage. Avoid making one annotated method accept every old and new sentence because that preserves the vocabulary problem.

### When should a Gauge table become a fixture file?

Move data out when the table distracts from the rule or contains many rows that are not meaningful to the reader. Keep tables inline when the row values are part of the example and a reviewer should inspect them during spec review.

### Are tags better than folders for organizing a Gauge suite?

Use both for different purposes. Folders provide navigation and ownership. Tags provide execution selection that can cut across folders, such as \`smoke\` or \`requires-seeded-catalog\`. Do not make tags compensate for chaotic file structure.

### How much implementation detail belongs in a step name?

Less than most teams start with. A step name should describe the state, action, or outcome from the user's domain. Put selectors, waits, API endpoints, and retry mechanics in the driver code where engineers can refactor them safely.
`,
};
