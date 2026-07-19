import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Aggregate Driven Synthetic Test Data Guide',
  description:
    'Build aggregate driven synthetic test data from histograms and counts with deterministic sampling, constraint checks, privacy gates, and provenance.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'aggregate driven synthetic test data',
  keywords: [
    'aggregate driven synthetic test data',
    'synthetic data distributions',
    'production safe test data',
    'histogram based data generation',
    'deterministic weighted sampling',
    'privacy preserving test data',
    'schema driven synthetic data',
    'synthetic dataset provenance',
  ],
  relatedSlugs: [
    'foreign-key-graph-relational-test-data-builder',
    'negative-api-tests-no-partial-write-row-count',
    'test-data-cleanup-residue-assertion-run-tag',
    'reserved-namespaces-pii-safe-synthetic-test-data',
  ],
  sources: [
    'https://csrc.nist.gov/pubs/sp/800/188/final',
    'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/',
    'https://fakerjs.dev/guide/usage',
    'https://spec.openapis.org/oas/v3.2.0.html',
  ],
  content: `Aggregate driven synthetic test data uses approved counts and ranges without moving live rows. Teams compute only the needed totals, buckets, or percentiles inside the source system, then review privacy risk. A fixed schema-based builder makes fresh rows and records the plan version, seed, and source rules.

This workflow extends the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer), whose rule is that live rows never leave their system. The [QASkills directory](/skills) adds API, DB, and safety practices after the team approves the count plan.

## Which Synthetic Data Distributions Support the Test Goal?

Synthetic data distributions should start with one clear test goal, such as page sizes, queue load bands, or duplicate handling at a chosen rate. Each goal should name the smallest set of counts needed to build useful cases.

Do not start by asking for a live row sample, since that moves row data before the team knows what matters. Start with schema rules and one test goal, then ask only for the counts needed to guide that test.

| Test decision | Candidate summary | Unnecessary row detail |
|---|---|---|
| exercise order-size bands | histogram of items per order | product names and customer ids |
| cover status workflow frequencies | counts by allowed status | complete order records |
| model event arrival bands | counts by approved time bucket | event payloads and actor ids |
| test duplicate handling | reviewed duplicate proportion | duplicated email values |
| cover amount boundaries | binned amount counts | exact transaction histories |

The proposed counts are not safe by default. Rare mixes, narrow groups, exact highs or lows, and small cells can reveal facts when joined with other data. Privacy and data owners must review the output before it leaves the source system.

NIST SP 800-188 lists synthetic data as one data-sharing model and calls for clear rules, measures, and privacy review. Use the [official NIST publication](https://csrc.nist.gov/pubs/sp/800/188/final) for formal program choices, since a blog example cannot set one safe privacy limit for all teams.

The ICO's [anonymisation guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/) asks whether someone could still be identified, not just whether names were removed. Follow the law and company rules that apply to your case, because synthetic data is not safe by default.

Aggregate driven synthetic test data needs a written goal, owner, approved fields, review date, and end rule. Remove a count plan when it no longer supports an active test, and do not keep live-system counts with no current use.

The [test data management strategies guide](/blog/test-data-management-strategies) helps decide whether common value mixes are needed at all. Plain schema-based fixtures are better when they answer the test without counts from a live system.

## How Can Production Safe Test Data Use Only Summaries?

Live rows stay inside the system that already guards them. Run approved count code there, inspect the result under current access rules, and export only a reviewed plan. Never copy raw row output to a local tool before the count step.

Use stable, reviewed queries tied to a schema version and time window, and check joins because copied join rows can skew counts. The plan should state filters, time zone, null rules, and whether deleted or test-tagged rows are left out.

The procedure is governance-first:

1. Define the behavior and minimum aggregate fields needed by the test.
2. Obtain approval to compute those counts inside the live system.
3. Run version-controlled aggregation against an approved snapshot or read path.
4. Review small cells, rare combinations, extrema, and linkage risk before export.
5. Generalize, suppress, or reject unsafe output according to organizational policy.
6. Sign off the plan version without exporting any source row.
7. Make new rows in an isolated test system from that plan.
8. Recheck the plan when schema, purpose, or source period changes.

This SQL sketch shows a count query, not a ready-made privacy rule. Its output must stay inside the source system until review is complete.

\`\`\`sql
-- Version-controlled summary query executed inside the protected system.
WITH eligible_orders AS (
  SELECT id, status, created_at
  FROM orders
  WHERE created_at >= :window_start
    AND created_at < :window_end
    AND test_run_id IS NULL
),
item_counts AS (
  SELECT o.id, o.status, count(i.id)::int AS items_per_order
  FROM eligible_orders o
  LEFT JOIN line_items i ON i.order_id = o.id
  GROUP BY o.id, o.status
)
SELECT
  status,
  width_bucket(items_per_order, :min_items, :max_items, :bucket_count) AS item_band,
  count(*)::int AS order_count
FROM item_counts
GROUP BY status, item_band
ORDER BY status, item_band;
\`\`\`

Parameters and bucket definitions come from the approved analysis plan, not choices made after viewing individual records to preserve a recognizable rare case. Record the database version and query revision because implementation details can affect boundaries and null treatment.

Leave out known synthetic or test-tagged rows so old fixtures do not shape the next plan. If the live system holds synthetic service data, use a governed source flag instead of guessing from names or domains.

Keep the exported plan free of row ids, free text, exact times, and fields the test does not need. A histogram needs bucket edges and counts, not a sample from each bucket. A group plan needs allowed groups and reviewed weights, not source keys.

Aggregate driven synthetic test data must never include a hidden sample for debugging. Diagnose summary code inside the protected scope with approved tools, since exporting one example row per bucket defeats the row-free contract.

The [database testing automation guide](/blog/database-testing-automation-guide) can test the count query with a small fake data set first. That proves joins and bucket edges without showing any live row.

## How Does Schema Driven Synthetic Data Combine Rules?

A count plan describes a value mix, not valid row shapes. OpenAPI, JSON Schema, SQL files, ORM models, and language types still define field rules. The source skill gives SQL DDL and schema files the top rank for stored data.

The [OpenAPI Specification](https://spec.openapis.org/oas/v3.2.0.html) defines the API contract and Schema Objects used at request edges. Map plan fields only to stated branches, and stop with a drift report if a plan group no longer exists in the current enum.

Build a field matrix:

| Field | Schema rule | Profile input | Generator responsibility |
|---|---|---|---|
| order status | declared enum | reviewed category weights | choose only current members |
| item count | API minimum and database relation | reviewed histogram | create exact child cardinality |
| amount | decimal precision and checks | approved value bins | generate a value inside each bin |
| created time | date-time format and storage type | approved time buckets | use fixed deterministic offsets |
| customer email | unique string format | no production input needed | use reserved synthetic namespace |
| order id | database generated key | none | capture returned identifier |

Plans must not override SQL rules. If an old value mix has a value the schema now rejects, report that drift and make valid values for passing tests. Add a rejected old value only when a schema change or support rule calls for that case.

Do not infer missing schema rules from value counts, since no nulls do not prove a field is required and distinct values do not prove a unique key. Read enforced declarations and report disagreements.

Group weights need a stated rule for unknown and new values. A new enum member should fail plan checks until an owner assigns a test case, since a silent zero weight can leave new behavior untested.

Number buckets need clear edge rules, including open and closed bounds, null handling, units, and decimal scale. The builder must choose values that fit both the bucket and schema checks without rounding across an edge.

The [OpenAPI-to-test-suite generation guide](/blog/openapi-spec-to-test-suite-generation) covers edge and reject cases. Aggregate driven synthetic test data adds passing rows across approved value bands, but it does not replace schema-based limits.

## How Should Synthetic Dataset Provenance Version Profiles?

Synthetic dataset provenance should live in a small plan that code can read. Store its goal, source window, query version, schema version, review id, fields, and builder rules, while leaving out keys, unapproved query output, and row samples.

A count plan can set exact targets instead of floating odds. Exact counts make the data mix easy to replay and avoid chance error in small test sets. Scale those counts with a stated rule when test size changes.

If CI asks for a new total, scale only when the approved plan allows it. Turn source counts into shares, set target counts, and place whole-number remainders with one fixed rule. Save both the requested total and final counts so reviewers can see the actual mix.

Do not force each nonzero group into a tiny set and call the result a matched mix. Set the smallest useful set for the test goal, or choose key groups on purpose. The plan must split share-based counts from extra coverage for rare but important cases.

Keep extra-sample rules apart from observed counts. A test plan may need more cancelled orders even when their reviewed source count is lower. Label those rows as a coverage count, not as proof of the source mix.

\`\`\`typescript
type CategoryCount<T extends string> = {
  value: T;
  count: number;
};

type DistributionProfile = {
  profileVersion: string;
  purpose: string;
  schemaRevision: string;
  aggregationQueryRevision: string;
  sourceWindow: { start: string; end: string };
  reviewId: string;
  orderStatuses: Array<CategoryCount<'pending' | 'paid' | 'cancelled'>>;
  itemBands: Array<{ minInclusive: number; maxInclusive: number; count: number }>;
};

export function validateProfile(profile: DistributionProfile): void {
  if (!profile.reviewId) throw new Error('Distribution profile requires privacy review');
  if (!profile.schemaRevision) throw new Error('Distribution profile requires schema revision');

  for (const item of profile.orderStatuses) {
    if (!Number.isInteger(item.count) || item.count < 0) {
      throw new Error('Status counts must be non-negative integers');
    }
  }
  for (const band of profile.itemBands) {
    if (band.minInclusive > band.maxInclusive || band.count < 0) {
      throw new Error('Invalid item-count band');
    }
  }
}
\`\`\`

The plan type lists status values from the current schema, but run-time checks are still needed because JSON input can bypass TypeScript. Use the project's current schema checker when one exists instead of writing a second set of rules.

Review data should point to an internal choice record, not hold reviewer emails or copied private notes. Keep full approval details in the governed tool and store only the id needed to trace the choice.

Plans expire, so add a review date or valid-use rule and make the builder reject stale input under team rules. Do not refresh from a live DB on its own, since that skips privacy review and changes tests without code review.

Time windows need meaning and an end date. Seasonal use, product launches, rule changes, and SQL changes can make an old plan wrong for a new goal. State why the chosen window supports the test instead of calling the latest period a fit for all cases.

Compare plan versions by counts only. A reviewer needs changed buckets, group counts, source-window details, and query versions, not samples of rows that moved. Keep any row-level check inside the source system under its normal access rules.

When a plan field disappears, retire tests that need it or give them a new goal. Keeping an old group just to satisfy fixture code may test a state the app no longer accepts. A legacy reject case should cite a schema or API rule, not old builder habits.

Version changes should produce a readable diff of bins, categories, counts, schema revision, and purpose. A large unexplained change is a review trigger, not something to accept because the file remains syntactically valid.

The sibling [reserved namespace guide](/blog/reserved-namespaces-pii-safe-synthetic-test-data) supplies safe field values that do not need weights from live rows. Keep identity-like defaults reserved even when count fields model other traits.

## How Does Deterministic Weighted Sampling Build Rows?

Turn approved counts into a fixed schedule, then make new rows for each slot. Shuffle that plan with a seeded builder only when order matters to the test, and save the seed and builder version so the plan can be replayed.

Faker's [official usage documentation](https://fakerjs.dev/guide/usage) explains seeded output and warns that upgrades can change results. Pin the version, set a fixed reference date, and use worker-safe sequences for unique fields. Faker should fill schema-valid synthetic values, never source-record lookalikes.

The generator below expands exact category counts, uses a seeded shuffle, and emits reserved emails. It accepts only an approved profile after validation.

\`\`\`typescript
import { Faker, en } from '@faker-js/faker';

type OrderStatus = 'pending' | 'paid' | 'cancelled';

export function buildStatusSchedule(
  counts: Array<CategoryCount<OrderStatus>>,
  seed: number,
): OrderStatus[] {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);

  const schedule = counts.flatMap(({ value, count }) =>
    Array.from({ length: count }, () => value),
  );
  return faker.helpers.shuffle(schedule);
}

export function createOrderInputs(input: {
  profile: DistributionProfile;
  seed: number;
  workerId: string;
  testRunId: string;
}) {
  validateProfile(input.profile);
  const statuses = buildStatusSchedule(input.profile.orderStatuses, input.seed);
  const fixedTime = new Date('2026-01-15T00:00:00.000Z');

  return statuses.map((status, index) => ({
    status,
    customerEmail:
      'aggregate-' + input.workerId + '-' + (index + 1) + '@example.test',
    createdAt: fixedTime,
    testRunId: input.testRunId,
  }));
}
\`\`\`

Exact allocation is often preferable for functional and integration suites because expected composition is known. Load tests may stream larger schedules, but they should still preserve seed, profile, schema, and allocation rules.

When fields move together, do not combine separate counts and claim their link was kept. Ask for an approved joint count only when the test goal needs that link. Otherwise state that the builder treats the fields as independent.

Avoid high-dimensional profiles assembled from many quasi-identifying dimensions. Even aggregated combinations can create sparse cells and disclosure risk. Reduce dimensions to the test purpose and send every proposed cross-tabulation through privacy review.

Aggregate driven synthetic test data also needs deterministic relationship cardinality. If the profile assigns three items to an order, the relational builder must create exactly three child rows and pass the returned order id to each.

The sibling [foreign-key graph builder](/blog/foreign-key-graph-relational-test-data-builder) handles insert order. Count plans choose row totals and groups, while graph builders enforce parent and child links.

## How Does Histogram Based Data Generation Validate Shape?

Histogram based data generation validates three layers. Schema checks cover each row, mix checks cover the approved profile, and link checks cover keys and row counts. Passing one layer cannot replace another.

Aggregate driven synthetic test data must prove the profile fits before it makes rows. Compare groups, units, bucket edges, and schema version with the current rules. Stop with a short drift report instead of mapping an unknown value to a nearby group.

Preserve the profile file and generated allocation summary as separate artifacts. The first records approved inputs; the second records what this run produced after scaling or oversampling. Mixing them would make a test-specific allocation appear to be an observed operational summary.

For relational output, validate counts at both entity and edge levels. Ten generated orders and thirty line items do not prove each order received its scheduled cardinality. Compare every created parent against its assigned band and verify each child carries the returned parent identifier.

For exact plans, compare generated row counts directly with profile counts. For numeric values inside buckets, count them with the profile's stated boundary rules. Do not add a tolerance when the builder was meant to generate an exact mix.

\`\`\`typescript
import { expect } from 'vitest';

export function expectStatusAllocation(
  rows: Array<{ status: OrderStatus }>,
  expected: Array<CategoryCount<OrderStatus>>,
): void {
  const actual = new Map<OrderStatus, number>();
  for (const row of rows) {
    actual.set(row.status, (actual.get(row.status) ?? 0) + 1);
  }

  for (const item of expected) {
    expect(actual.get(item.value) ?? 0).toBe(item.count);
  }
  expect(rows).toHaveLength(expected.reduce((sum, item) => sum + item.count, 0));
}
\`\`\`

Database insertion is the final constraint check. Do not weaken a check, foreign key, or unique index to accept generated rows. A rejection indicates generator drift, schema drift, or a profile value that no longer belongs.

Validate semantic coherence explicitly. A cancelled order should not acquire a paid-only child merely because status and child generation were sampled independently. Derive such rules from business code, schema checks, or documented contracts, then encode them in scenario builders.

Boundary and negative cases remain separate from frequency modeling. A profile with few maximum-size orders does not remove the need to test the declared maximum and one value beyond it. Frequencies prioritize positive scenarios; schemas generate boundaries.

Track duplicate intent. If the approved test decision requires some duplicate emails, create them deliberately from synthetic values and assert the exact duplicate allocation. Do not depend on random collisions, and do not borrow duplicated values from source records.

Use the [synthetic test data generation guide](/blog/synthetic-test-data-generation-guide) for broader field techniques. Pair it with the [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) when limited CI time requires prioritizing specific distribution bands.

## How Does Privacy Preserving Test Data Pass Review?

Privacy preserving test data passes review only when both its profile and output meet the stated rules. Review the profile before making rows. Then check safe ids, private schema details, odd free text, and source notes in each saved file.

Utility evidence should tie back to the named test decision. Report which bins, categories, and relationships were generated and which tests consumed them. Do not claim that matching selected aggregates makes the dataset equivalent to production.

Create a short build report for each run. Include the requested total, approved group counts, rejected profile entries, schema checks, link counts, seed, and profile version. Leave out row bodies because this report proves the mix; it is not another fixture export.

Read the report against the stated plan. An exact builder must match each count, while extra risk cases must match their separate coverage plan. Do not compare that extra set with source shares and label the planned gap as unexplained drift.

If generation fails midway, discard or clean every tagged row before retrying with the same inputs. Reusing a partial dataset changes relationship cardinalities and can duplicate unique values. The run tag and deterministic schedule make both residue detection and full replay possible.

Review utility after the consuming test runs. A profile can be valid and privacy-approved yet add no meaningful branch, boundary, or workload coverage. Remove dimensions that do not influence a test decision so future reviews remain focused and summaries stay minimal.

Privacy proof should name the approved count process and review; it must not claim zero risk. Small or linked counts can still reveal facts. Follow the team's formal rules for hiding, grouping, access, and file life.

Provenance should include:

| Provenance field | Reason |
|---|---|
| profile version | reproduces approved distributions |
| profile purpose | prevents unrelated reuse |
| schema revision | explains valid shape |
| aggregation query revision | traces summary semantics |
| review reference | confirms governance decision |
| generator and Faker versions | reproduces implementation |
| seed and fixed clock | reproduces ordering and time |
| run and worker ids | supports uniqueness and cleanup |

Never include source row ids, sample values, direct identifiers, or production screenshots in provenance. There are no source rows in the generator inputs. The profile contains only reviewed summaries.

Delete aggregate driven synthetic test data when its purpose ends, even if no row holds personal data. Profiles can show live-system patterns, while generated files can show private schema or test rules.

Tag every inserted row and exported artifact with a run identity. The sibling [test data cleanup residue assertion guide](/blog/test-data-cleanup-residue-assertion-run-tag) makes teardown count each owned resource and fail on anything remaining.

For rejected generated cases, use the sibling [negative API no-write procedure](/blog/negative-api-tests-no-partial-write-row-count). It proves validation errors leave no partial aggregate, outbox event, or related database residue.

## Run Aggregate Driven Synthetic Test Data in CI

Profile approval and use should be separate jobs. A governed task makes a reviewed, versioned counts file. Normal CI reads that file with no live DB link, then makes rows inside an isolated test system.

Never give normal test jobs live DB keys just to refresh value mixes. An automatic refresh joins broad access, an unreviewed export, and changing fixtures. Require a reviewed update when the test goal truly needs new counts.

Use this release procedure:

1. Validate profile schema, purpose, review reference, and expiry.
2. Verify the application schema revision is compatible with the profile.
3. Generate deterministic rows with pinned dependencies, seed, and fixed clock.
4. Assert reserved identity fields, exact allocations, constraints, and relations.
5. Run focused tests that cite the consumed profile version.
6. Run required API, database, and integration suites.
7. Delete all run-tagged resources and assert zero residue.
8. Publish safe evidence without generated payload dumps or source data.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) can split profile checks, row setup, tests, and cleanup into clear gates. Fail the run when review is missing, schema does not fit, counts are unavailable, or cleanup leaves data.

Start with schema-only rows, then add aggregate driven synthetic test data for one goal that plain fixtures cannot meet. Ask for the smallest count set, finish privacy review, and prove that the profile adds a named test path.

Install the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to inventory schemas, implement deterministic factories, and preserve the no-production-row rule. Keep the reviewed profile small enough that every field has an owner and purpose.

## Frequently Asked Questions

### Are aggregate summaries automatically anonymous?

No. Small groups, rare mixes, exact highs or lows, short time spans, and outside links can reveal facts. Compute counts inside the protected system and complete formal review before export. This guide sets no universal hiding limit and does not replace legal or privacy advice.

### Why not use a masked production database instead?

Masking starts with real rows and may keep linked traits, rare facts, missed columns, or free text. Schema-based setup makes new rows. Reviewed counts can add useful value mixes without moving source records, while reserved ids and source notes mark the output as test data.

### How often should a distribution profile be refreshed?

Refresh when the test goal, schema, source results, or review choice calls for it. Profiles need review and end rules, but one calendar cannot fit each system. An automatic live refresh is unsafe because it skips privacy review and changes fixtures without a code choice.

### Should generators sample probabilities or allocate exact counts?

Exact counts are usually simpler for functional and integration suites because composition is reproducible and assertions need no sampling tolerance. Seeded weighted sampling can suit other workloads, but record its method and seed. Never claim an approximate sample preserves distributions that were not explicitly validated.

### Can independent marginals reproduce correlated behavior?

No. Sampling status and item count on their own keeps only two separate mixes, not the link between them. Ask for an approved joint count when the test goal truly needs that link. Otherwise state this limit and make no claim that the pair acts like live data.

### What proves generated rows contain no production records?

The source chain proves it: inputs are schemas, reviewed count profiles, fixed settings, and builder code, with no row samples. Source notes save the profile, query version, review, schema, tool versions, seed, and run. Process guards keep live samples out of prompts, fixtures, and files.
`,
};
