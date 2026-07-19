import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Schema Derived Date Time Test Data Guide',
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
Schema derived date time test data should cover the epoch, upper declared dates, leap-day edges, fractional seconds, numeric offsets, daylight-saving changes, and malformed strings. Make only cases justified by format, type, required, and app constraints, then check rejected requests leave no stored timestamps or side effects.

The Secure Test Data Engineer skill maps a date-time format to fixed-clock values, the epoch, an upper date value, a DST edge, and three core negatives: date-only, Unix integer, and time zone-less text. This guide expands that mapping without inventing undocumented user ranges.

## What Does the JSON Schema Date Time Format Declare?

Start with the schema with the field, then follow references and compare runtime rules. Record type, format, required status, nullability, surrounding object rules, and any distinct user constraints.

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

This schema declares a required string carrying date-time rules. It does not declare a named time zone, retention window, earliest business date, precision limit, or relationship with another field. Tests must not add those policies silently.

JSON has no native date-time type, so JSON Schema uses a string plus \`format\` to convey time meaning. Its date and time formats use RFC 3339 representations ([JSON Schema date and time formats](https://json-schema.org/understanding-json-schema/reference/type#dates-and-times)).

Compare the API schema with DB columns, ORM mappings, language types, and custom checkers. A PostgreSQL \`timestamptz\` column may accept inputs differently from the request checker, while a TypeScript \`string\` expresses no runtime syntax. Each disagreement is a finding and a distinct edge.

List serialization too. Clients can convert date objects, truncate fractions, normalize offsets, or drop undefined fields before HTTP. Contract cases should send the exact JSON representation described in the matrix rather than trusting an intermediate object display.

Build a time field map for each endpoint using the schema. Include request location, required state, accepted JSON type, format, references, and downstream storage type. This list stops one shared generator from applying timestamp assumptions to a date-only field or numeric epoch.

Read cross-field conditions after field-level keywords. A booking schema may need end after start, while an event schema may accept one isolated instant. Make link pairs only for contracts declaring them. Field syntax stays the first prerequisite for each pair.

The [OpenAPI specification to test-suite guide](/blog/openapi-spec-to-test-suite-generation) covers document resolution and request edges. The sibling [OpenAPI oneOf negative data guide](/blog/openapi-oneof-discriminator-negative-test-data) shows how time cases fit inside a selected union branch.

## How Does Date Time Boundary Testing Split Rules?

Time checks usually contain three layers. Mixing them creates confusing expectations and makes checker changes look like product regressions during routine maintenance.

| Layer | Example rule | What it can prove | What it cannot prove alone |
| --- | --- | --- | --- |
| JSON type | \`type: string\` | Value is a JSON string | String is a valid timestamp |
| JSON Schema format | \`format: date-time\` | Chosen checker recognizes RFC 3339 form | Named-zone or user-window correctness |
| App rule | Start must precede end | Link between accepted instants | Base string syntax unless it revalidates |
| DB column | \`timestamptz NOT NULL\` | Stored value meets DB conversion and nullability | API used declared wire format |

Keep one test group per layer. Format tests call the chosen contract checker, link tests exercise domain logic, and storage tests check accepted instants survive the data layer mapping.

JSON Schema docs notes that \`format\` is an annotation by default and checker implementations can enable check result. Implementations may support subsets or apply other depth of checks ([JSON Schema format result](https://json-schema.org/understanding-json-schema/reference/type#dates-and-times)).

Thus a negative date-time matrix is meaningless until the suite proves format check is enabled. Begin with one known valid RFC 3339 string and one clear bad string, then fail setup if both receive the same result.

User bounds must have a traceable source. If the API forbids events older than 30 days, cite that schema extension, service rule, or product contract and control the clock. Do not infer such a window from current live data.

Keep the check order observable without requiring one universal code order. Type, format, and user rules may report many errors together or stop early. Assert that the intended rule appears and that rejected input never reaches prohibited side effects. Avoid freezing incidental error ordering.

Downstream parsers need their own positive controls. A contract checker can accept an RFC 3339 value that a later library mishandles under project setup. Send each representative accepted form through parsing and storage, then compare the stated normalized instant or preserved representation.

Schema derived date time test data should label each case by layer. A date-only value is a format negative, an integer is a type negative, and a start-after-end pair is a link negative. That labeling sharpens failure debug and release proof.

Use the [database defaults and generated values guide](/blog/test-database-defaults-generated-columns-triggers) when PostgreSQL supplies timestamps. Database-generated timestamps and client-provided RFC 3339 strings need different test oracles.

## How Do You Build RFC 3339 Test Cases?

Create a baseline that is valid under each declared keyword, then add date, syntax, offset, detail, and type edges. Expected results below apply to the shown schema with active RFC 3339 format check.

| Case | Value | Expected | Basis |
| --- | --- | --- | --- |
| Fixed baseline | \`2026-01-15T12:30:45Z\` | Accept | Full date, time, and UTC offset |
| Epoch | \`1970-01-01T00:00:00Z\` | Accept | Mapping edge and valid syntax |
| Four-digit upper date | \`9999-12-31T23:59:59Z\` | Accept | Valid four-digit year and fields |
| Leap day | \`2024-02-29T12:00:00Z\` | Accept | Valid day for leap year |
| Fractional seconds | \`2026-01-15T12:30:45.123Z\` | Accept | Optional non-empty fraction |
| Positive offset | \`2026-01-15T18:00:45+05:30\` | Accept | Numeric offset with colon |
| Negative offset | \`2026-01-15T04:30:45-08:00\` | Accept | Numeric negative offset |
| Date only | \`2026-01-15\` | Reject | Missing full time and offset |
| Unix integer | \`1768480245\` | Reject | Wrong JSON type |
| No offset | \`2026-01-15T12:30:45\` | Reject | Full time needs offset |
| Bad leap day | \`2025-02-29T12:00:00Z\` | Reject | Day bad for year |
| Hour 24 | \`2026-01-15T24:00:00Z\` | Reject | RFC 3339 hour range ends at 23 |
| Offset without colon | \`2026-01-15T12:30:45+0530\` | Reject | Numeric offset needs colon |
| Wrong JSON value | \`null\` | Reject | Required property is present but wrong type |

RFC 3339 defines four-digit years, date-aware day ranges, hours from 00 through 23, required seconds, and either \`Z\` or a signed hour-minute offset. Its grammar places a \`T\` between the full date and full time ([RFC 3339 Internet date/time format](https://www.rfc-editor.org/rfc/rfc3339.html)).

The table separates a Unix integer from a string with digits. Both are bad for this contract, but one fails type at once and the other fails date-time format. Keep both only when clients plausibly send both representations or the assigned mapping needs them.

Add missing-property and clear-null cases outside the value column. A required field can be absent, while a present null value fails string type. Undefined is not JSON and should be tested at the client or app-object edge before serialization.

Schema derived date time test data also needs positive controls around negatives. A valid leap day beside a bad non-leap day proves the checker understands date validity rather than rejecting each February 29 value.

Do not assume the upper value is an app maximum. It is a syntax-oriented four-digit edge from the assigned mapping. If a DB, language runtime, or user rule supports a narrower range, create a distinct layer-exact matrix from that rule.

Pair each malformed edge with its nearest valid neighbor. Hour 23 controls hour 24, a coloned offset controls the compact offset, and a full timestamp controls date-only input. Paired controls show that a negative result comes from the changed part rather than broken schema loading.

Keep case expectations immutable during one run. If checker setup changes between cases, the matrix no longer has one oracle. Compile once per suite or record setup with each result, following the data layer's test isolation design.

The [synthetic test data generation guide](/blog/synthetic-test-data-generation-guide) explains fixed fixture provenance. Time values should be fixed literals or derived from an injected fixed clock, never the wall clock at module import.

## Checker Settings Before Case Generation

A checker can collect \`format\` as annotation and still accept malformed date-time strings. Confirm setup through result rather than assuming a package default.

Use this ordered procedure:

1. Compile or load the exact Draft 2020-12 schema file used by the app.
2. Enable the checker's stated date-time format check mode or format plugin.
3. Check the fixed baseline and need success.
4. Check the time zone-less string and need failure at \`occurredAt\` for format.
5. Record checker name, version, dialect, and format settings with the test report.

If step four passes, stop the date-time suite as misconfigured. Running dozens of negatives through an annotation-only checker creates false confidence. Do not convert each expected failure to pass merely to match that setup.

Keep schema compilation failures distinct from instance check. An unknown format, unresolved reference, or unsupported dialect means the test oracle is unavailable. Report that as missing proof instead of treating each payload as bad.

Run conformance controls against the packaged schema, not a copied object in test code. Build pipelines can transform references or checker options. Capture a schema digest or version so failures stay traceable to the served contract.

When other services use other validators, run the small control pair in each service. Shared generated types do not guarantee shared runtime behavior. A compatibility difference may need a stated contract decision, not a check that one library is universally correct.

Mirror live options in tests, such as dialect, format plugin, strictness, and reference-loading result. A special test-only checker can prove RFC examples but cannot prove app enforcement. Compare startup setup directly or expose a contract-check adapter shared with runtime code.

Schema derived date time test data should never depend on permissive native date parsing as its sole oracle. The wire contract is RFC 3339 through chosen schema check, while language date constructors may accept other forms.

The [test data management guide](/blog/test-data-management-strategies) can store schema version, generator seed, and fixed clock beside larger fixture sets. Those values make a failed case repeatable on another machine.

## Deterministic Test Data from Schema Keywords

Show cases as data with expected layer and validity. This keeps test names stable and makes additions traceable to schema changes.

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

The list uses literal strings and no \`Date.now()\`. Replaying a failed case makes identical input regardless of machine time zone, run date, or worker scheduling. Case names expose the keyword edge directly.

Make length or pattern variants only when those keywords exist. Adding a maximum-length test to a field declaring only format would impose an undocumented constraint. RFC syntax and schema keywords already make a focused set.

Keep user-time builders distinct. A function creating start-and-end pairs can accept an injected fixed instant and declared duration rule, while this format list stays clock distinct. Distinct lists avoid accidentally applying link expectations to isolated timestamps.

When generating many combinations, keep a mandatory boundary set outside randomized runs. Property-based exploration can vary fractions or offsets, but failures must record the exact generated string and generator seed. The reviewed literal matrix stays the stable release gate.

For stored tests, attach run scope outside the closed payload when necessary. Use an isolated tenant, test header interpreted by the fixture setup, or disposable DB. Never add undeclared \`testRunId\` to an object with \`additionalProperties: false\`.

Schema derived date time test data should record the schema digest and any validator-specific compatibility decisions. A seed is useful for generated volume, but fixed boundary literals need stable case IDs more than randomness.

The [composite unique rule matrix](/blog/composite-unique-constraint-test-data-matrix) shows the same one-axis variation for DB keys. Here each case changes one time syntax or type field.

## Date, Fraction, and Leap-Second Edges

Date validity needs paired controls. Test February 28 in an ordinary year, February 29 in a leap year, and February 29 in a non-leap year. Add month-end changes only when the field's risk or shared generator justifies them.

Fractions are optional in RFC 3339 but contain at least one digit when the decimal point appears. Include no fraction, one digit, and the detail used by the API. A bare decimal point is a direct malformed edge.

Do not invent a maximum fractional detail when the schema does not declare one and the contract checker accepts arbitrary non-empty digits. Storage may round or truncate detail, but that is a storage-layer result requiring DB-exact expectations.

RFC 3339 permits second 60 only for an inserted leap second under restricted date conditions and explains that future leap seconds are not predictable ([RFC 3339 restrictions](https://www.rfc-editor.org/rfc/rfc3339.html)). Treat leap-second handling as a clear checker compatibility case, not a universal pass or fail assumption.

If the app contract forbids leap seconds, express that extra restriction in schema or stated check and test it there. If it claims RFC pass such as announced leap seconds, check the chosen checker and downstream parser support using a historically stated example.

Avoid using native date normalization to create bad cases. Some constructors can transform out-of-range parts into a different date, causing the sent value to differ from the intended input. Build malformed strings directly and inspect the serialized request body.

The matrix should keep the first string through check. A pre-check parser that converts to an instant may erase offset spelling, fractional detail, or bad syntax. Test raw contract check before normalized domain representations.

After pass, test round trips under the stated storage contract. Some systems keep the first offset string, while others store an instant and emit a normalized offset. Assert only the result declared by the API and DB mapping, then keep format pass as distinct proof.

Use the [DB automation guide](/blog/database-testing-automation-guide) when checking stored detail or offset normalization. Those checks belong after API pass and must follow the actual column type and driver result.

## Timezone Offset Tests with DST Boundary Data

RFC 3339 carries a numeric UTC offset or \`Z\`; it does not carry a named time zone rule. Two strings can be syntactically valid while a distinct user rule decides whether an offset is correct for a named zone.

Test \`Z\`, one positive offset, and one negative offset as format controls. Pair equivalent instants only when the app promises instant normalization. Otherwise the schema merely accepts each valid representation.

DST cases need a zone-policy source beyond \`format: date-time\`. Obtain change instants and expected offsets from the app's pinned time zone data or declared domain fixtures. Keep those values in a distinct link matrix and record that source version.

For a declared change, create four cases: the last accepted instant before the offset change, the first after it, a skipped local time, and an ambiguous repeated local time. Expected results depend on the named-zone policy, parser, and disambiguation contract, not RFC syntax alone.

Schema derived date time test data can still include both offset strings around a DST edge as valid format controls. Do not claim the schema checks their chronological adjacency or named-zone accuracy. Add domain checks only when the contract supplies those facts.

When an API accepts only an instant string and no named zone, a skipped local-time test is not representable as a pure schema failure. Numeric offsets make the timestamp a clear instant. Report any request for named-zone check as a missing contract field or external policy question.

Do not derive expected offsets from the machine time zone. CI runners can use other zone settings and time zone DB versions. Pass zone data clearly or run the domain test against the same pinned library setup used by live.

Record whether ambiguous local time chooses an earlier offset, later offset, or failure. That is an app disambiguation policy, not a hidden parser default. Test both the selected result and any clear override supported by the contract.

The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) helps prioritize DST domain tests for scheduling, billing, or expiry paths. Keep generic format tests small and always required.

## API Negative Testing with No Stored State

Format check tests do not prove endpoint result. Send core negatives through the actual request edge and assert the stated response plus no observable side effects.

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

The harness obtains its check status from the data layer's stated contract rather than prescribing a universal code. Its data layers count only resources owned by this isolated run, avoiding clashes from other workers.

Check parser and schema failures separately. Malformed JSON never reaches the property checker, while a valid JSON string with malformed date-time syntax does. This matrix uses well-formed JSON so each value reaches schema evaluation.

Assert stable error paths or keyword classes when available, not full message snapshots. Checker upgrades can reorder details while keeping the contract. Keep logs free of sensitive event payloads; these fixed synthetic values are sufficient diagnostics.

Negative endpoint cases should include date-only, Unix integer, time zone-less string, and one date-bad string. Add each matrix row at pure check level, then choose endpoint representatives by side-effect risk and handler architecture.

Include at least one accepted endpoint control in the same setup. Check it reaches the intended handler and creates the expected owned record. Without that control, universal middleware failure can make each negative request appear correctly rejected.

Read stored data through a fresh query or public retrieval path. A successful response assembled in memory cannot prove the driver stored the intended instant. Compare only declared normalization and detail, then remove owned state and check residue is zero.

Cleanup still runs after accepted controls. Tag test-created records or use disposable storage, delete only owned rows, and assert zero residue. A failed cleanup can alter later time-window or unique rule tests.

Use [partial unique index negative tests](/blog/partial-unique-index-negative-tests-soft-delete) when accepted timestamps control index predicates. Keep format pass distinct from the DB change it enables.

## Release Proof for Date-Time Rules

A changed date-time format, checker mode, serializer, parser, DB mapping, or user window can affect a public contract. The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) maps those changes to risks and needs proof from the exact judged commit.

Name user result rather than files: valid offset timestamps may be rejected, time zone-less values may reach storage, or DST scheduling may select the wrong instant. Then select format, endpoint, storage, and domain tests matching each changed surface.

Report the schema digest, checker version and format settings, fixed case IDs, API run, storage audit, and cleanup result. If DST rules are involved, include the pinned time zone-data source used by app tests.

Changed-line coverage can prove serializer and user branches ran. It cannot prove \`format\` check was enabled or RFC cases reached the packaged schema. Pair coverage with the startup control pair and matrix outcomes.

Classify a changed validator option as setup risk even when no schema line changes. Turning off format validation can admit malformed strings while generated types stay unchanged. Include setup files in impact mapping and cite the runtime startup control as evidence.

If a serializer starts normalizing offsets or fractions, add round-trip proof for affected accepted cases. A valid input can still change observable output. Map that change to consumer result before deciding whether it is intended or blocking.

Missing negative tests or an annotation-only validator are missing proof. A stale run from another schema or validator version cannot support the current head. The gate should stay \`NO_GO\` until required proof exists under the assigned Guardian policy.

The Guardian recommends only and never performs release actions. Use [test impact analysis in CI](/blog/test-impact-analysis-ci-guide-2026), the [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026), and the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) to connect time cases with selection and required suites.

## Conclusion: Apply Schema Derived Date Time Test Data

Resolve the actual schema, classify type, format, user, and storage rules, then check checker format check. Build fixed positive and reject cases from each declared keyword. Keep DST expectations attached to named-zone policy rather than RFC syntax.

Run pure check first, followed by representative endpoint and storage checks. Assert both intended failure and unchanged side effects. Record schema, checker, fixed clock, and time zone-data versions wherever they influence results.

Schema derived date time test data becomes reliable when each value names its source rule and check layer. That traceability stops native parser result, machine time zone, or copied user assumptions from defining the contract accidentally.

Use the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to make cases from your schemas, then browse the [QA skills directory](/skills) for contract, DB, and release checks that fit your system. Run the smallest useful matrix against one real boundary first.

## Frequently Asked Questions

### Is a date-only string valid for date-time format?

No. JSON Schema tells apart \`date\` from \`date-time\`, and the latter includes a full date plus full time and offset under RFC 3339. Keep a date-only string as a focused format negative while retaining a full valid control. It cannot meet both required parts.

### Why can a bad timestamp pass JSON Schema validation?

The \`format\` keyword acts as an annotation by default, and implementations can need explicit setup for assertion behavior. Check the application's validator settings with one known valid and one known bad value before trusting a larger generated matrix. Otherwise negative cases can create false confidence.

### Should DST gaps be rejected by date-time format?

Not solely by RFC 3339 syntax. A timestamp with numeric offset finds an instant but does not carry named-zone change rules. Test gaps and repeated local times against a separately declared time zone policy and pinned time zone data. The named zone supplies that missing context.

### How should fractional seconds be tested?

Include no fraction, one digit, and the detail used by the actual contract. A decimal point without digits is malformed. Do not invent a maximum detail unless schema, DB, serializer, or stated user result declares one. Check round trips separately after pass.

### What time proof belongs in a release report?

Record the judged schema digest, checker version, format check settings, fixed case IDs, endpoint results, stored-state audit, and cleanup outcome. Add fixed-clock and time zone-data versions when user windows or DST rules influence expectations. These files connect results to the exact code.
`,
};
