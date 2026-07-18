import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Use Reserved Namespaces for PII-Safe Data',
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
  content: `PII safe test data reserved namespaces combine generated identities with domains and network values explicitly set aside for testing or documentation. They prevent fixtures from naming ordinary mailboxes, domains, or public addresses. Seeded factories and provenance make results reproducible, while sandboxing and egress controls prevent even synthetic values from triggering real integrations.

This guide applies the privacy rules in the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer). Browse [QASkills](/skills) for complementary API, security, and database workflows once the data policy is fixed.

## Separate Synthetic Data from Masked Records

Synthetic data begins from declared shapes, constraints, and approved parameters rather than copied records. A masked export begins with personal data and transforms it. Those approaches have different privacy risks even when both outputs look fake to a casual reviewer.

The source skill sets a strict boundary: production rows never leave their system. Engineers may read OpenAPI, JSON Schema, SQL DDL, ORM models, and approved aggregate summaries. They must not paste production samples into prompts, fixture files, tickets, or external generation services.

NIST SP 800-188 discusses synthetic data as one possible data-sharing model and warns that tools which merely mask information may not provide sufficient de-identification capabilities. Read the [official NIST publication](https://csrc.nist.gov/pubs/sp/800/188/final) when governance requires a formal de-identification decision. This article does not claim that synthetic-looking values automatically satisfy any law or organizational policy.

| Data approach | Starts from real rows? | Link back to a person | Appropriate default for tests |
|---|---:|---|---|
| schema-driven synthetic generation | no | none by construction from records | yes |
| aggregate-driven synthetic generation | summaries only | depends on aggregate review | yes, with governance |
| deterministic substitution | yes | mapping may be reversible | restricted legacy use |
| masked production copy | yes | linkage and missed fields can remain | avoid by default |
| raw production sample | yes | direct | prohibited for fixtures |

Reserved namespaces solve a narrower problem inside synthetic generation. They make contact-like values visibly non-production and reduce collision with ordinary public identifiers. They do not prove that the source process avoided production records, so provenance must record how the dataset was produced.

A generated name can still resemble a real person's name by coincidence. Treat it as synthetic because it came from a generator without source rows, not because it sounds unusual. Do not search for a real person and alter their details; that still begins from personal data.

PII safe test data reserved namespaces should be part of a written fixture policy. The policy defines allowed sources, banned fields, reserved value spaces, seeds, clock, schema version, target environments, and review ownership. Tests then enforce policy instead of relying on reviewer memory.

The [test data management strategies guide](/blog/test-data-management-strategies) helps decide where synthetic generation fits among isolation and lifecycle controls. Generation policy and environment policy should reinforce each other without being treated as identical.

## Map Each Field to a Safe Value Space

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

Not every format has an Internet-wide reserved space. For government identifiers, routing numbers, cards, and provider account ids, use only values explicitly documented for that test system. If no safe value exists, fake the integration boundary rather than inventing a realistic identifier.

PII safe test data reserved namespaces should remain obvious after ordinary application normalization. Lowercasing an email, parsing a URL, or serializing an address must not transform the value into an unapproved space. Test the normalized stored and transmitted forms, not only the factory's initial string.

Treat subdomains carefully. A suffix check must require a label boundary, because a hostname such as \`notexample.test.invalid-value\` can fool casual string logic. Parse the host, normalize it through the application's URL handling, and compare against a reviewed set of exact hosts or permitted suffixes.

Reserved examples also need semantic intent. Use different deterministic local parts for buyer, administrator, and rejected recipient roles so failure output remains understandable. Do not encode real employee names, ticket text, or customer identifiers merely to make the fixture recognizable.

Length and pattern constraints still apply. A safe email that exceeds the database column is not a valid default, though it may be a useful boundary case. Build one boring valid value first, then derive negative and edge cases from declared constraints.

The [synthetic test data generation guide](/blog/synthetic-test-data-generation-guide) provides wider factory patterns. PII safe test data reserved namespaces supply the value policy those factories should obey for contact and network-like fields.

## Build a Deterministic Reserved-Value Factory

Seeded generation turns failures into reproducible cases. The same generator version, seed, schema, fixed clock, worker identity, and call sequence should produce the same logical dataset. Record all of those inputs in provenance.

Faker documents that setting a seed can produce consistent results, while library upgrades may change outputs because underlying data can change. Its [official usage guide](https://fakerjs.dev/guide/usage) also notes that relative-date methods need a fixed reference date for reproducibility. Pin the package version and set the reference clock explicitly.

Random generation does not guarantee uniqueness. Build unique fields from worker id and a monotonic sequence, then use Faker for non-unique descriptive values. This matches the repository skill's deterministic factory rule.

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

The factory keeps reserved identifiers deterministic and allows intent-named overrides. A test can override the email with a malformed value for validation coverage, while valid defaults remain visibly synthetic.

Do not snapshot Faker-generated names as a compatibility contract. An upgrade may legitimately change them while preserving schema validity. Assert business behavior and reserved namespace rules, then record the package version so an unexpected fixture change can be reproduced.

Names, labels, and free text deserve conservative generation. Avoid medical details, abuse content, real company names, and plausible secrets unless the scenario explicitly tests those categories inside an approved security boundary. A generator's ability to emit a field does not make every output appropriate.

The sibling [aggregate-driven synthetic data guide](/blog/aggregate-driven-synthetic-test-data-without-production-rows) explains how approved distributions can parameterize this factory. Keep direct records out of the inputs even when stakeholders ask for realistic results.

## Validate Reserved Values as Policy

Factory tests should prove that every value remains inside its assigned space. A typo changing \`example.test\` to a live domain can turn a harmless integration test into an outbound email risk. Policy assertions catch that drift before end-to-end execution.

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

Keep policy validation close to shared factories. If every test reimplements a domain assertion, rules will diverge. One factory and one validator create a single review point for namespace changes.

Version the namespace policy when allowed values change. Store that version in dataset provenance and CI evidence, then rerun factory tests against every active fixture artifact. A policy update should not silently reinterpret an old dataset as approved.

Validation should cover serialization boundaries too. Generate the value, encode the API request, read it through the server parser, and inspect the stored representation. This catches transformations such as whitespace trimming, case folding, URL canonicalization, or field mapping that bypass an assertion made only on the source object.

For bulk datasets, validate every unique contact and network value before insertion, then report counts by rule. Stop at the first concise sample for diagnostics without printing the complete dataset. The full count shows scope while the limited sample reduces unnecessary exposure of internal test artifacts.

The [OpenAPI-to-test-suite guide](/blog/openapi-spec-to-test-suite-generation) can derive format and length cases from API contracts. Apply reserved-space validation after schema generation so valid defaults satisfy both contract and privacy policy.

## Block Real Delivery Even When Values Are Safe

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

Test both safety layers independently. A unit test proves the adapter rejects destinations outside policy, while an integration test proves CI receives only sandbox credentials and blocked production routes. If one layer is accidentally removed, the other should still prevent delivery and produce a clear failure.

PII safe test data reserved namespaces make those failures easier to diagnose because approved destinations are recognizable. They cannot detect a hard-coded production recipient inside application code, so transport spies should assert the complete destination set observed during each run.

Exercise fallback paths as well as the primary provider. Applications sometimes switch endpoints after a timeout or retry through a secondary transport. Configure every fallback for the test environment, force the transition, and prove no request reaches production credentials, domains, queues, or accounts.

Do not log entire generated payloads by default. Synthetic data can still contain security test strings, tokens issued by sandboxes, or internal identifiers. Log seed, run id, schema version, and safe failing field paths instead.

A negative API test should confirm rejected synthetic input creates no partial database state or delivery. The sibling [negative API no-write tutorial](/blog/negative-api-tests-no-partial-write-row-count) combines response evidence with scoped row counts and side-effect probes.

PII safe test data reserved namespaces are therefore one control, not the whole safety model. Pair them with environment checks, adapter fakes, scoped credentials, egress policy, and cleanup assertions.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) can enforce sandbox variables and run policy tests before integration jobs receive any external credentials.

## Record Provenance Without Recording People

Every generated dataset should explain itself. Record generator name and version, seed, fixed reference time, schema revision, locale, worker id, run id, generation time, and approved aggregate profile version when used. This metadata makes a failure reproducible and prevents confusion with an export.

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

Review generated artifacts before committing them. Search for public email domains, non-reserved public IPs, real brand names, secret patterns, unexpected Unicode, and values outside provider test sets. Automated scans complement a source review; they do not establish legal anonymisation.

Retain only as long as testing requires. Synthetic datasets can still reveal internal schemas, business rules, and security cases. Apply repository access control and artifact expiration according to their sensitivity.

Cleanup uses the same run id recorded in provenance. The sibling [test data cleanup residue assertion guide](/blog/test-data-cleanup-residue-assertion-run-tag) shows how to delete tagged resources and fail if any count remains.

For relational scenarios, record returned identifiers only in restricted test output when diagnostics need them. The [foreign-key graph builder tutorial](/blog/foreign-key-graph-relational-test-data-builder) keeps those ids in memory and passes them directly into dependent factories.

## Integrate Policy with API and Database Tests

Start policy enforcement at shared factories, then verify it at API and persistence boundaries. Unit tests prove generated shapes and namespaces. Integration tests prove serializers, validators, databases, and adapters preserve or reject them as declared.

Map each schema field to four artifacts: valid reserved default, boundary set, negative set, and storage assertion. For an email, the valid default uses \`example.test\`; boundaries exercise declared length; negatives cover malformed syntax; storage proves the exact generated value remains associated with the run.

Database constraints outrank language types for stored values. If TypeScript permits a long string but DDL uses \`varchar(120)\`, the factory's valid default must fit 120. Report the contract mismatch rather than truncating silently.

Parallel workers need independent sequences. Seed alone can produce identical output in every worker, causing unique-key failures. Include worker identity in unique fields while keeping Faker's non-unique sequence deterministic within each worker.

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

## Adopt the Policy with a Reviewable Checklist

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

Document exceptions with an owner and expiry. A provider may require one official sandbox identifier outside the general reserved rules, but that does not justify arbitrary realistic values. Keep the exception inside one adapter factory and cite the provider's test documentation in code review.

Recheck the policy whenever a new integration or identity field appears. Schema review should ask whether a reserved space exists, which sandbox receives the value, how delivery is blocked, and how cleanup finds it. Missing answers should stop fixture rollout before CI reaches an external boundary.

Run one deliberate policy failure before rollout. Change a fixture domain to an unapproved public name and confirm factory tests fail before an adapter executes. Then restore the reserved value and verify the complete integration suite remains green.

For your next fixture refactor, install the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) and convert one high-risk contact factory. Use \`example.test\`, a fixed seed, a fixed clock, blocked delivery, and run-tagged cleanup as the minimum proof.

Then add the [aggregate-driven generation workflow](/blog/aggregate-driven-synthetic-test-data-without-production-rows) only if approved summaries are genuinely needed. Schema-derived synthetic defaults should remain the simpler starting point.

## Frequently Asked Questions

### Does a reserved domain make any payload privacy-safe?

No. A reserved domain protects that identifier from colliding with an ordinary public domain, but other fields may still contain copied personal data, secrets, or sensitive free text. Privacy safety depends on the complete generation process, approved inputs, provenance, environment controls, and review of every field.

### Why not copy production rows and replace names?

Replacement starts from personal records and can preserve linkable combinations, overlooked columns, free text, and rare attributes. Generate from schemas instead. If realistic frequencies are required, derive reviewed aggregates locally and create new rows from those summaries while keeping production records inside their original system.

### Is Faker seeding enough for reproducible fixtures?

No. Pin the Faker version, set a fixed reference date, preserve call order, and record locale and seed. Unique fields also need worker identifiers and deterministic sequences. Faker documents that upgrades can change seeded output, so provenance must identify the exact dependency version used by the run.

### Can TEST-NET addresses be used for local servers?

Treat RFC 5737 blocks as documentation and stored-example values, not local bind addresses or reachable test services. Use loopback or purpose-built isolated networking for local servers. Intercept network adapters and prevent public egress rather than depending on a documentation address to fail safely.

### What should tests use for cards or government ids?

Use only values explicitly documented by the provider or test system, inside its sandbox. Never invent realistic institution or government identifiers with valid checksums. When no official safe set exists, fake the boundary and test format handling without submitting the value to an external service.

### Do synthetic datasets need retention and access controls?

Yes. Even without personal records, they can expose internal schemas, business rules, security cases, sandbox tokens, or operational identifiers. Restrict repositories and artifacts appropriately, expire temporary datasets, avoid full payload logging, and preserve only the provenance and diagnostics needed to reproduce failures.
`,
};
