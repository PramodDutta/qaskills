import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Generate Schema-Based Date-Time Boundaries',
  description:
    'Build schema derived date time test data for RFC 3339 syntax, offsets, leap dates, DST edges, invalid forms, validator settings, and clean API checks.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'schema derived date time test data',
  keywords: [
    'schema derived date time test data',
    'JSON Schema date-time format',
    'RFC 3339 test cases',
    'date time boundary testing',
    'timezone offset tests',
    'DST boundary data',
    'API negative testing',
    'deterministic test data',
  ],
  relatedSlugs: [
    'partial-unique-index-negative-tests-soft-delete',
    'test-database-defaults-generated-columns-triggers',
    'composite-unique-constraint-test-data-matrix',
    'openapi-oneof-discriminator-negative-test-data',
  ],
  sources: [
    'https://json-schema.org/understanding-json-schema/reference/type#dates-and-times',
    'https://www.rfc-editor.org/rfc/rfc3339.html',
  ],
  content: `
Schema derived date time test data should cover the epoch, upper declared dates, leap-day boundaries, fractional seconds, numeric offsets, daylight-saving transitions, and malformed strings. Generate only cases justified by format, type, required, and application constraints, then verify rejected requests leave no stored timestamps or side effects.

The Secure Test Data Engineer skill maps a date-time format to fixed-clock values, the epoch, an upper calendar value, a DST edge, and three core negatives: date-only, Unix integer, and timezone-less text. This guide expands that mapping without inventing undocumented business ranges.

## Read Every Temporal Declaration Before Generating Values

Start with the schema containing the field, then follow references and compare runtime declarations. Record type, format, required status, nullability, surrounding object rules, and any separate business constraints.

\`\`\`json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["occurredAt"],
  "properties": {
    "occurredAt": {
      "type": "string",
      "format": "date-time"
    }
  },
  "additionalProperties": false
}
\`\`\`

This schema declares a required string carrying date-time semantics. It does not declare a named timezone, retention window, earliest business date, precision limit, or relationship with another field. Tests must not add those policies silently.

JSON has no native date-time type, so JSON Schema uses a string plus \`format\` to convey temporal meaning. Its date and time formats use RFC 3339 representations ([JSON Schema date and time formats](https://json-schema.org/understanding-json-schema/reference/type#dates-and-times)).

Compare the API schema with database columns, ORM mappings, language types, and custom validators. A PostgreSQL \`timestamptz\` column may accept inputs differently from the request validator, while a TypeScript \`string\` expresses no runtime syntax. Each disagreement is a finding and a separate boundary.

Inventory serialization too. Clients can convert date objects, truncate fractions, normalize offsets, or drop undefined fields before HTTP. Contract cases should send the exact JSON representation described in the matrix rather than trusting an intermediate object display.

Build a temporal field map for every endpoint using the schema. Include request location, required state, accepted JSON type, format, references, and downstream storage type. This inventory prevents one shared generator from applying timestamp assumptions to a date-only field or numeric epoch.

Read cross-field conditions after field-level keywords. A booking schema may require end after start, while an event schema may accept one isolated instant. Generate relationship pairs only for contracts declaring them. Field syntax remains the first prerequisite for every pair.

The [OpenAPI specification to test-suite guide](/blog/openapi-spec-to-test-suite-generation) covers document resolution and request boundaries. The sibling [OpenAPI oneOf negative data guide](/blog/openapi-oneof-discriminator-negative-test-data) shows how temporal cases fit inside a selected union branch.

## Separate Type, Format, and Business-Time Rules

Temporal validation usually contains three layers. Mixing them produces confusing expectations and makes validator changes look like product regressions.

| Layer | Example declaration | What it can prove | What it cannot prove alone |
| --- | --- | --- | --- |
| JSON type | \`type: string\` | Value is a JSON string | String is a valid timestamp |
| JSON Schema format | \`format: date-time\` | Configured validator recognizes RFC 3339 form | Named-zone or business-window correctness |
| Application rule | Start must precede end | Relationship between accepted instants | Base string syntax unless it revalidates |
| Database column | \`timestamptz NOT NULL\` | Stored value satisfies database conversion and nullability | API used declared wire format |

Keep one test group per layer. Format tests call the configured contract validator, relationship tests exercise domain logic, and persistence tests verify accepted instants survive the repository mapping.

JSON Schema documentation notes that \`format\` is an annotation by default and validator implementations can enable assertion behavior. Implementations may support subsets or apply different depth of checks ([JSON Schema format behavior](https://json-schema.org/understanding-json-schema/reference/type#dates-and-times)).

Therefore a negative date-time matrix is meaningless until the suite proves format assertion is enabled. Begin with one known valid RFC 3339 string and one clear invalid string, then fail setup if both receive the same result.

Business bounds must have a traceable source. If the API forbids events older than 30 days, cite that schema extension, service rule, or product contract and control the clock. Do not infer such a window from current production data.

Keep the validation order observable without requiring one universal implementation order. Type, format, and business rules may report several errors together or stop early. Assert that the intended rule appears and that rejected input never reaches prohibited side effects. Avoid freezing incidental error ordering.

Downstream parsers require their own positive controls. A contract validator can accept an RFC 3339 value that a later library mishandles under project configuration. Send every representative accepted form through parsing and persistence, then compare the documented normalized instant or preserved representation.

Schema derived date time test data should label each case by layer. A date-only value is a format negative, an integer is a type negative, and a start-after-end pair is a relationship negative. That labeling sharpens failure diagnosis and release evidence.

Use the [database defaults and generated values guide](/blog/test-database-defaults-generated-columns-triggers) when PostgreSQL supplies timestamps. Database-generated current time and client-provided RFC 3339 strings require different test oracles.

## Build a Traceable Date-Time Matrix

Create a baseline that is valid under every declared keyword, then add calendar, syntax, offset, precision, and type boundaries. Expected results below apply to the shown schema with active RFC 3339 format assertion.

| Case | Value | Expected | Basis |
| --- | --- | --- | --- |
| Fixed baseline | \`2026-01-15T12:30:45Z\` | Accept | Full date, time, and UTC offset |
| Epoch | \`1970-01-01T00:00:00Z\` | Accept | Mapping boundary and valid syntax |
| Four-digit upper date | \`9999-12-31T23:59:59Z\` | Accept | Valid four-digit year and fields |
| Leap day | \`2024-02-29T12:00:00Z\` | Accept | Valid day for leap year |
| Fractional seconds | \`2026-01-15T12:30:45.123Z\` | Accept | Optional non-empty fraction |
| Positive offset | \`2026-01-15T18:00:45+05:30\` | Accept | Numeric offset with colon |
| Negative offset | \`2026-01-15T04:30:45-08:00\` | Accept | Numeric negative offset |
| Date only | \`2026-01-15\` | Reject | Missing full time and offset |
| Unix integer | \`1768480245\` | Reject | Wrong JSON type |
| No offset | \`2026-01-15T12:30:45\` | Reject | Full time requires offset |
| Invalid leap day | \`2025-02-29T12:00:00Z\` | Reject | Day invalid for year |
| Hour 24 | \`2026-01-15T24:00:00Z\` | Reject | RFC 3339 hour range ends at 23 |
| Offset without colon | \`2026-01-15T12:30:45+0530\` | Reject | Numeric offset requires colon |
| Wrong JSON value | \`null\` | Reject | Required property is present but wrong type |

RFC 3339 defines four-digit years, calendar-aware day ranges, hours from 00 through 23, required seconds, and either \`Z\` or a signed hour-minute offset. Its grammar places a \`T\` between the full date and full time ([RFC 3339 Internet date/time format](https://www.rfc-editor.org/rfc/rfc3339.html)).

The table separates a Unix integer from a string containing digits. Both are invalid for this contract, but one fails type immediately and the other fails date-time format. Keep both only when clients plausibly send both representations or the assigned mapping requires them.

Add missing-property and explicit-null cases outside the value column. A required field can be absent, while a present null value fails string type. Undefined is not JSON and should be tested at the client or application-object boundary before serialization.

Schema derived date time test data also needs positive controls around negatives. A valid leap day beside an invalid non-leap day proves the validator understands calendar validity rather than rejecting every February 29 value.

Do not assume the upper value is an application maximum. It is a syntax-oriented four-digit boundary from the assigned mapping. If a database, language runtime, or business rule supports a narrower range, create a separate layer-specific matrix from that declaration.

Pair every malformed boundary with its nearest valid neighbor. Hour 23 controls hour 24, a coloned offset controls the compact offset, and a complete timestamp controls date-only input. Paired controls show that a negative result comes from the changed component rather than broken schema loading.

Keep case expectations immutable during one run. If validator configuration changes between cases, the matrix no longer has one oracle. Compile once per suite or record configuration with each result, following the repository's test isolation design.

The [synthetic test data generation guide](/blog/synthetic-test-data-generation-guide) explains deterministic fixture provenance. Temporal values should be fixed literals or derived from an injected fixed clock, never the wall clock at module import.

## Verify Format Assertion Before Trusting the Matrix

A validator can collect \`format\` as annotation and still accept malformed date-time strings. Confirm configuration through behavior rather than assuming a package default.

Use this ordered procedure:

1. Compile or load the exact Draft 2020-12 schema artifact used by the application.
2. Enable the validator's documented date-time format assertion mode or format plugin.
3. Validate the fixed baseline and require success.
4. Validate the timezone-less string and require failure at \`occurredAt\` for format.
5. Record validator name, version, dialect, and format settings with the test report.

If step four passes, stop the date-time suite as misconfigured. Running dozens of negatives through an annotation-only validator creates false confidence. Do not convert every expected rejection to acceptance merely to match that setup.

Keep schema compilation failures distinct from instance validation. An unknown format, unresolved reference, or unsupported dialect means the test oracle is unavailable. Report that as missing evidence instead of treating every payload as invalid.

Run conformance controls against the packaged schema, not a copied object in test code. Build pipelines can transform references or validator options. Capture a schema digest or version so failures remain traceable to the served contract.

When different services use different validators, run the small control pair in each service. Shared generated types do not guarantee shared runtime behavior. A compatibility difference may require a documented contract decision, not an assertion that one library is universally correct.

Mirror production options in tests, including dialect, format plugin, strictness, and reference-loading behavior. A special test-only validator can prove RFC examples but cannot prove application enforcement. Compare startup configuration directly or expose a contract-validation adapter shared with runtime code.

Schema derived date time test data should never depend on permissive native date parsing as its sole oracle. The wire contract is RFC 3339 through configured schema validation, while language date constructors may accept other forms.

The [test data management guide](/blog/test-data-management-strategies) can store schema version, generator seed, and fixed clock beside larger fixture sets.

## Generate Deterministic Cases from Schema Keywords

Represent cases as data with expected layer and validity. This keeps test names stable and makes additions traceable to schema changes.

\`\`\`ts
type DateTimeCase = {
  name: string;
  value: unknown;
  valid: boolean;
  layer: 'type' | 'format';
};

export const dateTimeCases: DateTimeCase[] = [
  {
    name: 'fixed RFC 3339 baseline',
    value: '2026-01-15T12:30:45Z',
    valid: true,
    layer: 'format',
  },
  {
    name: 'epoch',
    value: '1970-01-01T00:00:00Z',
    valid: true,
    layer: 'format',
  },
  {
    name: 'valid leap day',
    value: '2024-02-29T12:00:00Z',
    valid: true,
    layer: 'format',
  },
  {
    name: 'invalid leap day',
    value: '2025-02-29T12:00:00Z',
    valid: false,
    layer: 'format',
  },
  {
    name: 'timezone omitted',
    value: '2026-01-15T12:30:45',
    valid: false,
    layer: 'format',
  },
  {
    name: 'unix integer',
    value: 1768480245,
    valid: false,
    layer: 'type',
  },
];

export function eventPayload(value: unknown): Record<string, unknown> {
  return { occurredAt: value };
}
\`\`\`

The list uses literal strings and no \`Date.now()\`. Replaying a failed case produces identical input regardless of machine timezone, execution date, or worker scheduling. Case names expose the keyword boundary directly.

Generate length or pattern variants only when those keywords exist. Adding a maximum-length test to a field declaring only format would impose an undocumented constraint. RFC syntax and schema keywords already produce a focused set.

Keep business-time builders separate. A function creating start-and-end pairs can accept an injected fixed instant and declared duration rule, while this format list remains clock independent. Separate lists avoid accidentally applying relationship expectations to isolated timestamps.

When generating many combinations, retain a mandatory boundary set outside randomized execution. Property-based exploration can vary fractions or offsets, but failures must record the exact generated string and generator seed. The reviewed literal matrix remains the stable release gate.

For persisted tests, attach run ownership outside the closed payload when necessary. Use an isolated tenant, test header interpreted by the fixture environment, or disposable database. Never add undeclared \`testRunId\` to an object with \`additionalProperties: false\`.

Schema derived date time test data should record the schema digest and any validator-specific compatibility decisions. A seed is useful for generated volume, but fixed boundary literals need stable case identifiers more than randomness.

The [composite uniqueness matrix](/blog/composite-unique-constraint-test-data-matrix) demonstrates the same one-axis variation for database keys. Here each case changes one temporal syntax or type dimension.

## Test Calendar, Fraction, and Leap-Second Boundaries

Calendar validity needs paired controls. Test February 28 in an ordinary year, February 29 in a leap year, and February 29 in a non-leap year. Add month-end transitions only when the field's risk or shared generator justifies them.

Fractions are optional in RFC 3339 but contain at least one digit when the decimal point appears. Include no fraction, one digit, and the precision used by the API. A bare decimal point is a direct malformed boundary.

Do not invent a maximum fractional precision when the schema does not declare one and the contract validator accepts arbitrary non-empty digits. Storage may round or truncate precision, but that is a persistence-layer behavior requiring database-specific expectations.

RFC 3339 permits second 60 only for an inserted leap second under restricted calendar conditions and explains that future leap seconds are not predictable ([RFC 3339 restrictions](https://www.rfc-editor.org/rfc/rfc3339.html)). Treat leap-second handling as an explicit validator compatibility case, not a universal pass or fail assumption.

If the application contract forbids leap seconds, express that additional restriction in schema or documented validation and test it there. If it claims RFC acceptance including announced leap seconds, verify the chosen validator and downstream parser support using a historically documented example.

Avoid using native date normalization to create invalid cases. Some constructors can transform out-of-range components into another date, causing the sent value to differ from the intended input. Build malformed strings directly and inspect the serialized request body.

The matrix should preserve the original string through validation. A pre-validation parser that converts to an instant may erase offset spelling, fractional precision, or invalid syntax. Test raw contract validation before normalized domain representations.

After acceptance, test round trips according to the documented storage contract. Some systems preserve the original offset string, while others store an instant and emit a normalized offset. Assert only the behavior declared by the API and database mapping, then keep format acceptance as separate evidence.

Use the [database automation guide](/blog/database-testing-automation-guide) when checking stored precision or offset normalization. Those assertions belong after API acceptance and must follow the actual column type and driver behavior.

## Handle Offsets and DST Without Overclaiming

RFC 3339 carries a numeric UTC offset or \`Z\`; it does not carry a named timezone rule. Two strings can be syntactically valid while a separate business rule decides whether an offset is correct for a named zone.

Test \`Z\`, one positive offset, and one negative offset as format controls. Pair equivalent instants only when the application promises instant normalization. Otherwise the schema merely accepts each valid representation.

DST cases require a zone-policy source beyond \`format: date-time\`. Obtain transition instants and expected offsets from the application's pinned timezone data or declared domain fixtures. Keep those values in a separate relationship matrix and record that source version.

For a declared transition, create four cases: the last accepted instant before the offset change, the first after it, a skipped local time, and an ambiguous repeated local time. Expected results depend on the named-zone policy, parser, and disambiguation contract, not RFC syntax alone.

Schema derived date time test data can still include both offset strings around a DST edge as valid format controls. Do not claim the schema verifies their chronological adjacency or named-zone accuracy. Add domain assertions only when the contract supplies those facts.

When an API accepts only an instant string and no named zone, a skipped local-time test is not representable as a pure schema failure. Numeric offsets make the timestamp an explicit instant. Report any request for named-zone validation as a missing contract field or external policy question.

Do not derive expected offsets from the machine timezone. CI runners can use different zone settings and timezone database versions. Pass zone data explicitly or run the domain test against the same pinned library configuration used by production.

Record whether ambiguous local time chooses an earlier offset, later offset, or rejection. That is an application disambiguation policy, not a hidden parser default. Test both the selected result and any explicit override supported by the contract.

The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) helps prioritize DST domain tests for scheduling, billing, or expiry paths. Keep generic format tests small and always required.

## Assert Negative API Cases Leave No Stored State

Format validation tests do not prove endpoint behavior. Send core negatives through the actual request boundary and assert the documented response plus no observable side effects.

\`\`\`ts
import { expect, test } from 'vitest';
import { dateTimeCases, eventPayload } from './event-date-time-cases';
import { api, eventRepository, outboxRepository } from './test-harness';

test.each(dateTimeCases.filter(testCase => !testCase.valid))(
  'rejects $name without persistence',
  async testCase => {
    const eventsBefore = await eventRepository.countOwned();
    const outboxBefore = await outboxRepository.countOwned();

    const response = await api.post('/events', eventPayload(testCase.value));

    expect(response.status).toBe(api.contract.validationStatus);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/occurredAt' }),
      ]),
    );
    expect(await eventRepository.countOwned()).toBe(eventsBefore);
    expect(await outboxRepository.countOwned()).toBe(outboxBefore);
  },
);
\`\`\`

The harness obtains its validation status from the repository's documented contract rather than prescribing a universal code. Its repositories count only resources owned by this isolated run, avoiding interference from other workers.

Check parser and schema failures separately. Malformed JSON never reaches the property validator, while a valid JSON string with malformed date-time syntax does. This matrix uses well-formed JSON so each value reaches schema evaluation.

Assert stable error paths or keyword classes when available, not complete message snapshots. Validator upgrades can reorder details while preserving the contract. Keep logs free of sensitive event payloads; these fixed synthetic values are sufficient diagnostics.

Negative endpoint cases should include date-only, Unix integer, timezone-less string, and one calendar-invalid string. Add every matrix row at pure validation level, then choose endpoint representatives by side-effect risk and handler architecture.

Include at least one accepted endpoint control in the same environment. Verify it reaches the intended handler and creates the expected owned record. Without that control, universal middleware failure can make every negative request appear correctly rejected.

Read persisted data through a fresh query or public retrieval path. A successful response assembled in memory cannot prove the driver stored the intended instant. Compare only declared normalization and precision, then remove owned state and verify residue is zero.

Cleanup still runs after accepted controls. Tag test-created records or use disposable storage, delete only owned rows, and assert zero residue. A failed cleanup can alter later time-window or uniqueness tests.

Use [partial unique index negative tests](/blog/partial-unique-index-negative-tests-soft-delete) when accepted timestamps control index predicates. Keep format acceptance separate from the database transition it enables.

## Connect Temporal Cases to Release Evidence

A changed date-time format, validator mode, serializer, parser, database mapping, or business window can affect a public contract. The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) maps those changes to risks and requires evidence from the exact judged commit.

Name user behavior rather than files: valid offset timestamps may be rejected, timezone-less values may reach storage, or DST scheduling may select the wrong instant. Then select format, endpoint, persistence, and domain tests matching each changed surface.

Report the schema digest, validator version and format settings, fixed case identifiers, API run, persistence audit, and cleanup result. If DST rules are involved, include the pinned timezone-data source used by application tests.

Changed-line coverage can prove serializer and business branches ran. It cannot prove \`format\` assertion was enabled or RFC cases reached the packaged schema. Pair coverage with the startup control pair and matrix outcomes.

Classify a changed validator option as configuration risk even when no schema line changes. Turning off format assertion can admit every malformed string while generated types remain unchanged. Include configuration files in impact mapping and cite the runtime startup control as evidence.

If a serializer starts normalizing offsets or fractions, add round-trip evidence for affected accepted cases. A valid input can still change observable output. Map that change to consumer behavior before deciding whether it is intended or blocking.

Missing negative tests or an annotation-only validator are missing evidence. A stale run from another schema or validator version cannot support the current head. The gate should remain \`NO_GO\` until required evidence exists under the assigned Guardian policy.

The Guardian recommends only and never performs release actions. Use [test impact analysis in CI](/blog/test-impact-analysis-ci-guide-2026), the [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026), and the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) to connect temporal cases with selection and required suites.

## Apply the Date-Time Workflow

Resolve the actual schema, classify type, format, business, and persistence rules, then verify validator format assertion. Build deterministic positive and negative cases from each declared keyword. Keep DST expectations attached to named-zone policy rather than RFC syntax.

Run pure validation first, followed by representative endpoint and storage checks. Assert both intended rejection and unchanged side effects. Record schema, validator, fixed clock, and timezone-data versions wherever they influence results.

Schema derived date time test data becomes reliable when each value names its source rule and validation layer. That traceability prevents native parser behavior, machine timezone, or copied business assumptions from defining the contract accidentally.

Use the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to generate cases from your schemas, then browse the [QA skills directory](/skills) for contract, database, and release checks that fit your system.

## Frequently Asked Questions

### Is a date-only string valid for date-time format?

No. JSON Schema distinguishes \`date\` from \`date-time\`, and the latter includes a full date plus full time and offset under RFC 3339. Keep a date-only string as a focused format negative while retaining a complete valid control. It cannot satisfy both required components.

### Why can an invalid timestamp pass JSON Schema validation?

The \`format\` keyword acts as annotation by default, and implementations can require configuration for assertion behavior. Verify the application's validator settings with one known valid and one known invalid value before trusting a larger generated matrix. Otherwise negatives can produce false confidence.

### Should DST gaps be rejected by date-time format?

Not solely by RFC 3339 syntax. A timestamp with numeric offset identifies an instant but does not carry named-zone transition rules. Test gaps and repeated local times against a separately declared timezone policy and pinned timezone data. The named zone supplies that missing context.

### How should fractional seconds be tested?

Include no fraction, one digit, and the precision used by the actual contract. A decimal point without digits is malformed. Do not invent a maximum precision unless schema, database, serializer, or documented business behavior declares one. Verify round trips separately after acceptance.

### What temporal evidence belongs in a release report?

Record the judged schema digest, validator version, format assertion settings, fixed case identifiers, endpoint results, persisted-state audit, and cleanup outcome. Add fixed-clock and timezone-data versions when business windows or DST rules influence expectations. These artifacts connect results to the exact code.
`,
};
