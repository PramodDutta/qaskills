import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Model Data Distributions Without Real Rows',
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
  content: `Aggregate driven synthetic test data reproduces approved distribution summaries without copying, exporting, or prompting with production rows. Compute only necessary counts, histograms, or percentiles inside the owning system, review their disclosure risk, then parameterize deterministic schema-based generators. The resulting records are new, attributable, constraint-valid, and reproducible from a versioned profile.

This workflow extends the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer), whose rule is that production records never leave their system. The [QASkills directory](/skills) provides related API, database, and security practices after governance approves the profile.

## Start with a Test Decision, Not a Data Export

Distribution work begins with a named testing decision; examples include checking pagination across common order sizes, exercising queue behavior across declared workload bands, or verifying deduplication with an intentional duplicate rate. Each decision should identify the smallest summary needed to generate suitable cases.

Do not begin by asking for a representative production sample; that request moves row-level information before the team knows which property matters. Begin with schema constraints and a hypothesis about the behavior, then request only the aggregate needed to parameterize it.

| Test decision | Candidate summary | Unnecessary row detail |
|---|---|---|
| exercise order-size bands | histogram of items per order | product names and customer ids |
| cover status workflow frequencies | counts by allowed status | complete order records |
| model event arrival bands | counts by approved time bucket | event payloads and actor ids |
| test duplicate handling | reviewed duplicate proportion | duplicated email values |
| cover amount boundaries | binned amount counts | exact transaction histories |

The candidate summary is not automatically safe. Rare combinations, narrow groups, precise extrema, and small cells can reveal information when combined with outside knowledge. Privacy and data owners must review outputs before they leave the protected computation boundary.

NIST SP 800-188 identifies synthetic data based on identified data as one possible sharing model and emphasizes governance, measurable standards, and disclosure-risk review. Use the [official NIST publication](https://csrc.nist.gov/pubs/sp/800/188/final) for formal program decisions. A test engineer should not invent a universal privacy threshold from a blog example.

The ICO's [anonymisation guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/) also frames anonymisation around whether identification is reasonably likely, not merely whether names were removed. Apply the legal and organizational guidance relevant to your jurisdiction; synthetic generation does not grant automatic compliance.

Aggregate driven synthetic test data should have a written purpose, owner, approved profile fields, review date, and retirement rule. If a profile no longer supports an active test decision, remove it rather than retaining operational summaries indefinitely.

The [test data management strategies guide](/blog/test-data-management-strategies) helps decide whether aggregate realism is necessary at all. Boring schema-derived fixtures remain preferable when they answer the test without production-derived summaries.

## Compute Summaries Inside the Owning System

Production rows stay inside the system that already protects them. Run approved aggregation code there, inspect the result under existing access controls, and export only a reviewed profile. Never copy raw query output into a local notebook before aggregating.

Use stable, documented queries tied to a schema revision and observation window; review joins carefully because duplicated join rows can distort counts. The profile should state filters, timezone, null handling, and whether deleted or test-tagged records are excluded.

The procedure is governance-first:

1. Define the behavior and minimum aggregate fields needed by the test.
2. Obtain authorization to compute those summaries inside the production boundary.
3. Run version-controlled aggregation against an approved snapshot or read path.
4. Review small cells, rare combinations, extrema, and linkage risk before export.
5. Generalize, suppress, or reject unsafe output according to organizational policy.
6. Sign off the profile version without exporting any source row.
7. Generate new records in a non-production environment from that profile.
8. Reassess the profile when schema, purpose, or source period changes.

This SQL sketch illustrates summary computation, not a ready-made privacy policy. Its output must remain inside the owning system until reviewed.

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

Parameters and bucket definitions come from the approved analysis plan. Do not choose them after viewing individual records to preserve a recognizable rare case. Record the database version and query revision because implementation details can affect boundaries and null treatment.

Exclude known synthetic or test-tagged rows so previous fixtures do not influence the next profile. If production intentionally contains generated operational data, classification must come from a governed source flag rather than guessing from names or domains.

Keep the exported profile free of row identifiers, free text, exact timestamps, and unneeded dimensions. A histogram needs bin boundaries and counts, not examples from each bin. A categorical profile needs allowed categories and reviewed weights, not source primary keys.

Aggregate driven synthetic test data must never include a hidden sample for debugging. Diagnose aggregation code inside the protected boundary with approved tools. Exporting one example row per bucket defeats the row-free contract.

The [database testing automation guide](/blog/database-testing-automation-guide) can test the aggregation query against a small fully synthetic fixture before authorized execution. That verifies join and boundary behavior without exposing production records.

## Combine Profiles with Schema Constraints

An aggregate profile describes frequencies, not valid row shapes. OpenAPI, JSON Schema, migrations, ORM models, and language types still define fields and constraints. The source skill gives SQL DDL and migrations highest priority for stored data.

The [OpenAPI Specification](https://spec.openapis.org/oas/v3.2.0.html) defines the API contract and Schema Objects used at request boundaries. Map profile dimensions only to declared fields and branches. If an aggregate category no longer exists in the current enum, stop and report profile drift.

Build a field matrix:

| Field | Schema rule | Profile input | Generator responsibility |
|---|---|---|---|
| order status | declared enum | reviewed category weights | choose only current members |
| item count | API minimum and database relation | reviewed histogram | create exact child cardinality |
| amount | decimal precision and checks | approved value bins | generate a value inside each bin |
| created time | date-time format and storage type | approved time buckets | use fixed deterministic offsets |
| customer email | unique string format | no production input needed | use reserved synthetic namespace |
| order id | database generated key | none | capture returned identifier |

Profiles must not override constraints. If a historical distribution contains values now rejected by the schema, preserve that fact as drift evidence and generate valid current values for positive fixtures. Create explicit negative cases for rejected legacy values only when the migration or compatibility behavior requires them.

Do not infer missing schema rules from frequencies. A profile showing no nulls does not prove a field is non-nullable, and one showing unique values does not prove a unique constraint. Read enforced declarations and report disagreements.

Categorical weights need an explicit policy for unknown and newly added values. A new enum member should fail profile validation until an owner assigns a test strategy. Silently assigning zero weight can leave a new behavior untested.

Numeric bins need clear interval semantics. Record inclusive and exclusive boundaries, null handling, units, and decimal scale. The generator must select values satisfying both bin membership and schema checks without rounding across a boundary.

The [OpenAPI-to-test-suite generation guide](/blog/openapi-spec-to-test-suite-generation) covers boundary and negative cases. Aggregate driven synthetic test data complements that matrix by allocating positive cases across reviewed frequency bands, not by replacing schema-derived edges.

## Define a Versioned, Reviewable Profile

Represent approved summaries in a small machine-readable profile. Include purpose, source window, aggregation query revision, schema revision, review record, dimensions, and generator expectations. Do not include credentials, query results beyond approved summaries, or raw record examples.

A profile can express exact target counts rather than floating probabilities. Exact counts make dataset composition reproducible and avoid random sampling error in small test datasets. Scale those counts through a documented allocation method when test volume changes.

When CI requests a different total, scale only if the approved profile permits it. Convert source counts into proportions, calculate target allocations, and resolve integer remainders with one deterministic rule. Record both requested total and resulting counts so reviewers see the actual generated composition.

Do not force every nonzero source category into a tiny dataset and still describe the result as proportionally matched. Instead, define a minimum viable dataset for the test decision or select named categories deliberately. The profile should distinguish proportional generation from risk-based oversampling of rare but important cases.

Keep oversampling instructions separate from observed summaries. A test plan may require extra cancelled orders even when their reviewed source count is lower. Label those rows as a coverage allocation, not as evidence of the source distribution.

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

The profile type names allowed status values from the current schema. Runtime validation remains necessary because JSON and other external inputs bypass TypeScript. Use the project's existing schema validator when available rather than maintaining parallel checks.

Review metadata should identify an internal decision record, not contain reviewer email addresses or comments copied from sensitive discussions. Keep detailed approvals in the governed system and store only the reference required for traceability.

Profiles expire. Add a review date or validity policy and make the generator reject stale profiles according to team rules. Do not refresh automatically from production because that bypasses disclosure review and makes test results change without code review.

Time windows need semantic review as well as expiry. Seasonal behavior, product launches, policy changes, and migrations can make an old profile unsuitable for a new decision. Record why the chosen window supports the named test instead of labeling the latest available period universally representative.

Compare profile revisions at the aggregate level only. A reviewer needs changed bins, category allocations, source-window metadata, and query revisions, not examples of records that moved between groups. Keep any row-level investigation inside the protected system under its normal access controls.

When a profile dimension disappears, retire dependent tests or redesign their purpose. Keeping a stale category merely to preserve fixture compatibility can test a state the current product no longer accepts. Negative compatibility coverage should cite a migration or API requirement rather than inherited generator history.

Version changes should produce a readable diff of bins, categories, counts, schema revision, and purpose. A large unexplained change is a review trigger, not something to accept because the file remains syntactically valid.

The sibling [reserved namespace guide](/blog/reserved-namespaces-pii-safe-synthetic-test-data) supplies safe field values that do not need production-derived weights. Keep identity-like defaults reserved even when aggregate dimensions model other properties.

## Generate Deterministically from Exact Allocations

Turn approved counts into a deterministic schedule, then generate new rows for each slot. Shuffle the schedule with a seeded generator only when ordering matters to the test. Record the seed and generator version so the schedule can be replayed.

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

When several dimensions are correlated, do not multiply independent marginals and claim the joint distribution is preserved. Request an approved joint summary only when the test decision needs that relationship. Otherwise document independence as a generator limitation.

Avoid high-dimensional profiles assembled from many quasi-identifying dimensions. Even aggregated combinations can create sparse cells and disclosure risk. Reduce dimensions to the test purpose and send every proposed cross-tabulation through privacy review.

Aggregate driven synthetic test data also needs deterministic relationship cardinality. If the profile assigns three items to an order, the relational builder must create exactly three child rows and pass the returned order id to each.

The sibling [foreign-key graph builder](/blog/foreign-key-graph-relational-test-data-builder) handles that dependency order. Distribution schedules decide cardinality and categories; graph builders enforce parent-child construction.

## Validate Shape, Distribution, and Relationships

Validation has three layers. Schema checks prove each generated row is valid, distribution checks prove the output matches the approved profile, and relational checks prove references and cardinalities are coherent. Passing one layer cannot substitute for another.

Aggregate driven synthetic test data also needs profile-compatibility evidence before row generation begins. Compare profile categories, units, bin boundaries, and schema revision against the current contract. Fail with a concise drift report rather than mapping an unknown value to the nearest current category.

Preserve the profile file and generated allocation summary as separate artifacts. The first records approved inputs; the second records what this run produced after scaling or oversampling. Mixing them would make a test-specific allocation appear to be an observed operational summary.

For relational output, validate counts at both entity and edge levels. Ten generated orders and thirty line items do not prove each order received its scheduled cardinality. Compare every created parent against its assigned band and verify each child carries the returned parent identifier.

For exact allocations, compare observed generated counts directly with profile counts. For values selected inside numeric bins, count membership under the profile's interval semantics. Do not invent statistical tolerances when the generator was designed to produce exact composition.

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

## Review Privacy, Utility, and Provenance

A dataset can be constraint-valid yet inappropriate to export or retain. Review the aggregate profile before generation, then review generated artifacts for reserved identifiers, sensitive schema details, unexpected free text, and provenance completeness.

Utility evidence should tie back to the named test decision. Report which bins, categories, and relationships were generated and which tests consumed them. Do not claim that matching selected aggregates makes the dataset equivalent to production.

Create a compact generation report for each run. Include requested total, allocated counts by approved dimension, rejected profile entries, schema-validation results, relationship counts, seed, and profile version. Exclude generated row bodies because the report's purpose is composition evidence, not a fixture export.

Interpret that report against declared expectations. Exact-allocation generators should match counts exactly, while deliberately oversampled cases should match the separate coverage allocation. Never compare an oversampled output directly with source proportions and present the difference as unexplained drift.

If generation fails midway, discard or clean every tagged row before retrying with the same inputs. Reusing a partial dataset changes relationship cardinalities and can duplicate unique values. The run tag and deterministic schedule make both residue detection and full replay possible.

Review utility after the consuming test runs. A profile can be valid and privacy-approved yet add no meaningful branch, boundary, or workload coverage. Remove dimensions that do not influence a test decision so future reviews remain focused and summaries stay minimal.

Privacy evidence should identify the approved aggregation process and review, not assert that row-free output has zero risk. Summaries can still disclose information, particularly when sparse or linkable. Follow the organization's formal process for suppression, generalization, access, and retention.

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

Aggregate driven synthetic test data should be deleted when its purpose expires, even if the generated rows contain no personal records. Profiles can reveal operational patterns, and generated artifacts expose internal schemas or test assumptions.

Tag every inserted row and exported artifact with a run identity. The sibling [test data cleanup residue assertion guide](/blog/test-data-cleanup-residue-assertion-run-tag) makes teardown count each owned resource and fail on anything remaining.

For rejected generated cases, use the sibling [negative API no-write procedure](/blog/negative-api-tests-no-partial-write-row-count). It proves validation errors leave no partial aggregate, outbox event, or related database residue.

## Operationalize the Workflow in CI

Profile approval and profile consumption should be separate jobs. A governed process produces a reviewed, versioned summary artifact. Ordinary CI consumes that artifact without production connectivity, then generates data inside an isolated test environment.

Never give routine test jobs production credentials merely to refresh distributions. Automatic refresh combines privileged access, unreviewed export, and changing fixtures. Require an explicit reviewed update when the test decision justifies new summaries.

Use this release procedure:

1. Validate profile schema, purpose, review reference, and expiry.
2. Verify the application schema revision is compatible with the profile.
3. Generate deterministic rows with pinned dependencies, seed, and fixed clock.
4. Assert reserved identity fields, exact allocations, constraints, and relations.
5. Run focused tests that cite the consumed profile version.
6. Run required API, database, and integration suites.
7. Delete all run-tagged resources and assert zero residue.
8. Publish safe evidence without generated payload dumps or source data.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) can separate validation, generation, tests, and cleanup into explicit gates. Missing profile review, incompatible schema, unavailable distribution evidence, or cleanup residue should fail the workflow.

Start with schema-only generation and add aggregate driven synthetic test data only for one decision that boring fixtures cannot answer. Request the minimum summary, complete disclosure review, and prove the generated profile adds specific coverage.

Install the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to inventory schemas, implement deterministic factories, and preserve the no-production-row rule. Keep the reviewed profile small enough that every field has an owner and purpose.

## Frequently Asked Questions

### Are aggregate summaries automatically anonymous?

No. Small cells, rare combinations, exact extrema, narrow time windows, and external linkage can create disclosure risk. Compute summaries inside the protected system and apply formal organizational review before export. This guide does not define a universal suppression threshold or replace applicable legal and privacy guidance.

### Why not use a masked production database instead?

Masking begins with real records and can preserve linkable relationships, rare attributes, overlooked columns, and free text. Schema-based generation creates new rows. Reviewed aggregates can add needed frequency characteristics without transferring source records, while reserved identifiers and provenance keep generated artifacts visibly synthetic.

### How often should a distribution profile be refreshed?

Refresh only when the test purpose, schema, source behavior, or governance decision requires it. Profiles need a review and retirement policy, but no universal calendar fits every system. Automatic production refresh is unsafe because it bypasses disclosure review and changes fixtures without an intentional code decision.

### Should generators sample probabilities or allocate exact counts?

Exact counts are usually simpler for functional and integration suites because composition is reproducible and assertions need no sampling tolerance. Seeded weighted sampling can suit other workloads, but record its method and seed. Never claim an approximate sample preserves distributions that were not explicitly validated.

### Can independent marginals reproduce correlated behavior?

No. Independently sampling status and item count preserves only their separate marginals, not their relationship. Request an approved joint summary when the test decision genuinely depends on correlation. Otherwise document independence as a limitation and avoid claims about production-like joint behavior.

### What proves generated rows contain no production records?

The generation lineage provides that evidence: inputs are schemas, reviewed aggregate profiles, fixed configuration, and generator code, with no row-level source. Provenance records profile, query revision, review, schema, versions, seed, and run. Process controls prevent production samples from entering prompts, fixtures, or artifacts.
`,
};
