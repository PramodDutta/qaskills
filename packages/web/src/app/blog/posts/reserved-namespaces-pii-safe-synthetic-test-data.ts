import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'PII Safe Test Data Reserved Namespaces',
  description:
    'Create PII safe test data reserved namespaces with RFC domains and IP ranges, seeded Faker factories, provenance, validation, and egress controls.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'PII safe test data reserved namespaces',
  keywords: [
    'PII safe test data reserved namespaces',
    'reserved domains for testing',
    'synthetic PII test data',
    'RFC 2606 test domains',
    'RFC 5737 TEST-NET',
    'seeded Faker test data',
    'privacy safe test fixtures',
    'synthetic data provenance',
  ],
  relatedSlugs: [
    'foreign-key-graph-relational-test-data-builder',
    'negative-api-tests-no-partial-write-row-count',
    'test-data-cleanup-residue-assertion-run-tag',
    'aggregate-driven-synthetic-test-data-without-production-rows',
  ],
  sources: [
    'https://www.rfc-editor.org/rfc/rfc2606',
    'https://www.rfc-editor.org/rfc/rfc5737',
    'https://fakerjs.dev/guide/usage',
    'https://csrc.nist.gov/pubs/sp/800/188/final',
  ],
  content: `PII safe test data reserved namespaces use made-up identities plus domains and IP ranges set aside for tests and docs. They keep fixtures away from normal inboxes, sites, and public IPs, while fixed seeds and source notes support replay and network blocks stop real sends.

This guide applies the privacy rules in the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer). Browse [QASkills](/skills) for complementary API, security, and database workflows once the data policy is fixed.

## Why Is Synthetic PII Test Data Safer Than Masked Rows?

Synthetic data begins from stated shapes, rules, and approved settings rather than copied rows. A masked export begins with personal data and changes it, so the two methods carry different privacy risks even when both outputs look fake.

The source skill sets a strict boundary: production rows never leave their system. Engineers may read OpenAPI, JSON Schema, SQL DDL, ORM models, and approved aggregate summaries. They must not paste production samples into prompts, fixture files, tickets, or external generation services.

NIST SP 800-188 lists synthetic data as one way to share data and warns that masking alone may not remove identity risk. Read the [official NIST publication](https://csrc.nist.gov/pubs/sp/800/188/final) when a formal review is needed. This guide does not claim that fake-looking data meets any law or company rule.

| Data approach | Starts from real rows? | Link back to a person | Appropriate default for tests |
|---|---:|---|---|
| schema-driven synthetic generation | no | none by construction from records | yes |
| aggregate-driven synthetic generation | summaries only | depends on aggregate review | yes, with governance |
| deterministic substitution | yes | mapping may be reversible | restricted legacy use |
| masked production copy | yes | linkage and missed fields can remain | avoid by default |
| raw production sample | yes | direct | prohibited for fixtures |

Reserved spaces solve one small part of safe data setup. They make contact values easy to spot as test values and keep them away from normal public identifiers. They do not prove the input had no live rows, so the source record must state how the data was generated.

A generated name can still resemble a real person's name by coincidence. Treat it as synthetic because it came from a generator without source rows, not because it sounds unusual. Do not search for a real person and alter their details; that still begins from personal data.

PII safe test data reserved namespaces should be part of a written fixture policy. The policy defines allowed sources, banned fields, reserved value spaces, seeds, clock, schema version, target environments, and review ownership. Tests then enforce policy instead of relying on reviewer memory.

The [test data management strategies guide](/blog/test-data-management-strategies) helps place synthetic data beside isolation and cleanup controls. Data rules and test-system rules should support each other, but they solve different risks.

## Which Reserved Domains for Testing Fit Each Field?

Create a field map from schemas before generating values. For every property, record type, nullability, uniqueness, length, enum, format, relation, and any database check. Then assign a safe generator and a reserved or project-approved value space where one exists.

RFC 2606 reserves \`.test\`, \`.example\`, \`.invalid\`, and \`.localhost\` for specific special uses, and also identifies \`example.com\`, \`example.net\`, and \`example.org\` as example domains. The [RFC 2606 text](https://www.rfc-editor.org/rfc/rfc2606) recommends \`.test\` for testing. Use addresses such as \`user-17@example.test\` when the application accepts that domain.

RFC 5737 defines \`192.0.2.0/24\`, \`198.51.100.0/24\`, and \`203.0.113.0/24\` as documentation address blocks. The [RFC 5737 text](https://www.rfc-editor.org/rfc/rfc5737) also says these addresses should not appear on the public Internet. Use them as stored examples and test inputs, not as actual local bind addresses or a substitute for network isolation.

| Field type | Safe test space | Example | Additional control |
|---|---|---|---|
| email | unique local part under \`.test\` | \`buyer-w2-17@example.test\` | block outbound mail |
| domain | reserved test or example name | \`tenant-17.example.test\` | prevent DNS-dependent assumptions |
| public IPv4 input | RFC 5737 documentation block | \`198.51.100.17\` | never route as a real endpoint |
| URL | HTTPS plus reserved host | \`https://api.example.test/orders/17\` | fake HTTP dependency |
| phone | project-approved fictional range | \`+1-555-0117\` | sandbox messaging provider |
| company | generated neutral label | \`Synthetic Works 17\` | avoid real brands |
| payment instrument | provider-documented test value only | provider-specific | sandbox account only |

Not each format has a reserved test space. For government ids, bank routes, cards, and vendor account ids, use only values stated in that test system's docs. If no safe value exists, fake the service edge instead of making a realistic id.

PII safe test data reserved namespaces must stay safe after the app changes their form. Lowercase email, parsed URLs, and stored addresses must remain in the approved space. Check the saved and sent values, not just the builder's first string.

Treat subdomains carefully. A suffix check must require a label boundary, because a hostname such as \`notexample.test.invalid-value\` can fool casual string logic. Parse the host, normalize it through the application's URL handling, and compare against a reviewed set of exact hosts or permitted suffixes.

Reserved examples still need clear roles, so use fixed local parts for a buyer, admin, and rejected user when a failed test must read well. Do not add real staff names, ticket text, or customer ids just to make a fixture easy to spot.

Length and pattern constraints still apply. A safe email that exceeds the database column is not a valid default, though it may be a useful boundary case. Build one boring valid value first, then derive negative and edge cases from declared constraints.

The [synthetic test data generation guide](/blog/synthetic-test-data-generation-guide) provides wider factory patterns. PII safe test data reserved namespaces supply the value policy those factories should obey for contact and network-like fields.

## How Do Seeded Faker Test Data Factories Stay Repeatable?

Seeded generation turns failures into reproducible cases. The same generator version, seed, schema, fixed clock, worker identity, and call sequence should produce the same logical dataset. Record all of those inputs in provenance.

Faker documents that setting a seed can produce consistent results, while library upgrades may change outputs because underlying data can change. Its [official usage guide](https://fakerjs.dev/guide/usage) also notes that relative-date methods need a fixed reference date for reproducibility. Pin the package version and set the reference clock explicitly.

Random output does not promise distinct values. Build unique fields from worker id and a rising count, then use Faker for plain text that may repeat under the skill's rule for deterministic data factories.

\`\`\`typescript
import { Faker, en } from '@faker-js/faker';

type SyntheticUser = {
  email: string;
  displayName: string;
  ipAddress: string;
  callbackUrl: string;
  createdAt: Date;
  testRunId: string;
};

export function createSyntheticUserFactory(input: {
  seed: number;
  workerId: string;
  testRunId: string;
}) {
  const faker = new Faker({ locale: [en] });
  faker.seed(input.seed);
  faker.setDefaultRefDate('2026-01-15T00:00:00.000Z');
  let sequence = 0;

  return (overrides: Partial<SyntheticUser> = {}): SyntheticUser => {
    sequence += 1;
    const key = input.workerId + '-' + sequence;
    return {
      email: 'user-' + key + '@example.test',
      displayName: faker.person.fullName(),
      ipAddress: '198.51.100.' + ((sequence % 254) + 1),
      callbackUrl: 'https://callback-' + key + '.example.test/events',
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      testRunId: input.testRunId,
      ...overrides,
    };
  };
}
\`\`\`

The builder keeps reserved ids fixed and lets a test name each override. A test can pass a bad email for a reject case, while safe defaults still look like test data.

Do not freeze Faker names in a snapshot contract, since a package update may change them while all schema rules still pass. Check app results and reserved-space rules, then save the package version so the team can replay an unexpected value.

Keep names, labels, and free text plain, avoiding health details, abuse text, real company names, and likely secrets unless an approved safety test needs them. A tool may be able to make a field, but that does not make each possible value safe.

The sibling [aggregate-driven synthetic data guide](/blog/aggregate-driven-synthetic-test-data-without-production-rows) shows how approved counts can guide this builder. Keep row samples out of its input even when a team asks for lifelike results.

## Why Do RFC 2606 Test Domains Need Policy Checks?

Factory tests should prove that every value remains inside its assigned space. A typo changing \`example.test\` to a live domain can turn a harmless test into an outbound email risk, so rule checks must catch that drift before an end-to-end run.

Write validators against parsed values rather than loose substring checks. Email domain equality is stronger than \`endsWith('test')\`, and IP range parsing is stronger than checking a textual prefix. URL validation should inspect protocol, hostname, credentials, and port according to the test policy.

Use an ordered policy check:

1. Parse the value with the same standards-aware library used by the application where practical.
2. Confirm the format matches the schema's valid default requirements.
3. Confirm the normalized domain, host, or address belongs to the approved allowlist.
4. Reject embedded credentials, unexpected ports, and redirect targets outside the safe space.
5. Assert worker and sequence uniqueness where the database declares uniqueness.
6. Run boundary and negative cases separately so invalid values never become defaults.

\`\`\`typescript
import { expect, test } from 'vitest';

const TEST_NET_2 = /^198\.51\.100\.(?:[1-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-4])$/;

function expectReservedUser(user: SyntheticUser): void {
  const emailDomain = user.email.split('@')[1];
  const callback = new URL(user.callbackUrl);

  expect(emailDomain).toBe('example.test');
  expect(TEST_NET_2.test(user.ipAddress)).toBe(true);
  expect(callback.protocol).toBe('https:');
  expect(callback.hostname.endsWith('.example.test')).toBe(true);
  expect(callback.username).toBe('');
  expect(callback.password).toBe('');
}

test('keeps generated contact values in approved spaces', () => {
  const buildUser = createSyntheticUserFactory({
    seed: 4242,
    workerId: 'w3',
    testRunId: 'run-reserved-17',
  });
  const users = [buildUser(), buildUser(), buildUser()];

  users.forEach(expectReservedUser);
  expect(new Set(users.map((user) => user.email)).size).toBe(users.length);
});
\`\`\`

The regular expression is limited to this documented example range and excludes network and broadcast endpoints by policy. A production codebase may prefer a reviewed IP parser. The test's purpose is to make the approved namespace explicit, not to build a general networking library.

PII safe test data reserved namespaces also need negative policy tests. Supply a normal public domain, an out-of-range address, a URL with credentials, and a reused unique email. Confirm the generator validator rejects them before any integration adapter runs.

Keep rule checks close to shared builders. If each test writes its own domain check, the rules will drift, while one builder and one checker give the team a single review point for safe-space changes.

Version the namespace policy when allowed values change. Store that version in dataset provenance and CI evidence, then rerun factory tests against every active fixture artifact. A policy update should not silently reinterpret an old dataset as approved.

Checks must cover each format change too. Make the value, encode the API call, read it through the server, and inspect what the DB stored. This catches trimmed spaces, case changes, URL edits, or field maps that a source-object check can miss.

For bulk datasets, validate every unique contact and network value before insertion, then report counts by rule. Stop at the first concise sample for diagnostics without printing the complete dataset. The full count shows scope while the limited sample reduces unnecessary exposure of internal test artifacts.

The [OpenAPI-to-test-suite guide](/blog/openapi-spec-to-test-suite-generation) can derive format and length cases from API contracts. Apply reserved-space validation after schema generation so valid defaults satisfy both contract and privacy policy.

## Why Does RFC 5737 TEST-NET Still Need Delivery Blocks?

Reserved values reduce accidental targeting, but test infrastructure must still prevent real delivery. Configure mail, SMS, webhooks, payments, and object storage to use fakes, provider sandboxes, isolated tenants, or blocked egress. Defense in depth assumes one layer can fail.

An email ending in \`.test\` should not resolve through normal DNS, yet an application can still hand it to a provider API. The provider may reject it, store it, or expose it in logs. A fake transport gives deterministic evidence that no outbound delivery was attempted.

Documentation IP blocks should not be used as real destinations. Do not issue network calls and rely on routing failure for safety. Inject an HTTP fake or intercept the adapter before the socket boundary, then assert the requested URL stayed inside the approved host set.

| Integration | Safe data layer | Execution control | Required assertion |
|---|---|---|---|
| email | \`@example.test\` recipient | fake transport or sandbox | no production provider call |
| SMS | approved fictional number | provider test credentials | no billable send |
| webhook | reserved host URL | local fake server | exact request captured locally |
| payment | documented test token | provider sandbox | no live account access |
| object storage | run-specific synthetic key | test bucket and credentials | production bucket denied |
| DNS or IP feature | RFC reserved input | network adapter fake | no public route attempt |

Environment credentials should make a production call impossible even when code receives a malformed fixture. Separate test and production accounts, deny production endpoints from CI, and fail startup when required sandbox markers are absent.

Test both safety layers on their own. A unit test proves the client rejects hosts outside the rules, while an end-to-end test proves CI has only sandbox keys and blocked live routes. If one guard is removed, the other must still stop the send and fail clearly.

PII safe test data reserved namespaces make faults easy to read because approved targets stand out. They cannot find a hard-coded live inbox in app code, so a transport spy must check the full set of targets seen in each run.

Exercise fallback paths as well as the primary provider. Applications sometimes switch endpoints after a timeout or retry through a secondary transport. Configure every fallback for the test environment, force the transition, and prove no request reaches production credentials, domains, queues, or accounts.

Do not log entire generated payloads by default. Synthetic data can still contain security test strings, tokens issued by sandboxes, or internal identifiers. Log seed, run id, schema version, and safe failing field paths instead.

A negative API test should confirm rejected synthetic input creates no partial database state or delivery. The sibling [negative API no-write tutorial](/blog/negative-api-tests-no-partial-write-row-count) combines response evidence with scoped row counts and side-effect probes.

PII safe test data reserved namespaces are therefore one control, not the whole safety model. Pair them with environment checks, adapter fakes, scoped credentials, egress policy, and cleanup assertions.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) can check sandbox settings before test jobs receive outside keys. Run these safety checks before any service client starts.

## What Should Synthetic Data Provenance Record?

Synthetic data provenance should tell a reader how the data was generated. Save the builder name and version, seed, fixed clock, schema version, locale, worker ID, run ID, build time, and approved summary version. These facts let the team replay a fault and show that the file is not an export.

Do not include source row identifiers because there should be no source rows. Do not attach raw production queries, screenshots, or samples as proof of realism. Provenance should positively state \`sourceKind: schema-and-approved-aggregates\` and the reviewed inputs.

\`\`\`json
{
  "generatedBy": "secure-test-data-factory",
  "generatorVersion": "1.0.0",
  "fakerVersion": "pinned-by-lockfile",
  "seed": 4242,
  "referenceTime": "2026-01-15T00:00:00.000Z",
  "schemaRevision": "orders-2026-07-18",
  "sourceKind": "schema-and-approved-aggregates",
  "profileVersion": null,
  "testRunId": "run-reserved-17",
  "workerId": "w3"
}
\`\`\`

Store provenance beside exported fixture artifacts and include its identifier in test reports. For rows inserted directly, place safe provenance in run metadata rather than repeating a large JSON object on every entity.

Review synthetic data before it enters the repository. Scan for public email domains, routable public IPs, real brands, secret patterns, unexpected text, and values outside vendor test sets. Tool scans support a source review, but they do not prove legal anonymity.

Keep the data only while tests need it. Synthetic sets can still show private schema, business rules, and safety cases. Limit repo access and set file expiry based on that risk.

Cleanup uses the same run id recorded in provenance. The sibling [test data cleanup residue assertion guide](/blog/test-data-cleanup-residue-assertion-run-tag) shows how to delete tagged resources and fail if any count remains.

For linked DB cases, print returned ids only in restricted test logs when a failure needs them. The [foreign-key graph builder tutorial](/blog/foreign-key-graph-relational-test-data-builder) keeps those ids in memory and passes them straight to child builders.

## How Do Privacy Safe Test Fixtures Fit API Tests?

Privacy-safe test fixtures start with shared builder rules, then prove them at API and database boundaries. Unit tests check the generated shapes and reserved spaces. End-to-end tests show whether encoders, validators, stores, and service clients keep or reject them as stated.

Map each schema field to four test items: a safe default, edge set, bad set, and DB check. An email default uses \`example.test\`; edge cases test length, bad cases test syntax, and the DB check ties the saved value to its run.

Database constraints outrank language types for stored values. If TypeScript permits a long string but DDL uses \`varchar(120)\`, the factory's valid default must fit 120. Report the contract mismatch rather than truncating silently.

Parallel workers need their own counts. A seed alone can make the same output in each worker and break unique keys. Put worker id in distinct fields, while Faker keeps the rest of its value order fixed for that worker.

An adoption procedure keeps changes reviewable:

1. Inventory schemas and identify contact, network, identity, payment, and free-text fields.
2. Ban raw production samples and document approved aggregate inputs.
3. Assign reserved or provider-documented test spaces to each applicable field.
4. Implement one seeded factory with fixed time, worker-safe uniqueness, and provenance.
5. Add policy validators and negative cases before connecting integrations.
6. Configure fakes, sandboxes, scoped credentials, and egress controls.
7. Add run-tag cleanup and zero-residue assertions.
8. Gate CI on namespace, no-delivery, and cleanup evidence.

Use the [database testing automation guide](/blog/database-testing-automation-guide) to place these fixtures in constraint and relationship coverage. Data safety does not reduce the need to test database-enforced rules.

The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) can prioritize fields whose accidental delivery or disclosure would cause the most harm. Apply the same baseline policy to every factory, then add deeper controls to high-risk integrations.

PII safe test data reserved namespaces work best as shared infrastructure, not optional conventions inside individual tests. Make unsafe factory calls difficult to express and safe defaults easy to reuse.

## Adopt PII Safe Test Data Reserved Namespaces

Review the implementation against concrete evidence:

1. Production rows, dumps, screenshots, and copied samples never enter the workflow.
2. Every generated field traces to a schema constraint or approved synthetic policy.
3. Emails and domains use RFC 2606 spaces where applicable.
4. Stored example IPv4 values use RFC 5737 blocks where applicable.
5. Faker version, seed, locale, and reference time are recorded.
6. Unique fields include worker-safe deterministic components.
7. Provider-specific identifiers come only from official sandbox documentation.
8. Fakes, scoped credentials, and egress controls prevent real delivery.
9. Provenance identifies schema and approved aggregate inputs without source rows.
10. Run-tag cleanup proves zero residue after passing and failing tests.

Pilot the policy on one shared factory before migrating every suite. Compare schema validity, unique-key behavior, adapter calls, logs, and cleanup evidence between old and new fixtures. Remove the old path only after tests prove the reserved factory covers the same intended behaviors without copied records.

Give each exception an owner and end date. A vendor may require one official sandbox id outside the main rules, but that does not allow any lifelike value. Keep the exception in one service builder and cite the vendor's test docs during review.

Recheck the policy whenever a new integration or identity field appears. Schema review should ask whether a reserved space exists, which sandbox receives the value, how delivery is blocked, and how cleanup finds it. Missing answers should stop fixture rollout before CI reaches an external boundary.

Run one deliberate policy failure before rollout. Change a fixture domain to an unapproved public name and confirm factory tests fail before an adapter executes. Then restore the reserved value and verify the complete integration suite remains green.

For your next fixture refactor, install the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) and convert one high-risk contact factory. Use \`example.test\`, a fixed seed, a fixed clock, blocked delivery, and run-tagged cleanup as the minimum proof.

Add the [aggregate-driven generation workflow](/blog/aggregate-driven-synthetic-test-data-without-production-rows) only when approved counts are truly needed. Defaults generated from schema rules should stay the simpler first choice.

## Frequently Asked Questions

### Does a reserved domain make any payload privacy-safe?

No. A reserved domain keeps that one id away from normal public sites, but other fields may still hold copied personal data, secrets, or private text. Safety depends on the full build process, approved inputs, source notes, test-system guards, and a review of each field.

### Why not copy production rows and replace names?

Replacement starts with personal rows and may keep linked traits, missed columns, free text, or rare facts. Build from schemas instead. If common value mixes matter, derive reviewed counts inside the source system and make fresh rows from them, while all live records stay in place.

### Is Faker seeding enough for reproducible fixtures?

No. Pin the Faker version, set a fixed reference date, preserve call order, and record locale and seed. Unique fields also need worker identifiers and deterministic sequences. Faker documents that upgrades can change seeded output, so provenance must identify the exact dependency version used by the run.

### Can TEST-NET addresses be used for local servers?

Treat RFC 5737 blocks as docs and stored examples, not as local bind IPs or reachable test hosts. Use loopback or an isolated test net for local servers. Stop calls at the network client and block public egress instead of trusting a docs IP to fail.

### What should tests use for cards or government ids?

Use only values stated by the vendor or test system, inside its sandbox. Never make lifelike bank or government ids with valid checksums. If there is no official safe set, fake the service edge and test the field format without sending the value outside.

### Do synthetic datasets need retention and access controls?

Yes. Even without personal rows, these sets can show private schema, business rules, safety cases, sandbox tokens, or run ids. Limit repo and file access, expire short-lived sets, avoid full body logs, and keep only the source notes and fault details needed to replay a test.
`,
};
