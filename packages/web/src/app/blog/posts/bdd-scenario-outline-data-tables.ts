import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'BDD Scenario Outline Data Tables: Choosing the Right Shape',
  description: 'Use BDD scenario outline data tables correctly with Cucumber examples, typed transforms, maintainable steps, and diagnostics for misleading test coverage.',
  date: '2026-08-07',
  category: 'BDD',
  content: `
# BDD Scenario Outline Data Tables: Choosing the Right Shape

BDD scenario outline data tables solve different modeling problems. A Scenario Outline repeats an entire scenario once for each row in an Examples table, substituting placeholders such as \`<role>\` into steps. A Data Table is one structured argument passed to a single step in one scenario. Choose the outline when each row deserves an independent result. Choose a Data Table when the rows collectively describe one business object, set, or rule.

Combining them is valid, but only when the outer Examples row selects a meaningful case and the nested table supplies structured details for that case. This guide uses Cucumber and TypeScript to show exact Gherkin shapes, typed conversions, failure reporting, anti-patterns, and workflows that AI coding agents can extend without turning specifications into spreadsheets.

## Read the execution model before writing the table

The visual similarity of pipe-delimited tables causes confusion. Execution semantics are the reliable distinction.

| Gherkin construct | Execution count | Data destination | Best question it answers |
|---|---:|---|---|
| Scenario | Once | Step text and arguments | What behavior does one example illustrate? |
| Scenario Outline with Examples | Once per Examples row | Placeholder substitution across steps | Does the same rule hold for several representative cases? |
| Data Table on a step | Once | One step receives a table object | What structured set or object is needed for this action? |
| Doc String on a step | Once | One step receives a text block | What larger text payload is submitted or compared? |

Consider discount eligibility. Each customer tier produces a separately meaningful outcome, so an outline is natural:

\`\`\`gherkin
Feature: Order discounts

  Scenario Outline: eligible customers receive their tier discount
    Given a customer in the <tier> tier
    And an order subtotal of <subtotal> cents
    When the order is priced
    Then the discount is <discount> cents

    Examples:
      | tier   | subtotal | discount |
      | silver | 10000    | 500      |
      | gold   | 10000    | 1000     |
      | none   | 10000    | 0        |
\`\`\`

Cucumber expands this into three scenario executions. A failure identifies the concrete example row. Hooks run for each generated scenario, and each row should receive an isolated world or scenario context under the framework's normal model.

Now consider an order containing several products. The products together form one order, so a Data Table belongs to one Given step:

\`\`\`gherkin
Scenario: shipping is free when the merchandise threshold is reached
  Given an order contains these products:
    | sku       | quantity | unitPriceCents |
    | NOTE-RED  | 2        | 1200           |
    | PEN-BLUE  | 3        | 300            |
  When shipping is quoted
  Then the shipping charge is 0 cents
\`\`\`

This scenario runs once. The Given receives both product rows as one argument because the rule depends on their combined total.

## Use Scenario Outlines for equivalence representatives, not bulk input

An outline is effective when rows represent named partitions or boundaries of one rule. It becomes harmful when teams paste dozens of production records into Examples and call it coverage. BDD examples should explain behavior, not imitate a data warehouse.

A good outline row differs for a reason:

| Row purpose | Example | What it proves |
|---|---|---|
| Lower boundary | Age 17 | Below eligibility threshold is rejected |
| Exact boundary | Age 18 | Threshold value is accepted |
| Upper category | Age 65 | Senior rule applies at its threshold |
| Business partition | Account suspended | Status overrides otherwise valid input |

Give Examples blocks descriptive names or tags when they communicate separate business groups. Gherkin supports multiple Examples sections beneath an outline. This can make a rule easier to scan than one table with a “type” column.

\`\`\`gherkin
Scenario Outline: transfer limits depend on account state
  Given the account status is <status>
  And the requested transfer is <amount> cents
  When the transfer is evaluated
  Then the decision is <decision>

  Examples: active account boundaries
    | status | amount | decision |
    | active | 9999   | approved |
    | active | 10000  | approved |
    | active | 10001  | review   |

  Examples: blocked account rule
    | status    | amount | decision |
    | suspended | 100    | rejected |
\`\`\`

Do not add every numeric value between boundaries. One representative per equivalence partition plus exact boundary cases usually communicates the rule better. Use lower-level parameterized tests or property-based testing for dense algorithmic coverage.

The [BDD frameworks comparison](/blog/bdd-frameworks-comparison-2026) can help teams choose a runner and language integration. The modeling guidance here remains the same because it starts from Gherkin semantics, not a runner-specific convenience.

## Use Data Tables for objects, lists, and mappings

A Data Table has no single mandated semantic shape. Cucumber implementations expose transformations for common shapes such as rows, hashes, or key-value mappings. Choose the visual form that matches the domain.

An object-style vertical table is readable for one entity:

\`\`\`gherkin
Given this customer profile exists:
  | field       | value            |
  | customerId  | C-104            |
  | country     | IN               |
  | segment     | business         |
  | contactable | true             |
\`\`\`

A header-row table is better for a list of similar objects:

\`\`\`gherkin
Given these inventory balances exist:
  | warehouse | sku      | available |
  | west      | NOTE-RED | 12        |
  | south     | NOTE-RED | 7         |
  | west      | PEN-BLUE | 0         |
\`\`\`

Keep cells scalar and visible. JSON embedded in one cell hides structure, introduces escaping noise, and makes reviews difficult. When a payload is genuinely hierarchical, use a domain fixture builder referenced by a meaningful name, several focused steps, or a Doc String if the actual text format is the behavior under test.

| Desired shape | Table layout | Typical TypeScript target |
|---|---|---|
| One key-value object | Two columns, field and value | \`Record<string, string>\` |
| List of records | Header plus data rows | \`Array<Record<string, string>>\` |
| Raw matrix | Rows without semantic header conversion | \`string[][]\` |
| Ordered domain commands | Header plus command rows | Validated command objects |

Table conversion initially yields strings in many Cucumber workflows. Treat type conversion and validation as an explicit boundary rather than relying on JavaScript coercion.

## Convert Cucumber DataTable values into domain types

With Cucumber for JavaScript, step definitions can receive a \`DataTable\`. Methods such as \`hashes()\`, \`rows()\`, and \`rowsHash()\` expose different shapes. Use the method that matches the Gherkin layout, then validate required headers and parse cells.

\`\`\`ts
import { Given, DataTable } from '@cucumber/cucumber';

type InventoryBalance = {
  warehouse: string;
  sku: string;
  available: number;
};

Given('these inventory balances exist:', async function (table: DataTable) {
  const balances: InventoryBalance[] = table.hashes().map((row, index) => ({
    warehouse: requiredCell(row, 'warehouse', index),
    sku: requiredCell(row, 'sku', index),
    available: parseWholeNumber(row.available, 'available', index)
  }));

  await this.inventoryApi.seedBalances(balances);
});
\`\`\`

Write small parsers that fail with row and column context. A bare \`Number(value)\` accepts an empty string as zero, which can make a missing cell look like valid stock.

\`\`\`ts
function requiredCell(
  row: Record<string, string>,
  column: string,
  rowIndex: number
): string {
  const value = row[column]?.trim();
  if (!value) {
    throw new Error(\`Data table row \${rowIndex + 1} has no \${column}\`);
  }
  return value;
}

function parseWholeNumber(
  value: string | undefined,
  column: string,
  rowIndex: number
): number {
  if (value === undefined || !/^-?\\d+$/.test(value.trim())) {
    throw new Error(\`Row \${rowIndex + 1}, \${column} must be a whole number\`);
  }
  return Number(value);
}
\`\`\`


Validate header names too. A misspelled \`availble\` column otherwise produces undefined values far away from the specification mistake. A header contract keeps failures close to the feature file.

## Keep placeholders out of step-definition regular expressions

Scenario Outline substitution happens before step matching. The step definition receives concrete text, not the angle-bracket placeholder. For this step:

\`\`\`gherkin
Then the discount is <discount> cents
\`\`\`

an example row with \`discount\` equal to \`500\` produces \`Then the discount is 500 cents\`. Match the concrete parameter with a Cucumber Expression:

\`\`\`ts
Then('the discount is {int} cents', async function (expectedCents: number) {
  const order = await this.checkout.currentOrder();
  expect(order.discountCents).toBe(expectedCents);
});
\`\`\`

Do not create a separate step definition for each table row. That throws away the outline's shared vocabulary. Also do not capture every phrase with \`{string}\` and parse the entire language inside step code. Prefer typed parameters such as \`{int}\` where their documented behavior fits, and register a domain parameter type only when it improves the ubiquitous language.

## Combine an outline with a Data Table only for two-level structure

A useful combination has a small outer matrix and a structured inner object. Suppose pricing differs by region, while each order contains several line items. Region and expected total belong to Examples; line items belong to the Data Table.

\`\`\`gherkin
Scenario Outline: tax is calculated for the destination region
  Given an order for region <region> contains:
    | sku       | quantity | unitPriceCents |
    | NOTE-RED  | 2        | 1200           |
    | PEN-BLUE  | 1        | 300            |
  When the order total is calculated
  Then the tax is <tax> cents

  Examples:
    | region | tax |
    | north  | 135 |
    | south  | 216 |
\`\`\`

Placeholders can appear in Data Table cells as well. After outline expansion, the step receives substituted cell values. Use this sparingly because two-dimensional substitution becomes difficult to read.

\`\`\`gherkin
Scenario Outline: requested quantities are reserved from one warehouse
  Given these reservation requests exist:
    | warehouse   | sku      | quantity   |
    | <warehouse> | NOTE-RED | <notebooks> |
    | <warehouse> | PEN-BLUE | <pens>      |
  When reservations are processed
  Then the result is <result>

  Examples:
    | warehouse | notebooks | pens | result   |
    | west      | 2         | 1    | reserved |
    | south     | 20        | 1    | partial  |
\`\`\`

If every inner table cell becomes a placeholder and the Examples table has twenty columns, the specification is signaling an overloaded scenario. Split the behavior by rule or move setup complexity behind a named domain concept.

## Decide table placement with a four-question test

When authors disagree about outline versus Data Table, ask:

1. Should each row have its own pass, fail, retry, and report entry? Use an Examples row.
2. Do all rows together create one prerequisite or expected collection? Use a Data Table.
3. Would removing one row change the identity of the scenario or merely its input object? Identity points toward Examples; object structure points toward Data Table.
4. Can a product owner explain why every row exists? If not, reduce or relocate the dataset.

This decision matrix makes the result concrete:

| Need | Scenario Outline | Data Table | Separate lower-level test |
|---|:---:|:---:|:---:|
| Three pricing tiers, each reported independently | Yes | No | Optional |
| Five products that compose one basket | No | Yes | Optional |
| Hundreds of tax rate records | No | No | Yes |
| Same rule at exact numeric boundaries | Yes | No | Add algorithmic coverage below |
| Expected ordered audit entries for one action | No | Yes | Optional |
| Generated combinations with no narrative value | No | No | Yes |

BDD is not a replacement for all automated testing. It is the executable layer where examples clarify shared behavior. Dense combinatorial validation belongs closer to the implementation.

## Make steps thin while preserving business meaning

Step definitions should translate Gherkin arguments into calls to domain-facing drivers. Avoid putting pricing algorithms or database assertions directly in steps. Thin steps keep equivalent wording from growing separate implementations and let the same driver support non-BDD tests.

\`\`\`ts
Then('these reservation outcomes are recorded:', async function (table: DataTable) {
  const expected = table.hashes().map(parseReservationOutcome);
  const actual = await this.reservations.listOutcomes();

  expect(normalizeOutcomes(actual)).toEqual(normalizeOutcomes(expected));
});

function normalizeOutcomes(items: ReservationOutcome[]) {
  return [...items].sort((a, b) => a.sku.localeCompare(b.sku));
}
\`\`\`

Sort only when order is not part of the business rule. If the scenario specifies processing order or audit sequence, assert the original order. Normalization must remove irrelevant variability, not erase a requirement.

The [Cucumber BDD tutorial](/blog/cucumber-bdd-tutorial-beginners) covers feature wiring and foundational step definitions. Once that wiring is understood, table design should be driven by reporting granularity and domain shape.

## Diagnose an outline where every row fails as one mystery

Imagine an outline with eight payment cases. The report shows all eight failing in the Given step with “amount must be a whole number,” but the feature cells look numeric. Start at expansion and conversion.

1. Inspect the generated scenario name and concrete step text for one row.
2. Print a redacted representation of the Data Table or captured parameter types.
3. Look for currency symbols, thousands separators, nonbreaking spaces, or blank cells.
4. Confirm the step uses \`{int}\` only for values its expression can parse.
5. Confirm outline headers exactly match placeholders, including case.
6. Run one row in isolation without changing the shared step.

A realistic cause is \`1,000\` in an Examples cell captured by a phrase designed for an integer parameter. The comma is presentation formatting, not part of the integer form the step expects. Decide whether the domain language should allow formatted money. If yes, define and test a deliberate money parser. If no, keep cents as plain digits and make the table convention explicit.

\`\`\`ts
function parseMoneyCents(text: string): number {
  const match = /^([A-Z]{3}) (\\d+)\\.(\\d{2})$/.exec(text.trim());
  if (!match) {
    throw new Error(\`Expected money like USD 12.50, received: \${text}\`);
  }
  const [, currency, whole, fraction] = match;
  if (currency !== 'USD') throw new Error(\`Unsupported currency: \${currency}\`);
  return Number(whole) * 100 + Number(fraction);
}
\`\`\`

Another failure mode is shared mutable state between outline rows. Each row should be independent. If the first example consumes inventory and the second sees the reduced balance, move cleanup into scenario hooks or arrange unique records per scenario. Do not rely on row execution order.

## Review the specification for misleading coverage

An outline with many green rows can still cover one path. For example, the step might parse \`status\` from the table but the driver always creates an active customer. Check data flow from every Examples column through the expanded step, step parameter, driver call, system boundary, and assertion.

Use a coverage review table during pull requests:

| Review question | Warning sign | Correction |
|---|---|---|
| Does each column affect setup, action, or expected outcome? | Decorative unused column | Remove it or wire the intended behavior |
| Is every row behaviorally distinct? | Values change but branch and outcome do not | Keep one representative |
| Can a row pass for the wrong reason? | Assertion checks only HTTP success | Assert the named business result |
| Is setup isolated per generated scenario? | Row order affects result | Reset state and use unique identity |
| Does the table expose domain language? | Columns mirror database fields | Rename around business concepts |

Mutation is a useful manual check: change one expected value and confirm only the corresponding generated scenario fails. Change one input partition and confirm the outcome changes or the chosen example still has a documented purpose.

## Give AI coding agents a table contract, not a vague request

An AI agent can add a boundary row, generate typed parsers, or refactor a repeated Given. It can also inflate an outline with redundant combinations or silently loosen conversion. Supply the execution intent.

\`\`\`text
Task: add the suspended-account partition to the transfer-limit rule.
Execution: each Examples row must remain an independent scenario result.
Vocabulary: amounts are integer cents; no formatted currency in this feature.
Isolation: every row creates a unique account and resets transactions afterward.
Acceptance: existing active boundaries pass, new suspended row rejects any amount.
Do not: add a catch-all step, move business logic into the step, or create a 20-row cross product.
\`\`\`

Ask the agent to show the expanded scenario for the new row and trace every column to code. This catches unused placeholders and ambiguous step matches early. Review generated Gherkin as product documentation first and test code second.

## Refactor tables when the specification stops telling a story

Split an outline when its scenario name needs multiple conjunctions, Examples columns contain unrelated concepts, or rows exercise different actions. Replace a giant Data Table when it mostly configures infrastructure rather than expressing business state. A named fixture can hide irrelevant detail, but its name must be meaningful and its implementation versioned with the tests.

Keep these practical limits qualitative rather than inventing a universal row count. Ten boundary examples can be clear; four rows with twelve cryptic columns can be unreadable. Optimize for a reviewer being able to explain the rule, the reason for each row, and the expected independent reports.

The finished feature should make execution predictable without opening step code. Readers should know whether a table generates scenarios or feeds one step, what each column means, and why each example exists. When that is true, failure reports become a diagnostic asset instead of a pile of nearly identical generated names.

## Make generated scenario names useful in CI reports

An outline can execute correctly and still produce an unreadable report. Put the business distinction in the Scenario Outline name and ensure the runner's generated case includes enough substituted values or example context to identify the failing partition. Do not encode a tracking ticket or row number as the only meaning. “Transfer decision for suspended account at 100 cents” is useful evidence; “example 7” requires reopening the feature file.

Examples table columns should use domain names that remain understandable after expansion. A heading such as \`expectedDecision\` is clearer than \`output2\`, while \`accountStatus\` is clearer than \`type\`. Keep values concise enough for reports and logs. Large payloads belong in a Data Table, Doc String, or named fixture rather than a placeholder repeated inside the generated title.

When failures contain confidential business data, avoid placing raw customer identifiers, email addresses, or access tokens in Examples. Generate synthetic identities in the step or scenario world and refer to them by role. Reports are often retained and broadly accessible, so the specification itself should be safe test data.

Finally, prove row-level reruns behave independently. A developer should be able to select the generated failing case, recreate its state, and receive the same outcome without earlier rows. If reporting only allows rerunning the entire outline, keep the scenario small enough that diagnosis remains cheap, and retain conversion errors with concrete Examples row context.

## Frequently Asked Questions

### Can a Scenario Outline contain a Data Table in one of its steps?

Yes. Cucumber expands the Scenario Outline for each Examples row, substitutes placeholders in step text and Data Table cells, and then passes the resulting Data Table to the matched step. Use this two-level shape when the outer row is an independently reportable business case and the inner rows collectively form one object or set. Avoid it when nearly every inner cell is a placeholder, because the resulting specification becomes difficult to read and maintain.

### Are Data Table cell values automatically converted to numbers and booleans?

Do not assume domain conversion. In Cucumber JavaScript workflows, common DataTable methods expose string-based cells, so step code should validate headers and convert values deliberately. Reject missing cells and malformed numbers with row and column context. This prevents empty strings, unexpected whitespace, and JavaScript coercion from becoming valid-looking data. Typed conversion functions also give unit tests a small, deterministic boundary and make the feature's formatting conventions explicit.

### When should a large Examples table move to a lower-level parameterized test?

Move it when rows no longer communicate distinct business examples, are generated mechanically, or form a large combinatorial dataset. Keep a few representative partitions and exact boundaries in Gherkin, then cover dense algorithms with unit, property-based, or parameterized integration tests. Each retained Examples row should have a reason a product, QA, or engineering reviewer can state. BDD reports are most useful when a failed row names a meaningful rule case rather than record number 87.

### How can teams prevent Scenario Outline rows from sharing state?

Arrange unique entity identities per generated scenario, reset mutable dependencies in scenario hooks, and avoid module-level variables that survive between worlds. Do not depend on Examples row order. If tests use a shared service container, isolate database schemas or perform deterministic reset-before-scenario. Reproduce suspected leakage by running the failing row alone and in reversed or shuffled order. A row that passes alone but fails after another example usually indicates state ownership or cleanup, not a Gherkin substitution problem.
`,
};
