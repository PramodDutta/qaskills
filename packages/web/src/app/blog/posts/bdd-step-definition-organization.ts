import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'BDD Step Definition Organization: A Practical Map for Growing Suites',
  description:
    'Master bdd step definition organization with folder maps, naming rules, glue patterns, and failure diagnosis that keep Cucumber-style suites maintainable.',
  date: '2026-08-07',
  category: 'BDD',
  content: `
# BDD Step Definition Organization: A Practical Map for Growing Suites

BDD step definition organization is the difference between a living specification suite and a pile of brittle glue code. When steps live next to the scenarios they support, share clear ownership boundaries, and avoid duplicate phrasing, teams can add features without reopening every definition file. When steps scatter across random folders, share ambiguous regexes, and hide side effects inside \`Given\` clauses, every new story costs more than the last.

This article is a field guide for QA and test-automation engineers who already write Gherkin (or equivalent) and want a concrete organization system. You will get folder layouts, naming conventions, parameter strategies, a failure diagnosis playbook for ambiguous or flaky steps, and runnable TypeScript patterns oriented around Cucumber-style runners and browser automation. If you are still choosing a stack, pair this with the [BDD frameworks comparison for 2026](/blog/bdd-frameworks-comparison-2026) and the [Cucumber BDD tutorial for beginners](/blog/cucumber-bdd-tutorial-beginners).

The goal is not purity. The goal is a suite where a new hire can find the step for "the user submits a valid card," change it safely, and know which domains own which vocabulary.

## Where Step Definitions Belong Relative to Features

Start with one hard rule: every step definition file should answer a single question, "What domain language does this file own?" Domain ownership beats technical layering for most product teams. A file named \`payment.steps.ts\` that owns payment vocabulary is easier to navigate than \`api.steps.ts\` mixed with UI clicks for checkout, invoices, and refunds.

A layout that scales for mid-size products looks like this:

\`\`\`text
features/
  checkout/
    place-order.feature
    apply-coupon.feature
  catalog/
    search-products.feature
  account/
    login.feature
step_definitions/
  support/
    world.ts
    hooks.ts
    parameters.ts
  domains/
    checkout.steps.ts
    catalog.steps.ts
    account.steps.ts
  technical/
    navigation.steps.ts
    network.steps.ts
\`\`\`

Domain files hold product language. Technical files hold browser, time, and network primitives that domains compose. Support files hold World construction, hooks, and custom parameter types. Features stay next to their domain folders so product owners can read scenarios without hunting code.

Some teams prefer feature-local steps:

\`\`\`text
features/
  checkout/
    place-order.feature
    place-order.steps.ts
\`\`\`

That layout works while a feature is experimental. It becomes painful when the phrase "the cart contains 2 items" appears in three feature folders and diverges. Prefer domain aggregation once a phrase is reused more than twice.

### Decision matrix for layout choice

| Team situation | Prefer | Avoid | Why |
| --- | --- | --- | --- |
| Greenfield, 1-2 writers | Feature-local steps | Deep domain trees | Locality beats architecture early |
| 5+ writers, shared phrases | Domain step files | Copy-pasted local steps | One owner per vocabulary |
| Platform team + product teams | Domain + thin technical layer | One global steps dump | Boundaries mirror org ownership |
| Micro-frontends with separate repos | Package per domain, published steps | Monolith step jar forced everywhere | Versioned language contracts |
| Legacy suite with 2k steps | Incremental extract by domain | Big-bang rewrite | Risk stays local |

## Naming Conventions That Survive Team Growth

Names are navigation. Treat step filenames, World properties, and step text as a single style guide.

### File and export naming

- Use \`<domain>.steps.ts\` for product language.
- Use \`<concern>.support.ts\` for helpers that are not steps.
- Export nothing accidental: step files should register steps as side effects of import, or export a \`registerXSteps(world)\` function if your runner supports explicit registration.
- Keep one domain primary per file. If a file needs both catalog and checkout language, split it.

### Step text style

Write steps in the active voice with stable nouns:

- Good: \`When the customer applies coupon "SAVE10"\`
- Weak: \`When coupon is applied\`
- Good: \`Then the order total is 42.00\`
- Weak: \`Then it is correct\`

Prefer explicit actors (\`customer\`, \`admin\`, \`system\`) over pronouns. Prefer business units over UI chrome: "order total" beats "span with class total-amount" in step text. Put CSS and test ids in page objects or locators, not in Gherkin.

### Parameter naming in patterns

Name capture groups for humans reading definitions:

\`\`\`ts
import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

When(
  'the customer applies coupon {string}',
  async function (this: CheckoutWorld, code: string) {
    await this.checkoutPage.applyCoupon(code);
  },
);

Then(
  'the order total is {float}',
  async function (this: CheckoutWorld, expected: number) {
    const total = await this.checkoutPage.readTotal();
    assert.equal(total, expected);
  },
);
\`\`\`

If you use classic regular expressions, double-check escapes in published modules and document each capture. Prefer cucumber expressions with typed parameters when the runner supports them; they reduce regex debt.

## World Construction: Shared State Without a God Object

The World (or equivalent test context) is the shared bag between steps. Poor World design is the root of most "organization" complaints that are actually coupling problems.

### Split World by capability

Compose small interfaces instead of one mega class:

\`\`\`ts
export interface AuthCapability {
  token?: string;
  asCustomer(email: string, password: string): Promise<void>;
  asAdmin(): Promise<void>;
}

export interface CartCapability {
  cartId?: string;
  seedCart(items: Array<{ sku: string; qty: number }>): Promise<void>;
}

export interface CheckoutWorld extends AuthCapability, CartCapability {
  baseUrl: string;
  // browser/page handles live here if UI-driven
}
\`\`\`

Implement capabilities as mixins or explicit composition:

\`\`\`ts
export function createWorld(baseUrl: string): CheckoutWorld {
  const state: { token?: string; cartId?: string } = {};

  return {
    baseUrl,
    get token() {
      return state.token;
    },
    get cartId() {
      return state.cartId;
    },
    async asCustomer(email, password) {
      const res = await fetch(\`\${baseUrl}/api/login\`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        throw new Error(\`login failed: \${res.status}\`);
      }
      const body = (await res.json()) as { token: string };
      state.token = body.token;
    },
    async asAdmin() {
      // load from env, never hardcode secrets in steps
      await this.asCustomer(
        process.env.ADMIN_EMAIL ?? '',
        process.env.ADMIN_PASSWORD ?? '',
      );
    },
    async seedCart(items) {
      if (!state.token) {
        throw new Error('seedCart requires authenticated customer');
      }
      const res = await fetch(\`\${baseUrl}/api/cart\`, {
        method: 'POST',
        headers: {
          authorization: \`Bearer \${state.token}\`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        throw new Error(\`seedCart failed: \${res.status}\`);
      }
      const body = (await res.json()) as { cartId: string };
      state.cartId = body.cartId;
    },
  };
}
\`\`\`

Rules of thumb:

- World holds state and factory methods, not assertions.
- Steps orchestrate; page objects and API clients perform.
- Fail fast when a prerequisite is missing (\`seedCart\` without token).
- Reset World per scenario via hooks so parallel workers do not share tokens.

### Hooks that protect organization

Hooks should enforce isolation, not become a second place for business steps.

\`\`\`ts
import { Before, After, setWorldConstructor } from '@cucumber/cucumber';

setWorldConstructor(function (this: { baseUrl: string }) {
  Object.assign(this, createWorld(process.env.BASE_URL ?? 'http://localhost:3000'));
});

Before(async function (this: CheckoutWorld) {
  // optional: start tracing, create unique test data prefix
});

After(async function (this: CheckoutWorld, { result }) {
  // attach artifacts on failure only
  if (result?.status === 'FAILED') {
    // screenshot, HAR, logs
  }
});
\`\`\`

Keep business preconditions in \`Given\` steps, not in global \`Before\`. Global hooks that always "log in as admin" make scenarios lie about their setup.

## Domain Steps vs Technical Steps

Technical steps are seductive. "I click {string}" and "I fill {string} with {string}" let non-engineers write anything. They also destroy domain language and force every scenario to re-encode the UI.

### Prefer domain steps that hide UI

Domain step:

\`\`\`gherkin
When the customer applies coupon "SAVE10"
Then the order total is 42.00
\`\`\`

Technical step soup:

\`\`\`gherkin
When I click "Apply coupon"
And I fill "Coupon code" with "SAVE10"
And I click "Submit"
Then I see text "42.00"
\`\`\`

The second form couples scenarios to control labels. The first form survives a redesign if the page object updates.

### When technical steps are justified

Use a small technical vocabulary for cross-cutting concerns:

- Navigation: \`Given the customer is on the checkout page\`
- Time: \`When 15 minutes pass\` (with a controllable clock)
- Network: \`Given the payments API returns 503\`
- Accessibility or visual checks that are explicitly technical

Document the technical vocabulary in one file so product authors know what is available without inventing new primitives every week.

### Comparison: domain steps vs technical steps

| Dimension | Domain steps | Technical steps |
| --- | --- | --- |
| Scenario readability | High for product readers | High for QA only |
| Resilience to UI change | High if page objects absorb change | Low |
| Reuse across features | High when nouns are stable | High but noisy |
| Onboarding cost | Learn product language | Learn UI and tool APIs |
| Risk of duplication | Medium (synonyms) | High (many paths to same action) |
| Best owner | Domain squad | Framework/platform squad |

## Parameter Types, Tables, and Doc Strings

Organization is not only folders. Parameter design decides whether steps stay few and expressive or explode into variants.

### Custom parameter types

Centralize enums and identifiers:

\`\`\`ts
import { defineParameterType } from '@cucumber/cucumber';

defineParameterType({
  name: 'orderStatus',
  regexp: /pending|paid|shipped|cancelled/,
  transformer: (s: string) => s as 'pending' | 'paid' | 'shipped' | 'cancelled',
});

Then(
  'the order status is {orderStatus}',
  async function (this: CheckoutWorld, status: 'pending' | 'paid' | 'shipped' | 'cancelled') {
    const actual = await this.checkoutPage.readStatus();
    if (actual !== status) {
      throw new Error(\`expected status \${status}, got \${actual}\`);
    }
  },
);
\`\`\`

Put \`defineParameterType\` calls in \`support/parameters.ts\` and import that file once from the runner entry. Do not redefine the same type in multiple domain files.

### Data tables for bulk state

Use tables for multi-row setup instead of inventing ten similar steps:

\`\`\`gherkin
Given the cart contains:
  | sku     | qty |
  | SKU-100 | 2   |
  | SKU-200 | 1   |
\`\`\`

\`\`\`ts
Given('the cart contains:', async function (this: CheckoutWorld, table) {
  const items = table.hashes() as Array<{ sku: string; qty: string }>;
  await this.seedCart(
    items.map((row) => ({ sku: row.sku, qty: Number(row.qty) })),
  );
});
\`\`\`

Keep table column names stable. Changing \`qty\` to \`quantity\` is a suite-wide break; treat columns as API.

### Doc strings for payloads

Reserve doc strings for JSON or free text that would drown a table:

\`\`\`gherkin
When the payments service responds with:
  """
  { "error": "card_declined", "retryable": false }
  """
\`\`\`

Parse and validate in the step. Prefer schema validation (for example with a JSON schema library you already use) rather than string equality on whole payloads.

## Sharing Steps Across Domains Without Creating Spaghetti

Shared steps are the main organization failure mode at scale. The fix is intentional sharing, not forbidding reuse.

### Three sharing tiers

1. **Domain-owned steps**: only one domain imports and understands them.
2. **Platform steps**: technical navigation, auth bootstrap used by many domains, owned by a platform package.
3. **Published language packages**: in multi-repo setups, publish \`@acme/bdd-account-steps\` with versioned phrases.

Never "just import" another domain's step file because you need one phrase. Either promote the phrase to platform, or rephrase the scenario in the caller's language and call a shared helper function (not a shared step) under the hood.

### Helper functions vs shared steps

Helpers are TypeScript functions. Steps are language surface. Prefer:

\`\`\`ts
// support/cart.ts
export async function seedCartFor(
  world: CartCapability & AuthCapability,
  items: Array<{ sku: string; qty: number }>,
) {
  if (!world.token) {
    await world.asCustomer(
      process.env.DEFAULT_CUSTOMER_EMAIL ?? '',
      process.env.DEFAULT_CUSTOMER_PASSWORD ?? '',
    );
  }
  await world.seedCart(items);
}
\`\`\`

Multiple domain steps can call \`seedCartFor\` while keeping distinct Gherkin phrasing if product language differs. That is better than forcing every domain to say the exact same sentence when stakeholders disagree.

## Detecting and Fixing Ambiguous, Duplicate, and Orphan Steps

### Realistic failure mode: ambiguous step match

Symptom: the runner reports that a step matches more than one definition, or silently picks the wrong one depending on load order.

Diagnosis checklist:

1. Search the suite for the exact phrase and near-duplicates (\`applies coupon\` vs \`apply coupon\`).
2. List all step patterns that could match a string literal from the failing scenario.
3. Check whether one pattern is a regex that is too broad (\`/.*/\` style disasters).
4. Confirm support files are not loaded twice through circular imports.

Repair pattern:

- Make expressions more specific with typed parameters.
- Delete the weaker duplicate.
- Add a unit test that loads all step definitions and asserts unique patterns if your runner exposes them.

Example diagnostic script sketch (adjust to your runner APIs; do not invent unsupported flags):

\`\`\`ts
import fs from 'node:fs';
import path from 'node:path';

function collectStepStrings(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectStepStrings(full));
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;
    const text = fs.readFileSync(full, 'utf8');
    const re = /(?:Given|When|Then|And|But)\\(\\s*['\`]([^'\`]+)['\`]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      out.push(m[1]);
    }
  }
  return out;
}

const steps = collectStepStrings('step_definitions');
const counts = new Map<string, number>();
for (const s of steps) {
  counts.set(s, (counts.get(s) ?? 0) + 1);
}
for (const [phrase, n] of counts) {
  if (n > 1) {
    console.log(\`DUPLICATE \${n}x: \${phrase}\`);
  }
}
\`\`\`


### Orphan steps and dead language

Orphans are definitions never referenced by features. Dead language confuses search and encourages accidental reuse. Periodically dry-run a coverage report: phrases in features vs phrases in definitions. Delete or archive orphans after confirming no dynamic generation hides them.

### Flaky steps that look like organization issues

Sometimes "we need more step files" is wrong. The real issue is shared mutable state across scenarios. Signs:

- Failures that vanish with \`--parallel 1\` (or the serial equivalent in your runner).
- Steps that assume a cart already exists because a previous scenario left it.
- Login steps that reuse a single test user without unique email suffixes.

Fix isolation first; reorganize second.

## What People Get Wrong About Step Organization

### Mistake 1: organizing by technical layer only

Folders like \`api/\`, \`ui/\`, \`db/\` feel clean to engineers and opaque to readers of features. Scenarios are domain stories. Mirror domains first, then allow thin technical modules underneath.

### Mistake 2: one step per line of UI

If every click is a step, Gherkin becomes a script, not a specification. Collapse multi-click flows into intent steps backed by page objects.

### Mistake 3: assertions in \`Given\` or setup helpers

\`Given\` should establish context. Assertions belong in \`Then\` (or in page object methods called from \`Then\`). Setup that silently asserts "user exists" hides missing fixtures.

### Mistake 4: copying phrases instead of extracting helpers

Two domains copy "the customer has a verified email" and later one gains 2FA. Extract a helper or promote a platform step; do not leave forked behavior.

### Mistake 5: treating tags as a substitute for structure

Tags like \`@checkout @smoke\` are filters, not architecture. They do not replace domain folders or ownership.

## Mapping Organization to CI and Local Workflows

Organization that only works on one laptop is incomplete. Encode structure in how the suite runs.

### Suggested npm scripts

\`\`\`json
{
  "scripts": {
    "test:bdd": "cucumber-js --import 'step_definitions/support/**/*.ts' --import 'step_definitions/domains/**/*.ts' --import 'step_definitions/technical/**/*.ts' 'features/**/*.feature'",
    "test:bdd:checkout": "cucumber-js --import 'step_definitions/support/**/*.ts' --import 'step_definitions/domains/checkout.steps.ts' --import 'step_definitions/technical/**/*.ts' 'features/checkout/**/*.feature'",
    "lint:bdd:dupes": "tsx scripts/find-duplicate-steps.ts"
  }
}
\`\`\`

Exact CLI flags vary by runner version. Prefer documented options from your installed package rather than memorized folklore. The structure above communicates intent: support always loads, domain can be scoped, technical primitives stay available.

### Pull request checklist for step changes

| Check | Pass criteria |
| --- | --- |
| Phrase uniqueness | No second definition for the same expression |
| Domain ownership | File path matches the vocabulary owner |
| No secrets | Credentials only from env or secret store |
| Isolation | No reliance on previous scenario state |
| Page objects | Locators not embedded in step text |
| Docs | New platform steps listed in the technical glossary |

### Parallelism and worker data

When you scale workers, organization meets data design:

- Each scenario creates unique emails, order ids, and cart ids.
- Prefer API seeding over UI setup for speed, still expressed as domain \`Given\`s.
- Avoid static files written to a shared path without unique names.

## Page Objects, Screens, and Where Locators Live

Step organization fails when locators leak upward. Keep a hard boundary:

1. Feature files: business language only.
2. Step definitions: orchestration, data shaping, assertions at business level.
3. Page objects / screen objects: locators, clicks, reads.
4. API clients: HTTP details.

Example page object slice:

\`\`\`ts
export class CheckoutPage {
  constructor(private readonly page: {
    getByRole: (role: string, opts?: { name?: string | RegExp }) => {
      click: () => Promise<void>;
      fill: (v: string) => Promise<void>;
    };
    getByTestId: (id: string) => { textContent: () => Promise<string | null> };
  }) {}

  async applyCoupon(code: string) {
    await this.page.getByRole('textbox', { name: /coupon/i }).fill(code);
    await this.page.getByRole('button', { name: /apply/i }).click();
  }

  async readTotal(): Promise<number> {
    const raw = await this.page.getByTestId('order-total').textContent();
    if (!raw) throw new Error('order-total missing');
    return Number(raw.replace(/[^0-9.]/g, ''));
  }
}
\`\`\`

Steps call \`applyCoupon\`; they never mention roles. That boundary is half of good bdd step definition organization in UI-heavy suites.

## Gradual Migration Plan for a Messy Suite

If you inherit a single \`steps.ts\` with thousands of lines, do not rewrite in one sprint.

1. **Inventory**: generate the phrase list and frequency counts.
2. **Cluster**: group high-frequency phrases by domain nouns (order, cart, user, invoice).
3. **Extract support**: World, hooks, parameters first.
4. **Move one domain**: checkout first if it is the revenue path.
5. **Delete duplicates** as you move, not after.
6. **Add the duplicate detector** to CI so entropy cannot return.
7. **Document the glossary** of platform steps.

Measure progress with counts: lines per step file, duplicate phrases, mean time to find a step (anecdotal but useful in retros).

## Reference: Roles and Ownership

| Artifact | Primary owner | Secondary reviewer | Change cadence |
| --- | --- | --- | --- |
| \`*.feature\` | Product + QA | Eng | Per story |
| Domain \`*.steps.ts\` | Squad QA/automation | Squad eng | Per story |
| Technical steps | Platform QA | All squads | Rare |
| World / hooks | Platform QA | Eng architects | Rare |
| Parameter types | Platform QA | Domain leads | Occasional |
| Page objects | Squad eng | QA | Per UI change |

Clear ownership prevents the "everyone edits the dump file" pattern that recreates chaos.

## Example End-to-End Slice

Putting the pieces together for a checkout happy path:

\`\`\`gherkin
Feature: Place order with coupon
  Scenario: Valid percentage coupon reduces total
    Given a customer is authenticated
    And the cart contains:
      | sku     | qty |
      | SKU-100 | 2   |
    When the customer applies coupon "SAVE10"
    And the customer places the order
    Then the order status is paid
    And the order total is 90.00
\`\`\`

\`\`\`ts
import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

Given('a customer is authenticated', async function (this: CheckoutWorld) {
  await this.asCustomer(
    process.env.DEFAULT_CUSTOMER_EMAIL ?? '',
    process.env.DEFAULT_CUSTOMER_PASSWORD ?? '',
  );
});

When('the customer places the order', async function (this: CheckoutWorld) {
  await this.checkoutPage.placeOrder();
});

Then('the order is finalized as paid', async function (this: CheckoutWorld) {
  const status = await this.checkoutPage.readStatus();
  assert.equal(status, 'paid');
});
\`\`\`

Notice how few steps know about HTTP or locators. That is organization working.

For teams adopting AI coding agents, put this structure in a short project skill or agent brief: domain folders, "no locators in steps," and "run the duplicate detector." Ready-made QA skills install from qaskills.sh with the qaskills CLI when you want a shared baseline across repos instead of rediscovering the same conventions.

## Tooling Notes Without Fake Flags

Stick to documented behavior for your runner:

- Cucumber-js loads step definitions through its documented import/require mechanisms and configuration files.
- Playwright can drive the browser underneath page objects; keep Playwright config in its own file and inject \`page\` into the World in hooks.
- Jest or Vitest can unit-test pure helpers (\`seedCart\` mappers, price calculators) without going through Gherkin.
- Avoid inventing runner flags in docs or README samples; copy from the version you pin in package.json.

When comparing multi-framework options for greenfield work, use the [BDD frameworks comparison for 2026](/blog/bdd-frameworks-comparison-2026). When onboarding people who have never written a feature file, send them through the [Cucumber BDD tutorial for beginners](/blog/cucumber-bdd-tutorial-beginners) before they touch organization rules.

## Scaling Vocabulary: Synonyms, Locales, and Product Renames

Product language drifts. Marketing renames "coupon" to "promo code." Organization must absorb renames without forking the suite.

### Controlled synonym strategy

Pick one canonical step phrase. If stakeholders demand a synonym, implement the synonym as a one-line step that calls the same helper:

\`\`\`ts
When('the customer applies promo code {string}', async function (this: CheckoutWorld, code: string) {
  await this.checkoutPage.applyCoupon(code);
});
\`\`\`

Log synonyms in a glossary table in the repo so AI agents and humans do not invent a third phrase.

### Locales

If scenarios must run in multiple UI languages, keep Gherkin in one language (usually English for engineering) and localize inside page objects, or maintain separate feature trees per locale with shared helpers. Do not mix languages inside a single step file without a clear parameter for locale.

### Rename playbook

1. Add new phrase calling the old helper.
2. Migrate features in small PRs.
3. Remove old phrase after search shows zero usages.
4. Update glossary.

## Observability of the Suite Itself

Treat the step layer as a product:

- Track scenario duration by domain folder.
- Track failure rate by step file.
- Alert when a step file exceeds a size budget (for example 400 lines as a soft cap).
- Publish a weekly "new phrases" list from git diff so language growth is visible.

These metrics tell you when organization is rotting before people complain.

## Security and Data Hygiene in Step Code

Organization includes what must never live in step files:

- Production credentials
- Real PII from production exports
- Undocumented \`eval\` of table cells
- Shelling out to destructive commands based on scenario text

Seed data should be synthetic. Admin powers should be explicit in scenario language (\`Given an admin is authenticated\`) so audits can see privilege use.

## Putting It All Together: A One-Page Policy

Copy this policy into \`docs/bdd-organization.md\` and enforce it in review:

1. Features live under \`features/<domain>/\`.
2. Steps live under \`step_definitions/domains/<domain>.steps.ts\` unless technical.
3. No locators in feature files or step strings.
4. World is composed capabilities; reset per scenario.
5. Parameter types are defined once in support.
6. Duplicates fail CI.
7. Platform steps require glossary updates.
8. Synonyms are explicit wrappers, not silent copies.
9. Hooks never hide business preconditions.
10. Page objects own UI; API clients own HTTP.

Follow that list and bdd step definition organization stops being a debate and becomes a habit.

## Frequently Asked Questions

### How many step definition files should a mid-size product keep?

Aim for one primary file per domain plus a small technical set and a support folder. For a product with checkout, catalog, account, and billing, that is roughly four domain files, two technical files, and three support modules. If a domain file exceeds a few hundred lines or mixes two bounded contexts, split by sub-domain (for example \`checkout-payments.steps.ts\` and \`checkout-shipping.steps.ts\`) rather than inventing layer-based folders that hide product language from search.

### Should AI coding agents write new step phrases freely?

No. Agents should reuse existing phrases first, then propose a new phrase only when the glossary lacks the intent. Give agents a project rule: search \`step_definitions\` before adding \`Given\`/\`When\`/\`Then\`, prefer helpers over new steps, and never embed locators in Gherkin. Require the duplicate detector in CI so an agent cannot land a second definition for the same sentence during a large refactor.

### When is feature-local step organization still the right call?

Use feature-local steps for spikes, prototypes, and features that will likely be deleted. Promote phrases into domain files as soon as a second feature needs them or as soon as the spike graduates to a supported product area. Keeping experimental language local prevents unfinished vocabulary from polluting the shared domain while still allowing fast iteration inside a branch.

### How do we organize steps when API and UI tests share Gherkin?

Share domain steps that speak business intent, then branch inside the World based on a driver mode (\`ui\` vs \`api\`) set by tags or environment. Keep driver-specific code in clients and page objects, not in separate incompatible phrases. Scenarios stay readable; implementation switches under the hood. If a flow is API-only or UI-only by nature, say so in tags and skip the wrong driver instead of forcing a fake dual implementation.
`,
};
