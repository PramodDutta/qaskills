import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Parametrize Tests from CSV and JSON Without Losing Debuggability',
  description: 'Learn playwright parametrize tests from csv json patterns for typed data, readable reports, safe fixtures, row filtering, and agent-friendly coverage.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Playwright Parametrize Tests from CSV and JSON Without Losing Debuggability

Playwright does not need a special decorator to parametrize tests from CSV or JSON. The practical pattern is to load data before test declaration, loop over the cases, and create one \`test(...)\` per row. That gives you separate report entries, separate retries, separate traces, and separate failure messages for each input. For QA teams, that is the difference between "the validation matrix failed" and "currency JPY with annual billing failed."

The hard part is not the loop. The hard part is designing data files that stay readable, typed, stable in CI, and useful to AI coding agents. A data-driven suite can either become a clear specification of business rules or a pile of anonymous rows that nobody wants to debug. The difference is in naming, validation, fixture boundaries, and how much logic you hide in the data.

This guide shows concrete Playwright workflows for parametrizing from JSON and CSV, validating rows before tests are declared, generating useful titles, controlling large matrices, and diagnosing failures when the wrong rows run in CI. If you are choosing where Playwright fits among other JavaScript tools, use [JavaScript Testing Frameworks Complete Guide 2026](/blog/javascript-testing-frameworks-complete-guide-2026). If your generated cases repeatedly fail at element selection, review [Playwright Best Practices Locators 2026](/blog/playwright-best-practices-locators-2026) before adding more rows.

## Make each row a named test case

The most important parametrization rule is simple: every row needs a human-readable name. Playwright reports, retries, trace files, and CI annotations are organized around test titles. If your generated title is \`case 14\`, you have thrown away the main debugging advantage of parametrization.

Use row names that encode the business condition, not every data field. \`free-plan blocks team invite\` is better than \`plan-free-role-owner-action-invite-expected-disabled\`. The full details belong in the data file or an attachment. The title should let a reviewer scan the report and find the failing behavior.

| Data field | Belongs in title? | Reason |
|---|---:|---|
| Business scenario name | Yes | It is the report headline |
| Expected outcome | Often | It distinguishes positive and negative rows |
| Internal database ID | No | It is volatile and rarely meaningful |
| Locale or currency | Yes when behavior differs | It explains formatting failures |
| Long input text | No | It makes reports hard to scan |
| Test owner or tag | Maybe | Use annotations or tags if report tooling supports them |

Start with a compact JSON file:

\`\`\`json
[
  {
    "name": "free plan blocks team invite",
    "plan": "free",
    "inviteEmail": "teammate-free@example.test",
    "expectedMessage": "Upgrade to invite teammates"
  },
  {
    "name": "team plan allows member invite",
    "plan": "team",
    "inviteEmail": "teammate-team@example.test",
    "expectedMessage": "Invitation sent"
  },
  {
    "name": "enterprise plan allows admin invite",
    "plan": "enterprise",
    "inviteEmail": "admin-enterprise@example.test",
    "expectedMessage": "Invitation sent"
  }
]
\`\`\`

Then declare one test per row:

\`\`\`ts
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type InviteCase = {
  name: string;
  plan: 'free' | 'team' | 'enterprise';
  inviteEmail: string;
  expectedMessage: string;
};

const filePath = join(__dirname, 'data', 'invite-cases.json');
const inviteCases = JSON.parse(readFileSync(filePath, 'utf8')) as InviteCase[];

for (const row of inviteCases) {
  test(row.name, async ({ page, request }) => {
    await request.post('/api/test/account', {
      data: { plan: row.plan },
    });

    await page.goto('/settings/team');
    await page.getByLabel('Email address').fill(row.inviteEmail);
    await page.getByRole('button', { name: 'Invite' }).click();

    await expect(page.getByText(row.expectedMessage)).toBeVisible();
  });
}
\`\`\`

The loop runs while the test file is loaded, before Playwright starts executing the tests. That is the right time to declare tests. Do not fetch test cases asynchronously from an API inside a \`beforeAll\` and then try to create tests from those results. Playwright needs to know the test list during declaration.

## Validate data before Playwright collects tests

TypeScript assertions alone do not validate JSON at runtime. The cast in the previous example tells the compiler what you expect, but it does not prove the file has those fields. If a row is missing \`expectedMessage\`, your test may fail later with a confusing UI error. Validate rows before declaring tests so bad data fails fast.

You can write a small validator without adding a schema library:

\`\`\`ts
type InviteCase = {
  name: string;
  plan: 'free' | 'team' | 'enterprise';
  inviteEmail: string;
  expectedMessage: string;
};

function assertInviteCase(value: unknown, index: number): asserts value is InviteCase {
  if (!value || typeof value !== 'object') {
    throw new Error('Invite case ' + index + ' must be an object');
  }

  const row = value as Record<string, unknown>;
  const plans = ['free', 'team', 'enterprise'];

  if (typeof row.name !== 'string' || row.name.length === 0) {
    throw new Error('Invite case ' + index + ' needs a name');
  }

  if (typeof row.plan !== 'string' || !plans.includes(row.plan)) {
    throw new Error('Invite case ' + row.name + ' has an invalid plan');
  }

  if (typeof row.inviteEmail !== 'string' || row.inviteEmail.length === 0) {
    throw new Error('Invite case ' + row.name + ' needs inviteEmail');
  }

  if (typeof row.expectedMessage !== 'string' || row.expectedMessage.length === 0) {
    throw new Error('Invite case ' + row.name + ' needs expectedMessage');
  }
}

export function parseInviteCases(raw: unknown): InviteCase[] {
  if (!Array.isArray(raw)) {
    throw new Error('Invite cases file must contain an array');
  }

  raw.forEach((row, index) => assertInviteCase(row, index));
  return raw;
}
\`\`\`

This validator is intentionally strict about the fields the test relies on. It catches broken rows before Playwright schedules the file. That helps both humans and AI coding agents because the failure points at the data contract instead of a later UI symptom.

For larger teams, a schema library can be a good choice, but it is not mandatory. The principle is mandatory: validate external test data at the boundary where you read it.

## Choose JSON or CSV based on the shape of the rule

JSON and CSV are both useful, but they fit different data shapes. JSON is better for nested inputs, optional fields, arrays, and explicit booleans. CSV is better for flat decision tables that non-developers may edit in a spreadsheet.

| Need | Prefer JSON | Prefer CSV |
|---|---:|---:|
| Nested request payload | Yes | No |
| Product manager edits rows in a spreadsheet | Maybe | Yes |
| Multiple expected messages per row | Yes | No |
| Locale, currency, and amount matrix | Maybe | Yes |
| Optional setup fields | Yes | Maybe |
| Clear diffs in code review | Yes for structured changes | Yes for flat tables |

A CSV file works well for simple pricing display checks:

\`\`\`csv
name,plan,currency,priceLabel
free monthly usd,free,USD,$0
team monthly usd,team,USD,$29
team monthly eur,team,EUR,€29
enterprise custom usd,enterprise,USD,Contact sales
\`\`\`

To parse real CSV, use a real parser rather than splitting on commas. CSV can contain quoted commas, empty cells, and spreadsheet exports that look simple until one field changes. The \`csv-parse\` package provides a documented synchronous parser for Node projects.

\`\`\`ts
import { test, expect } from '@playwright/test';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type PriceCase = {
  name: string;
  plan: string;
  currency: string;
  priceLabel: string;
};

const csvPath = join(__dirname, 'data', 'pricing-cases.csv');
const priceCases = parse(readFileSync(csvPath, 'utf8'), {
  columns: true,
  skip_empty_lines: true,
}) as PriceCase[];

for (const row of priceCases) {
  test('pricing displays ' + row.name, async ({ page }) => {
    await page.goto('/pricing?currency=' + row.currency);
    await page.getByRole('tab', { name: row.plan }).click();
    await expect(page.getByText(row.priceLabel)).toBeVisible();
  });
}
\`\`\`

The code avoids a homegrown parser and keeps the test declaration synchronous. If the CSV is edited by non-developers, add validation for required columns and allowed values just like the JSON example.

## Keep setup out of the data file

Data files should describe cases, not execute setup. A row can say \`plan: team\`, but it should not encode a hidden sequence like "create organization, enable billing, invite owner, seed team member." Put setup behavior in fixtures or helper functions where it can be typed, reviewed, and reused.

| Row content | Good data-driven use | Problematic use |
|---|---|---|
| \`plan\` | Selects a known setup path | Encodes plan creation steps as text |
| \`expectedMessage\` | Defines assertion target | Contains a script of UI actions |
| \`role\` | Chooses a fixture or API seed | Changes auth state mid-test without review |
| \`locale\` | Configures app language | Changes browser storage through arbitrary data |
| \`tags\` | Helps filtering or reporting | Controls test logic with many branches |

Here is a cleaner split:

\`\`\`ts
import { test, expect } from '@playwright/test';

type BillingCase = {
  name: string;
  plan: 'free' | 'team';
  cardState: 'none' | 'valid' | 'expired';
  expectedBanner: string;
};

async function seedBillingAccount(
  request: { post: Function },
  row: BillingCase,
) {
  await request.post('/api/test/billing-account', {
    data: {
      plan: row.plan,
      cardState: row.cardState,
    },
  });
}

const cases: BillingCase[] = [
  {
    name: 'free plan asks for upgrade',
    plan: 'free',
    cardState: 'none',
    expectedBanner: 'Upgrade to add billing',
  },
  {
    name: 'team plan with expired card asks for update',
    plan: 'team',
    cardState: 'expired',
    expectedBanner: 'Update your payment method',
  },
];

for (const row of cases) {
  test(row.name, async ({ page, request }) => {
    await seedBillingAccount(request, row);
    await page.goto('/settings/billing');
    await expect(page.getByText(row.expectedBanner)).toBeVisible();
  });
}
\`\`\`

The row controls the business state. The helper owns how that state is created. That boundary keeps test data stable when the implementation changes.

## Avoid the asynchronous declaration trap

One of the easiest mistakes is trying to create tests after an asynchronous operation. For example, a team may call an API to fetch the latest feature-flag matrix, then declare tests inside a promise callback. That is unreliable because Playwright expects tests to be declared synchronously when the file is loaded.

Use checked-in data files, generated files committed before the test run, or a pretest script that writes a deterministic file before Playwright starts. If you need to pull data from an external system, do it in a separate step and fail before test collection when the file cannot be created.

\`\`\`bash
node scripts/build-playwright-matrix.mjs
npx playwright test tests/pricing-matrix.spec.ts
\`\`\`

The Playwright spec should read the generated file synchronously after the script has finished:

\`\`\`ts
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

type MatrixCase = {
  name: string;
  path: string;
  heading: string;
};

const rows = JSON.parse(
  readFileSync('tests/generated/navigation-matrix.json', 'utf8')
) as MatrixCase[];

for (const row of rows) {
  test('navigation matrix: ' + row.name, async ({ page }) => {
    await page.goto(row.path);
    await expect(page.getByRole('heading', { name: row.heading })).toBeVisible();
  });
}
\`\`\`

This makes the dependency explicit in CI. The build step produces the matrix, then Playwright collects tests from a concrete file. If the matrix cannot be produced, the failure happens before test execution rather than halfway through collection.

## Attach row data when failures need context

Generated tests can become hard to debug when the title is compact but the row has several fields. Attach the row for failures, with secrets removed. This gives a reviewer the full input without making the title unreadable.

\`\`\`ts
import { test as base, expect } from '@playwright/test';

type RowInfo = {
  currentRow: Record<string, unknown> | undefined;
};

export const test = base.extend<RowInfo>({
  currentRow: async ({}, use, testInfo) => {
    let row: Record<string, unknown> | undefined;
    await use(row);

    if (row && testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('param-row.json', {
        body: JSON.stringify(row, null, 2),
        contentType: 'application/json',
      });
    }
  },
});

export { expect };
\`\`\`

In many codebases, a simpler helper is enough:

\`\`\`ts
import type { TestInfo } from '@playwright/test';

export async function attachRowOnFailure(
  testInfo: TestInfo,
  row: Record<string, unknown>,
) {
  if (testInfo.status === testInfo.expectedStatus) {
    return;
  }

  await testInfo.attach('param-row.json', {
    body: JSON.stringify(row, null, 2),
    contentType: 'application/json',
  });
}
\`\`\`

Call it in a \`finally\` block if you need it to run after assertion failure. The exact implementation matters less than the principle: the report should include the case data that produced the failure.

## Control matrix size before CI pays the bill

Parametrization makes it easy to multiply coverage past the point of usefulness. Five roles, six plans, eight locales, four browsers, and three payment states is 2,880 combinations before retries. Most teams do not need every combination at full end-to-end depth.

Use a matrix strategy:

| Strategy | Example | Good for | Risk |
|---|---|---|---|
| Pairwise-style representative rows | Role plus plan combinations with selected locales | Broad confidence | Misses rare triple interactions |
| Smoke subset | One happy path per major feature | PR feedback | Too shallow for release confidence |
| Risk-weighted rows | More cases around billing and permissions | Business-critical flows | Needs periodic review |
| Project split | Chromium full matrix, other browsers smoke matrix | Cross-browser cost control | Browser-specific gaps |
| Contract plus E2E mix | API contract covers matrix, Playwright covers journeys | Speed and depth | Requires good contract tests |

The point is not to avoid data-driven coverage. The point is to choose the level where Playwright adds value. If the rule can be proven with a fast API or unit test, do that there. Use Playwright for browser behavior, accessibility surface, routing, storage, and user-visible integration.

## Diagnose the row that passes alone but fails in the matrix

A realistic failure mode: \`team plan allows member invite\` passes when run by title, but fails when the full CSV runs in CI. That usually means the rows are not isolated. Shared account state, repeated email addresses, cached flags, or server-side uniqueness constraints are leaking between cases.

Debug it methodically. First, confirm each generated title is unique. Duplicate titles make filtering and report reading confusing. Second, ensure seeded users, organizations, and emails include a row-specific or worker-specific value. Third, check whether setup helpers reset the state they mutate. Fourth, inspect parallel workers. Rows that pass serially and fail in parallel often share a resource.

One practical pattern is to include a stable case key and a per-worker suffix in seeded data:

\`\`\`ts
import { test, expect } from '@playwright/test';

type SignupCase = {
  key: string;
  name: string;
  plan: string;
};

const rows: SignupCase[] = [
  { key: 'free-basic', name: 'free signup creates personal workspace', plan: 'free' },
  { key: 'team-basic', name: 'team signup creates team workspace', plan: 'team' },
];

for (const row of rows) {
  test(row.name, async ({ page }, testInfo) => {
    const email = row.key + '-worker-' + testInfo.workerIndex + '@example.test';

    await page.goto('/signup');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Workspace created')).toBeVisible();
  });
}
\`\`\`

This is not a complete data isolation strategy, but it prevents a common collision: the same row reusing the same unique field across workers or retries.

## What people get wrong with CSV and JSON parametrization

The first mistake is moving too much logic into the data. If a CSV column named \`action\` can contain \`click invite\`, \`open billing\`, and \`delete user\`, the test has become an interpreter. That is hard to review and easy for agents to extend incorrectly. Keep actions in TypeScript and keep rows as business inputs.

The second mistake is using one giant matrix for every environment. Pull requests need fast feedback. Nightly or release workflows can run a deeper matrix. The same data file can include a \`suite\` field, but the filtering should be explicit and documented.

The third mistake is trusting spreadsheet exports blindly. Empty cells, renamed headers, duplicate names, and accidental smart formatting can silently change coverage. Runtime validation is not optional for data maintained outside code.

## A review checklist for data-driven Playwright tests

Before merging a parametrized spec, ask:

| Review question | Good answer | Warning sign |
|---|---|---|
| Are generated titles unique and meaningful? | Each row has a clear scenario name | Titles are numeric or duplicated |
| Is row data validated? | Bad files fail during collection | Missing fields fail as UI errors |
| Is setup isolated per row? | Unique data and cleanup are explicit | Rows share mutable accounts |
| Is the matrix size justified? | Rows map to risks or requirements | Cartesian product by habit |
| Can a failing row be reproduced? | Title or key filters one case | Failure only says the matrix failed |

This checklist keeps parametrization from turning into hidden complexity. It also gives AI coding agents a stronger contract when they add new rows: preserve naming, validation, isolation, and scope.

## Filter rows without making coverage invisible

Sooner or later a data-driven suite needs subsets. Pull requests may run smoke rows, nightly jobs may run all rows, and local debugging may run one case. The dangerous version is a hidden filter that silently skips half the data without report visibility. A safer version makes row selection explicit through a column, a small loader, or Playwright project configuration.

Add a \`suite\` field when the distinction is part of the test strategy:

\`\`\`json
[
  {
    "name": "free plan blocks invite",
    "suite": "smoke",
    "plan": "free",
    "expectedMessage": "Upgrade to invite teammates"
  },
  {
    "name": "trial plan shows remaining days",
    "suite": "nightly",
    "plan": "trial",
    "expectedMessage": "Your trial ends soon"
  },
  {
    "name": "enterprise plan shows contract owner",
    "suite": "nightly",
    "plan": "enterprise",
    "expectedMessage": "Contact your account owner"
  }
]
\`\`\`

Then filter with an environment variable in the loader, not by commenting out rows:

\`\`\`ts
type SuiteName = 'smoke' | 'nightly';

type PlanCase = {
  name: string;
  suite: SuiteName;
  plan: string;
  expectedMessage: string;
};

function selectRows(rows: PlanCase[]): PlanCase[] {
  const requested = process.env.PLAYWRIGHT_DATA_SUITE as SuiteName | undefined;

  if (!requested) {
    return rows;
  }

  return rows.filter((row) => row.suite === requested);
}
\`\`\`

This pattern is simple, but it has two important review properties. The data file shows which cases belong to which suite, and CI logs can show the selected suite by printing the environment variable before the test command. A maintainer can tell whether a missing case was intentionally routed to nightly or accidentally removed.

Use row filtering carefully:

| Filter style | Good use | Risk |
|---|---|---|
| \`suite\` field | Smoke versus nightly routing | Teams forget to review nightly-only rows |
| \`risk\` field | High-risk cases in PR | Risk labels go stale |
| Local case key | Debug one failing row | Temporary filter accidentally committed |
| Browser project split | Full matrix in one browser, smoke elsewhere | Browser-specific bugs missed |
| Feature flag filter | Run only relevant rows for a changed feature | Hidden coupling to rollout state |

When a filter is temporary, make it hard to commit by keeping it outside the data file. For example, use a local environment variable or Playwright title filtering rather than deleting rows.

## Version generated data like production test code

Some teams generate JSON or CSV from product catalogs, permission spreadsheets, OpenAPI examples, or feature flag exports. That can be powerful, but generated data still needs review. If a script rewrites a 500-row matrix and the pull request shows only "data updated," reviewers cannot tell whether coverage improved, shrank, or changed meaning.

Treat generated data as a build artifact with a source. The source may be a smaller hand-authored file, a product export, or a script. The generated Playwright matrix should include enough metadata to explain when and how it was produced.

\`\`\`json
{
  "generatedAt": "2026-08-07",
  "source": "pricing-rules",
  "cases": [
    {
      "key": "free-usd-monthly",
      "name": "free plan monthly USD",
      "plan": "free",
      "currency": "USD",
      "expectedLabel": "$0"
    }
  ]
}
\`\`\`

The spec can read the wrapper and declare tests from \`cases\`:

\`\`\`ts
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

type GeneratedPricingFile = {
  generatedAt: string;
  source: string;
  cases: Array<{
    key: string;
    name: string;
    plan: string;
    currency: string;
    expectedLabel: string;
  }>;
};

const matrix = JSON.parse(
  readFileSync('tests/generated/pricing-matrix.json', 'utf8')
) as GeneratedPricingFile;

for (const row of matrix.cases) {
  test('pricing matrix: ' + row.name, async ({ page }) => {
    test.info().annotations.push({
      type: 'matrix-source',
      description: matrix.source + ' generated ' + matrix.generatedAt,
    });

    await page.goto('/pricing?currency=' + row.currency);
    await page.getByRole('tab', { name: row.plan }).click();
    await expect(page.getByText(row.expectedLabel)).toBeVisible();
  });
}
\`\`\`

The annotation makes the report explain the data source. That is useful when a failure appears after a rules update. It also helps an AI coding agent avoid editing generated data directly when the correct fix is changing the source rules or generator.

## Define ownership for each data file

Data-driven testing fails socially before it fails technically. A CSV file may be owned by QA analysts, a JSON file by automation engineers, and a generated matrix by a product platform team. If ownership is unclear, rows become stale and failures are dismissed as "test data problems."

Add a short header comment where the format supports it, or keep a nearby README for JSON. The ownership note should answer four questions: who can add rows, who reviews business meaning, who reviews automation impact, and how stale rows are removed.

| Data source | Business owner | Automation owner | Staleness signal |
|---|---|---|---|
| Pricing CSV | Product manager for billing | QA automation | Product catalog changes |
| Permission JSON | Security or platform lead | QA automation | Role model migration |
| Localization matrix | Localization manager | Front-end QA | New supported locale |
| Generated route matrix | Front-end platform | Test platform | Route manifest changes |

This is not bureaucracy. It prevents a common argument after a failure: the tester says the product is wrong, the developer says the data is wrong, and nobody knows who approved the row. A small ownership convention makes the row part of the product contract.

## Keep row data stable across retries

Retries can expose a weakness in parametrized tests. If a row creates a user with a fixed email and the first attempt fails after creation, the retry may fail earlier because the user already exists. That makes the second failure misleading. Design row data so retries either reuse safely or create unique records that can coexist.

One approach is to combine the row key, retry number, and worker index for unique fields:

\`\`\`ts
import { test, expect } from '@playwright/test';

type AccountCase = {
  key: string;
  name: string;
  plan: string;
};

const rows: AccountCase[] = [
  { key: 'free-owner', name: 'free owner signup', plan: 'free' },
  { key: 'team-owner', name: 'team owner signup', plan: 'team' },
];

for (const row of rows) {
  test(row.name, async ({ page }, testInfo) => {
    const email =
      row.key +
      '-w' +
      testInfo.workerIndex +
      '-r' +
      testInfo.retry +
      '@example.test';

    await page.goto('/signup');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Account created')).toBeVisible();
  });
}
\`\`\`

This does not remove the need for cleanup, but it prevents a retry from colliding with the exact data created by the failed attempt. For systems where duplicate records are expensive, make cleanup reliable instead of generating endless unique data. The right choice depends on the product's data lifecycle and test environment.

## Make AI-generated row changes reviewable

AI coding agents are good at extending a matrix when the pattern is clear. They are also capable of adding redundant rows, inventing unsupported enum values, or changing expected messages to match a current bug. Give the agent strict instructions: add only rows that match existing schema, do not change expected results unless the product requirement changed, and update validation when introducing a new allowed value.

A useful agent prompt can be short: "Add rows for annual billing to \`pricing-cases.json\`. Preserve unique \`name\` values, use existing currencies only, and do not edit the Playwright spec unless validation fails." That prompt gives the agent a bounded task. It also gives reviewers a clear diff: data rows changed, test logic did not.

When the agent must change both data and code, require a failure explanation. Was the schema too narrow? Did the product add a new plan? Did the setup helper need a new state? That explanation belongs in the pull request, not hidden in generated rows.

Finally, keep a small changelog mindset for important matrices. When a row is added, changed, or removed, the pull request should explain the product rule behind the change. That does not need a ceremony or a long document. A sentence like "annual billing now supports EUR, so the pricing matrix adds the visible annual EUR label" is enough. It protects the matrix from becoming a mysterious artifact that everyone fears editing but nobody trusts.

## Frequently Asked Questions

### Can Playwright parametrize tests directly from a CSV file?

Yes. Load the CSV synchronously before declaring tests, parse it into rows, and loop over the rows to create one \`test\` per case. Use a real CSV parser for anything beyond the simplest internal file, because quoted commas and empty cells are common in spreadsheet exports. Keep each row named so the Playwright report shows one meaningful test per CSV record.

### Should I put expected results in the data file?

Usually yes, if the expected result is part of the rule being tested. A pricing label, validation message, permission outcome, or redirect path can live in the row. Do not put procedural behavior in the data file. The row should describe the business case, while the TypeScript test or helper performs the setup and actions in a reviewable way.

### How do I run only one generated Playwright case?

Give every generated test a unique title that includes a stable scenario name. Then use your normal Playwright filtering workflow for test titles, or temporarily narrow the data rows during local diagnosis. The important part is uniqueness. If several rows produce the same title, filtering becomes unreliable and report output becomes harder to interpret, especially after retries.

### Is JSON better than CSV for AI-assisted test generation?

JSON is often easier for AI coding agents because the structure is explicit and nested data is natural. CSV is better when domain experts maintain a flat decision table in a spreadsheet. The best choice depends on ownership. If engineers own the cases and inputs are nested, use JSON. If QA analysts or product owners edit simple rows, CSV can work well with strict validation.
`,
};
