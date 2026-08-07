import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Data Synthetic PII Generation That Is Realistic and Safe',
  description: 'Build test data synthetic PII generation with deterministic seeds, locale-aware constraints, linked entities, privacy controls, and repeatable QA failure diagnosis.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Test Data Synthetic PII Generation That Is Realistic and Safe

Test data synthetic PII generation creates artificial people and identifiers that behave like the data your system expects without copying an actual person's identity. A strong generator starts from domain constraints, produces deterministic and referentially consistent records, marks every value as synthetic, supports locale and boundary profiles, and can reproduce a failed case from a seed. It should generate useful test evidence, not merely plausible-looking names.

The practical payoff is safer testing with fewer false failures. API, browser, migration, performance, and contract suites can receive repeatable customers, addresses, accounts, and relationships while privacy controls remain enforceable. This guide builds a TypeScript workflow from a data contract through seeded generation, scenario assembly, validation, CI publication, and incident diagnosis.

## Separate synthetic PII from masking and anonymization

Synthetic data is created without selecting a real individual as its source. Masked data begins with real records and transforms fields. Anonymized data is intended to prevent a person from being identified, but proving that outcome can be difficult when combinations of fields remain unique. These approaches have different risks and uses.

| Technique | Starts with production records | Preserves exact distributions | Privacy review needed | Typical QA use |
|---|---:|---:|---:|---|
| Handwritten fixtures | No | No | Low, if truly invented | Small regression cases |
| Rule-based synthetic generation | No | Approximate by design | Yes, for rules and outputs | Repeatable functional and load tests |
| Model-based synthetic generation | Not necessarily | Can approximate patterns | Yes, including memorization assessment | Complex distributions |
| Masking or tokenization | Yes | Often | High | Authorized staging replicas |
| Subsetting production data | Yes | Within selected rows | Very high | Exceptional controlled investigations |

Do not call masked production data synthetic. The distinction affects access controls, retention, incident response, and what can be attached to a CI artifact. A fake email address combined with a real name, precise birth date, and real postal address is still risky. Classify the record as a whole, not field by field.

## Translate the application contract into generator constraints

Begin with what the system accepts and what the test intends to exercise. Gather database constraints, API schemas, validation rules, normalization behavior, uniqueness rules, and cross-field business conditions. The generator should have an explicit contract for each field.

For a customer profile, that contract might look like this:

