import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'OpenAPI oneOf Negative Test Data Guide',
  description:
    'Create OpenAPI oneOf negative test data for mixed-branch objects, discriminator errors, ambiguous matches, wrong types, and clean API rejection checks.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'OpenAPI oneOf negative test data',
  keywords: [
    'OpenAPI oneOf negative test data',
    'OpenAPI discriminator testing',
    'mixed branch object tests',
    'JSON Schema oneOf validation',
    'API negative testing',
    'schema driven test data',
    'contract test matrix',
    'Vitest API validation',
  ],
  relatedSlugs: [
    'partial-unique-index-negative-tests-soft-delete',
    'test-database-defaults-generated-columns-triggers',
    'composite-unique-constraint-test-data-matrix',
    'schema-derived-date-time-boundary-test-data',
  ],
  sources: [
    'https://spec.openapis.org/oas/v3.1.1.html#discriminator-object',
    'https://json-schema.org/understanding-json-schema/reference/combining',
  ],
  content: `
OpenAPI oneOf negative test data should include objects matching neither branch, mixed objects carrying fields from many branches, and payloads whose discriminator is missing, unknown, or mistyped. Check each legal branch too, then assert rejected requests create no DB rows, events, or other partial side effects.

The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) states the mechanical rule directly: make each branch for \`oneOf\` or a discriminator, then add a mixed-branch object to the negative set. The schema stays the source of truth, so branch names, required fields, types, patterns, and closure rules all come from the served OpenAPI document.

## How Does JSON Schema oneOf Validation Work?

JSON Schema defines \`oneOf\` as exclusive matching: an input must check against exactly one listed subschema. Matching none fails, and matching more than one also fails ([JSON Schema combiners](https://json-schema.org/understanding-json-schema/reference/combining)).

That rule creates three outcome classes rather than a simple valid-or-invalid split:

| Branch match count | oneOf result | Representative payload |
| ---: | --- | --- |
| 0 | Reject | Unknown discriminator value or missing branch-required field |
| 1 | Accept | Full card object or full bank object |
| 2 or more | Reject | Object satisfying overlapping branch schemas |

The discriminator does not replace this calculation. OpenAPI 3.1.1 describes it as a hint associating field values with alternative schemas and states that it must not change the validation outcome ([OpenAPI Discriminator Object](https://spec.openapis.org/oas/v3.1.1.html#discriminator-object)).

Thus a payload with \`kind: card\` is not valid merely because mapping points to the card schema. It must still meet that branch, and exactly one branch must check. Tests should assert schema results first and error translation second.

Write the contract in plain language before creating data: each payment method is exactly one closed object, identified by required \`kind\`, with the required token for that branch and no fields from another branch. This sentence turns composition into observable cases.

Do not call \`oneOf\` an inheritance mechanism. The validator evaluates subschemas against the input. Model-generation or deserialization tools may use discriminator hints, but API acceptance still follows the full schema.

Choose one validation oracle for the suite and record its dialect settings. OpenAPI 3.1 Schema Objects align with JSON Schema Draft 2020-12 requirements, while older OpenAPI tooling can interpret keywords differently. Run a startup conformance check with known valid and invalid instances before trusting generated matrix results.

Expose branch match counts only as test diagnostics. Live handlers should receive an already validated, narrowed payload under app architecture. A test helper that compiles branches individually must resolve the same references and dialect, or its count can disagree with the real checker.

Read the [OpenAPI specification to test-suite guide](/blog/openapi-spec-to-test-suite-generation) for wider request and response generation. This article focuses on exclusive branches and their negative edge.

## How Should OpenAPI Discriminator Testing Shape Branches?

Mixed objects are only invalid when branch schemas actually reject the foreign fields or otherwise fail. Make branch intent clear in the contract instead of relying on test assumptions.

\`\`\`yaml
openapi: 3.1.1
info:
  title: Test Payments API
  version: 1.0.0
paths:
  /payments:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentMethod'
      responses:
        '204':
          description: Payment method accepted
components:
  schemas:
    PaymentMethod:
      oneOf:
        - $ref: '#/components/schemas/CardPayment'
        - $ref: '#/components/schemas/BankPayment'
      discriminator:
        propertyName: kind
        mapping:
          card: '#/components/schemas/CardPayment'
          bank: '#/components/schemas/BankPayment'
    CardPayment:
      type: object
      required: [kind, cardToken]
      properties:
        kind:
          const: card
        cardToken:
          type: string
          pattern: '^tok_test_[A-Za-z0-9]+$'
      additionalProperties: false
    BankPayment:
      type: object
      required: [kind, accountToken]
      properties:
        kind:
          const: bank
        accountToken:
          type: string
          pattern: '^acct_test_[A-Za-z0-9]+$'
      additionalProperties: false
\`\`\`

The example uses explicit mapping values and component references. OpenAPI requires each possible schema to be listed when \`oneOf\` sits beside a discriminator, and the mapping connects payload values to those alternatives ([OpenAPI Discriminator Object](https://spec.openapis.org/oas/v3.1.1.html#discriminator-object)).

Each branch needs the \`kind\` field and constrains it with \`const\`. That makes the alternatives disjoint for valid instances. \`additionalProperties: false\` closes each object, so a card object carrying \`accountToken\` fails instead of silently accepting a foreign field.

If the API schema intentionally permits extension fields, do not add closure only to make a mixed-object test fail. Derive the expected result from the actual branch constraints. A mixed payload may legally match one branch when extra fields are allowed and the other branch rejects its \`kind\` value.

Compare the OpenAPI document, runtime validator setup, generated request types, and handler narrowing logic. If TypeScript accepts a union that the runtime validator rejects, record that disagreement. Runtime schema validation outranks an erased language type at the API boundary.

Inspect component references after bundling. A source document may resolve local files correctly during development while a packaged file contains a missing or stale target. Check the exact file served by docs or middleware and include its ID in failures. This keeps branch tests tied to deployable input.

Review shared schemas pulled into both alternatives. A common object can add required fields, closure result, or nested constraints that are not visible beside \`oneOf\`. Expand resolved branches for matrix design, then keep tests against refs so future shared-schema changes stay observable.

OpenAPI oneOf negative test data must target the served spec, not an unbundled source file ignored by deployment. Capture its version or digest in contract-test output so release proof finds the schema actually exercised.

## How Do You Build a Contract Test Matrix?

Create one small valid object per branch before negatives. Then change one declared field at a time so failures stay easy to trace.

| Case | Payload change | Expected matches | Expected result | Schema basis |
| --- | --- | ---: | --- | --- |
| Valid card | \`kind=card\`, valid card token | 1 | Accept | Card branch full |
| Valid bank | \`kind=bank\`, valid account token | 1 | Accept | Bank branch full |
| Missing kind | Remove discriminator field | 0 | Reject | Both branches need kind |
| Unknown kind | Use \`crypto\` | 0 | Reject | No branch const accepts value |
| Wrong kind type | Use number | 0 | Reject | Neither const matches |
| Card missing token | Remove card token | 0 | Reject | Required field absent |
| Bank missing token | Remove account token | 0 | Reject | Required field absent |
| Mixed card and bank | Include both tokens with card kind | 0 | Reject | Card rejects extra; bank rejects kind |
| Card token wrong type | Use array | 0 | Reject | Branch declares string |
| Card token near miss | Remove test prefix | 0 | Reject | Pattern fails by one condition |
| Unknown field | Add \`routingHint\` | 0 | Reject | Branch object is closed |

This OpenAPI oneOf negative test data matrix follows the assigned schema mapping: first branch default, each branch edge, and a mixed-branch object. Required, pattern, and type negatives come directly from their keywords.

The expected match count is valuable during debugging. A zero-match error indicates no branch accepted the object. A many-match error indicates a dual match. Public API responses may combine those details, but contract tests should keep enough validation evidence to distinguish them safely.

Add a dual-match guard even when current \`kind\` constants make a dual match impossible. Compile each branch separately, count successful branch checks for valid fixtures, and expect exactly one. If a later schema edit removes a constant or required field, that guard explains the resulting \`oneOf\` failure.

Do not invent a \`crypto\` branch because the unknown value seems plausible. Its role is simply a non-member outside the explicit mapping and branch constants. Use a reserved synthetic token namespace for values, never a live payment token.

Add null separately from absence when a branch field is required. A present null value may fail type, while an omitted field fails required. Likewise, an empty string may meet type but fail pattern. These cases belong on other matrix rows because they trace to other keywords.

Give each case a stable ID, expected match count, and expected keyword class. Stable names make contract reports comparable across schema revisions without freezing full validator messages. Remove a case only when the changed schema eliminates its underlying constraint, and document that reason in review.

The [synthetic test data generation guide](/blog/synthetic-test-data-generation-guide) covers safe reserved values. The sibling schema-derived date-time guide applies the same keyword-to-case method to temporal fields.

## A Small Review Loop for Each Branch

Start with one branch and keep the first pass small. Load the same schema file the application uses, then check one valid body for that branch. Name the case from the rule it proves, not from a ticket number. A clear name helps a reviewer trace the field, expected branch, and result without reading the whole fixture.

Next, copy the valid body and make one change. Remove a needed field, use the wrong \`kind\` value, or add a field from the other branch. Write down how many branches should match before you run the test. If the count differs, stop and inspect the resolved branch rules before adding more cases.

Do not send every bad body through HTTP at first. A local schema check gives a short error path and makes branch drift easy to find. Once the core cases pass, send the high-risk set through the real endpoint. Then check the status, handler calls, rows, jobs, and events owned by that request.

For a new branch, add a valid control before any failure case. Then add a missing \`kind\`, unknown \`kind\`, wrong field type, foreign branch field, and a full body that should match just one branch. Keep each case as plain JSON so no builder strips or repairs the bad field. This small set gives later tests a known base and a clear reason to fail.

Keep the proof tied to the file and commit under review. Save the schema hash, test run ID, case names, and branch match counts with the gate output. If the schema or commit changes, run the set again instead of reusing old proof. This loop is quick for one case and saves time on the whole change because each failed step has one clear cause.

End with a clean-state check that reads from a fresh connection. A failed body must not leave a row, job, event, cache key, or audit item for the run. If one appears, report the first side-effect edge and stop. A later cleanup step must not hide the bad write.

Keep the first set in source control beside the schema. When a branch changes, review the old case names before you add new ones. Remove a case only when the rule it proved is gone, and note that fact in the pull request. This makes the set easy to audit and keeps dead cases from masking gaps.

## Schema Driven Test Data with Intent-Named Payloads

Builders should show branch intent rather than return random unions. Keep valid defaults small and allow clear overrides for one matrix field.

\`\`\`ts
type CardPayment = {
  kind: 'card';
  cardToken: string;
};

type BankPayment = {
  kind: 'bank';
  accountToken: string;
};

export function buildCard(
  overrides: Partial<CardPayment> = {},
): CardPayment {
  return {
    kind: 'card',
    cardToken: 'tok_test_card_001',
    ...overrides,
  };
}

export function buildBank(
  overrides: Partial<BankPayment> = {},
): BankPayment {
  return {
    kind: 'bank',
    accountToken: 'acct_test_bank_001',
    ...overrides,
  };
}

export const negativeCases: Array<{
  name: string;
  payload: unknown;
  expectedMatchCount: number;
}> = [
  { name: 'missing kind', payload: { cardToken: 'tok_test_card_001' }, expectedMatchCount: 0 },
  { name: 'unknown kind', payload: { kind: 'crypto' }, expectedMatchCount: 0 },
  { name: 'wrong kind type', payload: { kind: 7, cardToken: 'tok_test_card_001' }, expectedMatchCount: 0 },
  {
    name: 'mixed branches',
    payload: {
      kind: 'card',
      cardToken: 'tok_test_card_001',
      accountToken: 'acct_test_bank_001',
    },
    expectedMatchCount: 0,
  },
];
\`\`\`

Negative payloads use \`unknown\` because TypeScript should not stop runtime-invalid values from reaching the checker test. Casting malformed objects to the valid union would hide intent and can invite accidental use outside tests.

Keep one valid default per branch and no optional decoration. Small objects reveal which fields are actually required. Add optional-field edges in distinct cases derived from those rules.

OpenAPI oneOf negative test data should stay fixed across workers. Static reserved tokens are safe when contract check is pure. For endpoint tests that persist tokens, add run scope outside sensitive business fields or provision isolated storage.

Do not spread card and bank builders together to create the mixed object. Field order and overwrite behavior could replace the \`kind\` value without notice. Write mixed fields clearly so reviewers can see why no branch should accept the object.

Keep builders free of check calls. A factory that silently repairs missing fields or drops unknown fields can turn a negative payload into a valid one before the test reaches its oracle. Construct raw JSON-compatible objects, keep exact keys, and let the selected checker make the outcome.

Record fixture provenance with the schema file version and fixed case name. Stored endpoint tests may also need a run ID, but do not place scope fields inside a closed request object unless the schema declares them. Put test scope in headers, isolated storage, or server-side fixture context.

The [composite unique rule data matrix](/blog/composite-unique-constraint-test-data-matrix) uses the same distinct-axis discipline for DB tuples. Both approaches favor small literal cases over random payload soup.

## Vitest API Validation for Valid Branches First

Each branch needs a positive control. If valid card data already fails because refs were not resolved or the checker uses the wrong dialect, each reject case can appear to pass for the wrong reason.

\`\`\`ts
import { describe, expect, test } from 'vitest';
import {
  matchPaymentBranches,
  validatePaymentMethod,
} from './openapi-contract-validator';
import { buildBank, buildCard, negativeCases } from './payment-fixtures';

describe('PaymentMethod oneOf contract', () => {
  test.each([
    ['card', buildCard()],
    ['bank', buildBank()],
  ])('accepts one complete %s branch', (_name, payload) => {
    const result = validatePaymentMethod(payload);
    expect(result.valid).toBe(true);
    expect(matchPaymentBranches(payload)).toHaveLength(1);
  });

  test.each(negativeCases)('rejects $name', testCase => {
    const result = validatePaymentMethod(testCase.payload);
    expect(result.valid).toBe(false);
    expect(matchPaymentBranches(testCase.payload)).toHaveLength(
      testCase.expectedMatchCount,
    );
  });
});
\`\`\`

The local validator adapter should load the same OpenAPI document and JSON Schema dialect used by the app. \`matchPaymentBranches\` validates the payload against each referenced branch separately for diagnostics. Its result does not replace full \`oneOf\` validation.

Assert stable schema paths or keyword classifications when the checker exposes them, but avoid brittle full-message snapshots. Error wording and ordering can change across checker versions. The contract is failure for the intended keyword and no app side effect.

Include one test that resolves refs from the packaged or served schema file. A unit test importing hand-copied branch objects can stay green while bundling drops a mapping target. Keep copied schemas out of fixture code unless the copy itself is the reviewed test subject.

Compare validation success with handler selection for both valid branches. A schema can validate correctly while app dispatch reads the wrong field or mapping table. The card fixture should reach only the card handler, and the bank fixture should reach only the bank handler, using spies or isolated service edges appropriate to the data layer.

For reject cases, assert no branch handler runs after middleware failure. This check complements response and storage checks. If validation occurs inside handlers by design, assert the earliest declared side-effect edge instead of imposing another architecture through tests.

OpenAPI oneOf negative test data should fail for the intended reason. For the mixed card payload, assert both the card extra-field failure and bank \`kind\` mismatch when diagnostic APIs support branch detail. That evidence distinguishes a closed-object contract from a distinct parser error.

The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) helps decide which branch variants also need endpoint coverage. Pure contract validation should still enumerate each branch and declared negative edge.

## Mixed Branch Object Tests for Zero and Many Matches

A mixed object can match zero branches or many branches depending on schema design. Those are distinct defects and need distinct fixtures.

In the payment schema, card kind plus both tokens matches zero branches. Card rejects \`accountToken\` because the object is closed, while bank rejects card kind and the foreign card token. The full \`oneOf\` thus fails with zero matches.

A dual-match regression occurs if branch constraints become permissive enough that one object meets both. For example, removing branch constants and required fields can make a small shared object match more than one alternative. The exact regression fixture must be derived from the changed schema, not retained as a hypothetical production claim.

Test mixed and dual-match results in this order:

1. Check each legal branch and assert one distinct match.
2. Check the declared mixed object and assert its expected zero-match result.
3. Run a dual-match guard over small valid fixtures and assert no fixture matches multiple branches.
4. Mutate only a reviewed test schema when verifying that the validator rejects multiple matches.
5. Keep endpoint tests against the unmodified live schema and assert no storage after failure.

This procedure separates contract examples from validator conformance checks. A deliberately mutated schema can prove tooling understands exclusive matching, but it must never be mistaken for proof about the served contract.

Avoid assuming \`additionalProperties: false\` at the outer \`oneOf\` level closes referenced branches. Closure needs to work with the actual schema structure and dialect. Check concrete mixed instances against the packaged spec rather than reasoning from indentation alone.

Nested objects need their own closure analysis. A top-level branch can reject foreign root keys while an embedded details object accepts mixed fields. Walk the resolved schema tree and make mixed objects at each composition point actually used by the contract. Do not generalize one root-level result to each nested union.

Arrays of branch objects need item-level matrices. Include a legal array with each branch, one item with mixed fields, and one item with an unknown \`kind\` value. Assert the validator identifies the failing item path and the endpoint leaves the whole request without unwanted partial effects.

If branches on purpose dual match and the business accepts any matching branch, \`anyOf\` may express that rule better. Do not change composition from a test. Report the ambiguous contract and let schema owners decide using the stated API rules.

The [database defaults and generated values guide](/blog/test-database-defaults-generated-columns-triggers) shows a similar rule: tests observe declared scope and report disagreements rather than rewriting contracts inside fixtures. Keep that separation visible in every failure report.

## Distinct OpenAPI Discriminator Error Cases

The discriminator field should be present and required in branch schemas. OpenAPI says discriminator behavior is undefined when the named field is absent, which is why the example makes \`kind\` required in both alternatives ([OpenAPI Discriminator Object](https://spec.openapis.org/oas/v3.1.1.html#discriminator-object)).

Make missing, null, number, empty string, casing variant, and unknown string cases when those values cross declared type or constants. Keep each case distinct so diagnostics show whether required, type, or value constraints failed.

Mapping keys are strings. Test the exact stated values \`card\` and \`bank\`, then one non-member. Do not assume case folding unless the schema or app clearly normalizes before check.

Also check each mapping target resolves to the intended component. A typo can break tooling before payload validation, while an implicit name may behave differently across multi-document resolution. Prefer explicit URI-reference mappings when the API contract follows that approach.

Build a mapping audit from each \`kind\` value to its resolved schema reference. Assert each listed branch has the intended mapping and each explicit mapping resolves within the document set. This is metadata proof, not payload validity, so keep it beside rather than inside branch-match checks.

The discriminator cannot rescue a structurally invalid branch. A card payload with no \`cardToken\` stays invalid even when kind maps to CardPayment. This is a required OpenAPI oneOf negative test data case because it catches validators or handlers that select and trust a branch without full validation.

Conversely, do not assert that discriminator metadata adds a new failure beyond branch schemas. The official specification forbids it from changing the validation outcome. If a tool's selection result differs, capture validator and version details as a compatibility finding rather than silently changing expected schema validity.

Use the [schema-based date-time edge article](/blog/schema-derived-date-time-boundary-test-data) when branch-specific fields include timestamps. Make format negatives inside the selected branch while keeping each other branch field valid.

## API Negative Testing for Stored Side Effects

Contract check alone proves schema outcome, not handler result. Send each high-risk negative payload through the real request edge and assert the stated response plus unchanged state.

List possible effects before testing: DB rows, idempotency records, queue messages, audit entries, object storage, and test email. Observe only systems the endpoint can actually touch. Use fakes or isolated resources where live effects must not run.

Capture counts or owned IDs before the request. After failure, query again and expect no new records for that run. A generic non-success status does not prove the request stopped before storage.

Distinguish JSON parsing failures from schema validation failures. Malformed JSON never produces the mixed object the schema expects, while well-formed wrong-shape JSON reaches contract validation. Keep parser cases outside this matrix and send a valid content type with each schema-negative request.

Likewise, check that test clients do not remove undefined fields or serialize class instances unexpectedly. Build plain objects, inspect the outgoing body in a safe test transport, and prefer clear omission cases. The payload crossing HTTP must match the matrix row reviewers approved.

Keep response expectations tied to the served OpenAPI description or stated application contract. This tutorial does not prescribe one universal status or error body for schema validation. Assert stable fields and schema locations without exposing raw tokens or internal stack details.

OpenAPI oneOf negative test data for endpoints should use run-scoped synthetic data. Contract-only fixtures can reuse static values, while stored tests need cleanup that cannot touch another worker. End teardown with a clear residue check.

If middleware validates before authentication or idempotency handling, include only ordering checks promised by the application. Do not infer universal middleware order from OpenAPI. Trace the application's actual request path and test the edge where side effects become possible.

Use [test data management strategies](/blog/test-data-management-strategies) for cross-system cleanup. The [partial unique index guide](/blog/partial-unique-index-negative-tests-soft-delete) shows equivalent post-failure DB checks for storage constraints.

## Release Proof for an OpenAPI Contract Change

A changed \`oneOf\` branch, discriminator mapping, required field, or closure rule affects the public contract. The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) classifies public-contract changes as high risk and needs cited proof from the judged commit.

Map the diff to result: valid card requests may be rejected, bank data may enter the card handler, or mixed objects may reach storage. Then select schema check, endpoint failure, and branch-handler tests that exercise those risks.

Report the OpenAPI file version, validator setup, selected matrix rows, run ID, response checks, and side-effect audit. A green unit suite using copied schemas is not sufficient when the packaged document changed.

Changed-line coverage can show handler branches and error translation executed. It cannot prove all listed subschemas resolved or exclusive matching occurred. Pair coverage with contract-checker results and clear branch match counts.

Classify coverage gaps by branch risk. An unexecuted new payment branch or changed discriminator dispatch is a blocker for that public contract. A comment-only schema description may not carry the same risk. Cite exact changed lines and contract files rather than presenting one aggregate rate.

When a branch is removed, add a rejection case for its former \`kind\` value and check that handler code no longer accepts it. Also check stored clients or fixtures only when the repository contains those files. Do not claim external consumer compatibility without consumer proof.

OpenAPI oneOf negative test data belongs in the gate when composition changes. Missing or unrun mixed-branch cases are missing proof, not a neutral result. Stale runs from another schema digest cannot support the current head.

The Guardian recommends but never merges, deploys, tags, or approves. Review [test impact analysis for CI](/blog/test-impact-analysis-ci-guide-2026), the [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026), and the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) to connect selection, proof, and required suites.

## Conclusion: Apply OpenAPI oneOf Negative Test Data

Start with the packaged OpenAPI document and resolve each listed branch. Build one small legal payload per branch, then add zero-match, mixed-object, discriminator, type, required, pattern, and dual-match guard cases directly from its keywords.

Run pure contract validation first for precise diagnostics. Send high-risk negatives through the endpoint next, assert the stated error, and check for partial side effects. Keep deterministic synthetic values and worker-safe cleanup throughout.

OpenAPI oneOf negative test data stays maintainable when each payload names its expected branch-match count and schema basis. That structure catches branch drift without converting the suite into random malformed JSON.

Build these matrices with the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer), then browse [all QA skills](/skills) for contract, database, and release workflows suited to your stack. Begin with the union used by one production endpoint.

## Frequently Asked Questions

### Does a discriminator make a payload valid by itself?

No. The discriminator only hints which alternative a payload is expected to satisfy and cannot change schema validation. The selected object must still meet every declared branch constraint in full, and the complete input must match exactly one \`oneOf\` subschema.

### Why can an object with fields from both branches fail?

A closed branch rejects fields not declared for that branch. In the example, card kind plus both tokens fails CardPayment because accountToken is extra, while BankPayment rejects card kind. Always derive this exact expectation from actual closure and \`kind\` constraints.

### What is the difference between zero matches and many matches?

Zero matches means no listed schema accepts the input. Many matches means more than one accepts it, which also violates \`oneOf\` exclusivity. Keep distinct branch results in test diagnostics so schema owners can clearly distinguish missing requirements from overlapping alternatives.

### Should invalid payloads use the generated TypeScript union?

No. A generated valid union type often stops malformed values from compiling. Represent negative payloads as \`unknown\` or a dedicated test-case type, then send them only to validation helpers. Keep clear descriptive names so reviewers understand the exact intended schema violation.

### What release proof is useful for a oneOf change?

Record the judged schema digest, changed branches, discriminator mapping, selected positive and rejection cases, distinct match counts, endpoint response checks, and side-effect audit. Include validator setup and run identity so reviewers can trace results directly to the exact OpenAPI file.
`,
};