| Field | Valid generation rule | Boundary profile | Relationship rule |
|---|---|---|---|
| \`customerId\` | Synthetic namespace plus deterministic sequence | Maximum accepted length | Stable foreign-key target |
| \`fullName\` | Locale-specific invented components | One component, long Unicode | Must not imply a real source person |
| \`email\` | Reserved test domain | Local part near maximum accepted length | Unique after application normalization |
| \`birthDate\` | Date in allowed customer range | Exactly minimum-age boundary | Consistent with age-dependent products |
| \`phone\` | Recognizable non-routable test pattern | Missing optional value | Matches selected country profile |
| \`address\` | Invented street and valid structural shape | Long apartment line | Country, region, and postal format agree |

The generator contract should use the same vocabulary as the product. If an API accepts \`displayName\` but the database stores name parts, test data assembly must define where the transformation occurs. Otherwise a fixture can bypass a real validation path and give false confidence.

Represent the contract as data rather than scattering assumptions across tests:

\`\`\`ts
type CustomerProfile = 'baseline' | 'boundary' | 'invalid';

type CustomerSpec = {
  locale: 'en-IN' | 'en-US' | 'de-DE';
  profile: CustomerProfile;
  minimumAge: number;
  emailDomain: 'example.test';
  syntheticPrefix: 'qa-syn';
};

export const defaultSpec: CustomerSpec = {
  locale: 'en-IN',
  profile: 'baseline',
  minimumAge: 18,
  emailDomain: 'example.test',
  syntheticPrefix: 'qa-syn',
};
\`\`\`

\`example.test\` is visibly non-production test data. Your organization can use its own controlled non-delivery domain, but the key invariant is that generated email must not reach an external person's inbox.

## Make every failure reproducible with a seed and recipe

Randomness broadens examples, but unrecorded randomness makes a failure disappear. Every generated scenario needs a seed plus a versioned recipe. A test report should state both. Re-running the same generator revision with the same inputs must produce the same logical record.

This compact deterministic number source is suitable for illustrating the architecture. It is not a cryptographic generator:

\`\`\`ts
export function seededNumbers(seed: number) {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(this.next() * items.length)];
    },
  };
}
\`\`\`

For test repeatability, a stable pseudo-random sequence is useful. For secrets, tokens, passwords, or security properties, use a cryptographically secure platform facility and do not persist the value in test reports. The two jobs are different.

A recipe includes more than the numeric seed:

\`\`\`json
{
  "generator": "customer-synthetic",
  "recipeVersion": "customer-v3",
  "seed": 41029,
  "locale": "en-IN",
  "profile": "minimum-age-boundary",
  "recordCount": 25,
  "schemaRevision": "customer-api-current"
}
\`\`\`

Avoid using dates such as "today minus 18 years" without recording the clock. Age boundaries change with execution date and time zone. Accept a fixed \`asOfDate\` from the test so the same recipe remains reproducible.

## Construct identities from curated synthetic components

Do not scrape public profiles or paste a production frequency table into a repository. Use reviewed, invented component lists appropriate to the test. Mark obviously fictional outputs where user interfaces allow it. If a field must look natural, combine components in a way that avoids a claim that the output corresponds to a real person.

\`\`\`ts
type GeneratedCustomer = {
  customerId: string;
  fullName: string;
  email: string;
  birthDate: string;
  synthetic: true;
};

const given = ['Aarav-Test', 'Mira-Test', 'Noor-Test', 'Tara-Test'] as const;
const family = ['Sample', 'Fixture', 'Scenario', 'Automation'] as const;

export function generateCustomer(seed: number, index: number): GeneratedCustomer {
  const random = seededNumbers(seed + index);
  const id = 'qa-syn-' + seed + '-' + index;
  const first = random.pick(given);
  const last = random.pick(family);

  return {
    customerId: id,
    fullName: first + ' ' + last,
    email: id + '@example.test',
    birthDate: '1994-07-12',
    synthetic: true,
  };
}
\`\`\`

The values are intentionally traceable to a synthetic namespace. Realism comes from satisfying behaviorally relevant constraints, not fooling a human into believing the identity is genuine. If the test is about Unicode search, generate Unicode. If it is about delivery routing, use a controlled sink. If it is about a name label fitting in a card, generate relevant lengths and scripts.

## Design locale profiles around structure, not stereotypes

Locale support is more than translating a list of first names. Addresses, name ordering, administrative regions, postal formats, scripts, phone presentation, decimal separators, and calendars may differ. Build each profile from documented product requirements and review it with domain owners.

Keep identity traits out of behavior selection unless the product genuinely requires them. Do not infer gender, ethnicity, religion, income, or risk from a generated name or postal area. That produces biased tests and can smuggle discriminatory assumptions into product logic.

A locale profile can expose structural functions:

\`\`\`ts
type Address = {
  lines: string[];
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
};

type LocaleProfile = {
  makeName(sequence: number): string;
  makeAddress(sequence: number): Address;
  validateAddress(address: Address): string[];
};

const profiles: Record<string, LocaleProfile> = {
  'en-IN': indianEnglishProfile,
  'en-US': unitedStatesEnglishProfile,
  'de-DE': germanProfile,
};
\`\`\`

The profile owns coherent address construction. A shared scenario layer owns customer status, order history, and account relationships. This prevents a country formatter from quietly determining business outcomes.

## Generate linked scenarios, not bags of independent rows

Most failures live in relationships. An order belongs to a customer, a payment belongs to an order, an account has roles, and household members may share an address without sharing an email. Generating each table independently causes foreign-key failures or impossible states.

Use a scenario builder that allocates stable identifiers and passes references forward:

\`\`\`ts
type Scenario = {
  customer: GeneratedCustomer;
  account: { accountId: string; customerId: string; status: string };
  orders: Array<{ orderId: string; customerId: string; totalCents: number }>;
};

export function customerWithOrders(seed: number, orderCount: number): Scenario {
  const customer = generateCustomer(seed, 0);
  const accountId = 'qa-account-' + seed;
  const orders = Array.from({ length: orderCount }, (_, index) => ({
    orderId: 'qa-order-' + seed + '-' + index,
    customerId: customer.customerId,
    totalCents: 1000 + index * 125,
  }));

  return {
    customer,
    account: { accountId, customerId: customer.customerId, status: 'active' },
    orders,
  };
}
\`\`\`

Add named scenario templates for states such as "new customer with no orders," "active customer with refunded order," and "account pending deletion." Names make test intent readable. Seeds vary examples within a state, while the template guarantees the state remains meaningful.

| Scenario dimension | Values to model | Defect class exposed |
|---|---|---|
| Lifecycle | Invited, active, suspended, deletion pending | Authorization and state-transition defects |
| Relationship | No orders, one order, many orders, shared address | Join, aggregation, and ownership defects |
| Completeness | Required only, all optional, selected nulls | Null handling and default defects |
| Time | New, boundary date, long inactive | Expiry, retention, and time-zone defects |
| Locale | Supported structural profiles | Formatting, search, and validation defects |
| Validity | Valid, near boundary, intentionally invalid | Positive and negative validation behavior |

## Keep valid, boundary, and invalid generators separate

A generator that sometimes emits invalid email by chance makes every consumer test flaky. Baseline generation should always satisfy its declared schema. Boundary generation should deliberately hit a documented edge. Invalid generation should state exactly which rule it violates and keep unrelated fields valid.

The output should carry expectations:

\`\`\`ts
type GeneratedCase<T> = {
  value: T;
  expected: 'accept' | 'reject';
  violatedRule?: string;
  seed: number;
};

export function missingEmailCase(seed: number): GeneratedCase<Record<string, unknown>> {
  const customer = generateCustomer(seed, 0);
  const value: Record<string, unknown> = { ...customer };
  delete value.email;
  return {
    value,
    expected: 'reject',
    violatedRule: 'email-required',
    seed,
  };
}
\`\`\`

This design prevents a negative fixture from being reused accidentally in a happy-path load test. It also lets reports say which rejection was expected. When the API returns an error for the wrong reason, assert the product's stable error contract rather than accepting any \`400\` response.

## Validate generator output before it reaches the test target

The generator needs its own tests. Validate schema, uniqueness after normalization, foreign keys, temporal consistency, synthetic markers, controlled domains, and the absence of prohibited patterns. Run these checks before inserting data or calling the application.

\`\`\`ts
import assert from 'node:assert/strict';

export function validateScenario(scenario: Scenario) {
  assert.equal(scenario.customer.synthetic, true);
  assert.ok(scenario.customer.customerId.startsWith('qa-syn-'));
  assert.ok(scenario.customer.email.endsWith('@example.test'));
  assert.equal(scenario.account.customerId, scenario.customer.customerId);

  const orderIds = new Set<string>();
  for (const order of scenario.orders) {
    assert.equal(order.customerId, scenario.customer.customerId);
    assert.equal(orderIds.has(order.orderId), false);
    orderIds.add(order.orderId);
  }
}
\`\`\`

For a large dataset, validate aggregate expectations too: row counts, null rates, category proportions, unique normalized email count, and referential completeness. Save those observations with the recipe. If a generator change shifts a distribution, reviewers can see it.

Generator unit tests fit into the normal JavaScript ecosystem. If the repository is deciding how to organize fast validation, the [2026 guide to JavaScript testing frameworks](/blog/javascript-testing-frameworks-complete-guide-2026) provides a broader comparison while this article focuses on data design.

## Load synthetic data through the right boundary

Choose the insertion path based on what the test needs to prove.

| Load path | Advantages | Blind spot | Use it for |
|---|---|---|---|
| Public API | Exercises validation and side effects | Slower, limited setup states | End-to-end customer workflows |
| Internal test-support API | Fast and domain aware | Must be secured outside test environments | Complex integration preconditions |
| Repository or service layer | Precise application state | Bypasses transport validation | Service integration tests |
| Direct SQL | Fast bulk loading | Bypasses application rules and events | Migration and query tests with separate validation |
| Message publication | Exercises asynchronous path | Requires idempotency and waiting | Event-driven workflows |

For API-created fixtures, attach the recipe identifier so cleanup and investigation remain possible:

\`\`\`ts
import assert from 'node:assert/strict';

export async function createSyntheticCustomer(baseUrl: string, seed: number) {
  const generated = generateCustomer(seed, 0);
  const response = await fetch(baseUrl + '/customers', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-test-recipe': 'customer-v3:' + seed,
    },
    body: JSON.stringify(generated),
  });
  assert.equal(response.status, 201);
  return response.json();
}
\`\`\`

The header is an example of an application-specific test contract, not a standard. Only add it if the service explicitly supports and secures it. A detailed Node request workflow can also use [SuperTest for API test setup and assertions](/blog/supertest-node-api-testing-complete-guide).

## Prevent generated contact data from escaping

The generator is only one layer of protection. Test systems must block outbound email, SMS, postal, and payment effects. Route messages to a local capture service or a controlled sink. Deny production endpoints at network and configuration layers. Use clearly synthetic payment instruments provided by the payment service's documented sandbox.

Add an egress test: create a generated customer, trigger every notification type, then assert all deliveries stayed inside the test sink. This proves routing, not just address appearance. A typo in \`example.test\` should not create a real domain destination.

Never generate government identifiers, financial account values, or phone numbers by producing a random number that happens to satisfy a checksum and could belong to someone. Use provider-documented test values, reserved ranges where officially designated, or an application test namespace that cannot be submitted externally. Structural validity and safe routability are separate requirements.

## Scale generation without creating collisions or CI contention

Parallel workers often start with the same seed and generate identical email addresses. Allocate a namespace from run ID, worker ID, and sequence. Keep the logical seed separate so a failure is still replayable.

\`\`\`ts
type Namespace = {
  run: string;
  worker: number;
};

export function uniqueSyntheticId(namespace: Namespace, seed: number, index: number) {
  const safeRun = namespace.run.replaceAll(':', '-');
  return [
    'qa-syn',
    safeRun,
    String(namespace.worker),
    String(seed),
    String(index),
  ].join('-');
}
\`\`\`

If application normalization lowercases or strips punctuation, uniqueness must be checked after that normalization. Database uniqueness is the final arbiter, but detecting collisions before a 100,000-row insert produces a much better diagnostic.

For load testing, stream batches instead of constructing the entire dataset in memory. Keep the recipe capable of regenerating batch N. Measure generation time separately from target-system time, or the load generator itself may become the bottleneck and hide service capacity.

## Store recipes and summaries, not unnecessary identities

CI artifacts should usually contain the seed, generator revision, scenario name, counts, validation summary, and identifiers needed for cleanup. They do not need every generated name and address. Even artificial identities can become operationally sensitive when combined with tokens, internal URLs, or account state.

A concise manifest supports replay:

\`\`\`yaml
recipe: customer-v3
seed: 41029
asOfDate: 2026-08-07
locale: en-IN
scenario: active-customer-with-two-orders
namespace:
  run: ci-87214
  worker: 3
counts:
  customers: 1
  orders: 2
validation: passed
\`\`\`

Set artifact retention to the shortest period that supports debugging and audit requirements. Cleanup should target the synthetic namespace, verify it cannot match non-test records, and report what was removed. Avoid a broad delete condition such as an email-domain match unless the domain is an enforced, exclusive marker and the environment is confirmed.

## Diagnose a generated-data failure without dismissing it as random

Suppose an API suite fails only for seed 41029. The response says the email already exists, even though the raw emails differ. Replaying locally reproduces the issue. The database has a unique index on a normalized email, and the application removes punctuation from the local part. Two generator workers produced values that differ before normalization but collide afterward.

Diagnosis follows the data lineage. Retrieve the recipe revision and seed from the test report. Regenerate the records without calling the API. Compare raw values, application-normalized values, and database keys. Confirm worker namespace allocation and whether the generator version in CI matches local code. Then add a generator invariant asserting post-normalization uniqueness.

The wrong response is to choose a new seed and rerun. That hides a production-relevant equivalence class. Another common mistake is increasing random length without understanding normalization. More random characters do not help if the application discards them.

| Failure signature | Generator question | Product question |
|---|---|---|
| Duplicate key | Are values unique after normalization? | Is uniqueness behavior documented? |
| Unexpected validation rejection | Did the locale profile satisfy the contract revision? | Did validation change without schema communication? |
| Notification reached outside | Was a controlled destination used? | Are egress blocks correctly enforced? |
| Orphaned child record | Did scenario assembly preserve references? | Are writes transactional or compensating? |
| Replay differs | Were seed, clock, locale, and recipe recorded? | Did an external dependency introduce variability? |

## Review the generator as part of the product interface

Generator changes can make hundreds of tests pass or fail without any product change. Require review from QA plus the domain or data owner when constraints change. Version recipes when reproducibility would otherwise break. Keep old recipe readers long enough to replay recent CI incidents, or preserve a build artifact containing the generator revision.

Track generator health with acceptance rate for valid profiles, intended rejection rate for invalid profiles, collision rate, generation throughput, cleanup success, and replay success. A valid generator should not depend on repeated retries until data happens to pass. Rejection is a defect in the generator contract unless the profile is explicitly invalid.

What people get wrong most often is equating variety with coverage. Ten million arbitrary names do less useful work than a small matrix tied to name length, Unicode normalization, ordering, optional parts, and rendering behavior. Generate against risk dimensions, then vary within them.

## Detect generator drift without freezing every generated value

A giant golden file of generated customers makes changes visible, but it also creates noisy reviews whenever an invented component list changes. Prefer property-level regression checks for most behavior. Given a fixed recipe, assert deterministic output. Across a defined seed range, assert that every baseline record passes the product schema, every identifier is in the synthetic namespace, normalized emails are unique, relationship references resolve, and scenario proportions stay within intentional bounds.

Use a small golden set only for cases where the exact serialized shape is the contract, such as a fixture consumed by several repositories. Give that set a recipe version, review diffs as data-contract changes, and never refresh snapshots automatically just to make CI green.

Metamorphic checks are especially useful for generation. Changing only the worker namespace should change unique identifiers but not the scenario's business state. Reordering record creation should not change a customer's birth date or status when those values derive from the customer seed. Increasing order count should preserve the existing order prefix and append deterministic records. Moving the fixed as-of date by one day should affect only time-derived classifications whose boundary is crossed.

Track distribution drift separately from individual replay. If a locale profile is expected to produce 20 percent missing optional address lines, compare the observed rate over a stable sample with a reviewed tolerance. A sudden shift to zero may mean a refactor stopped exercising null handling. A shift to 80 percent can distort performance and user-interface results. These are generator test failures even when each record is individually valid.

When a recipe changes intentionally, document which risks gain or lose representation. This keeps test data evolution tied to QA coverage instead of treating the generator as an invisible utility.

## Frequently Asked Questions

### Is synthetic PII automatically exempt from privacy and security controls?

No. Synthetic records can still contain secrets, internal account state, realistic contact destinations, or values accidentally derived from real people. A model can also reproduce training examples if its provenance and memorization risk are not controlled. Classify the creation process, validate outputs, restrict egress, limit artifact retention, and review access. The safest design starts from invented components and approved structural rules, marks every record, and never gives test jobs production credentials. Organizational policy and applicable law determine the final controls.

### Should a generator use a new random seed on every CI run?

It can, provided the chosen seed and every other variable are recorded. A useful pattern runs a small fixed regression seed set plus one run-specific seed. Fixed seeds protect known boundaries, while the rotating seed explores additional combinations. On failure, print the recipe, seed, clock, locale, namespace, and generator revision, then preserve them in the test result. Do not retry automatically with a different seed and call the test healed, because that discards the evidence needed to reproduce the defect.

### How realistic should invented names, addresses, and phone values look?

They should be realistic only in dimensions relevant to behavior: allowed scripts, lengths, structural fields, formatting, normalization, and relationships. They do not need to impersonate a real individual. Use controlled domains and destinations, visibly synthetic markers where possible, and officially documented test values for external providers. Avoid stereotypes and avoid inferring sensitive traits from names or locations. The test plan should explain which property each profile exercises, so realism remains purposeful rather than cosmetic.

### Can synthetic records replace every production-data investigation?

Not always. A defect may depend on a rare historical state or distribution that the current generator does not model. Start by extracting the minimal structural property from the incident and reproduce it with an invented fixture. If authorized specialists must inspect production data, use controlled access, minimize fields, preserve audit trails, and do not copy the record into ordinary CI. Feed the learned constraint back into a synthetic scenario so future regression testing no longer depends on the original person's data.
`,
};
