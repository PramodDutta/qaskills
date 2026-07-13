import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "OpenAPI Nullable vs Optional Contract Tests",
  description:
    "Write OpenAPI nullable vs optional contract tests that distinguish missing, null, and populated properties across OpenAPI 3.0, 3.1, validators, and clients.",
  date: "2026-07-13",
  category: "Reference",
  content: `
# OpenAPI Nullable vs Optional Contract Tests

\`{"middleName": null}\` and \`{}\` are different messages. The first says the property is present with no value; the second says the property was not sent. OpenAPI models those axes separately, and contract tests should exercise all three states: missing, explicit null, and a value of the declared type.

## Required controls presence, type controls null

In an object schema, the parent object's \`required\` array decides whether a property must appear. The property's schema decides which values are valid. “Optional” is therefore about presence, while “nullable” is about the value domain.

| Property declaration | Missing | \`null\` | String value |
|---|---:|---:|---:|
| Optional string | Valid | Invalid | Valid |
| Required string | Invalid | Invalid | Valid |
| Optional nullable string | Valid | Valid | Valid |
| Required nullable string | Invalid | Valid | Valid |

This matrix is the core oracle. Many generator bugs collapse the first and third rows, or map both nullable rows to an optional field in a language that cannot express presence separately.

## Express nullability in OpenAPI 3.0 and 3.1

OpenAPI 3.0 uses the \`nullable: true\` keyword alongside a type. OpenAPI 3.1 aligns its Schema Object with JSON Schema and represents null as a type.

\`\`\`yaml
# OpenAPI 3.0 fragment
components:
  schemas:
    CustomerPatch:
      type: object
      required: [displayName]
      properties:
        displayName:
          type: string
          nullable: true
        middleName:
          type: string
          nullable: true
        nickname:
          type: string
\`\`\`

Here \`displayName\` must be present but may be null. \`middleName\` may be omitted, null, or a string. \`nickname\` may be omitted or be a string, but null is invalid.

The equivalent 3.1 schema is:

\`\`\`yaml
openapi: 3.1.0
components:
  schemas:
    CustomerPatch:
      type: object
      required: [displayName]
      properties:
        displayName:
          type: [string, "null"]
        middleName:
          type: [string, "null"]
        nickname:
          type: string
\`\`\`

An \`anyOf\` containing \`{ type: string }\` and \`{ type: "null" }\` is another valid JSON Schema expression. Tool compatibility may influence the representation, but the contract semantics must remain the same. The [OpenAPI 3.1 contract-testing guide](/blog/openapi-3-1-contract-testing-guide-2026) covers dialect selection and validation in more depth.

## Generate a complete truth table before examples

Example payloads in documentation are illustrative, not exhaustive. Derive cases from presence and value independently.

| Case | Payload fragment | Expected result for required nullable string |
|---|---|---|
| Missing | \`{}\` | Reject, required property absent |
| Explicit null | \`{"displayName": null}\` | Accept |
| Valid value | \`{"displayName": "Ari"}\` | Accept |
| Wrong scalar | \`{"displayName": 7}\` | Reject |
| Empty string | \`{"displayName": ""}\` | Accept unless \`minLength\` forbids it |

Empty string is not null. Zero is not absence. An empty array is not a missing array. Contract cases should resist application shortcuts that treat all falsy values alike.

## Validate request bodies with a real JSON Schema engine

For a focused 3.1 unit test, Ajv can compile the schema. This tests the schema semantics directly; end-to-end provider tests still need to prove the deployed API enforces the same rules.

\`\`\`ts
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

const schema = {
  type: 'object',
  required: ['displayName'],
  properties: {
    displayName: { type: ['string', 'null'] },
    middleName: { type: ['string', 'null'] },
    nickname: { type: 'string' },
  },
  additionalProperties: false,
} as const;

const validate = new Ajv2020({ allErrors: true }).compile(schema);

describe('CustomerPatch presence and nullability', () => {
  it.each([
    [{ displayName: null }, true],
    [{ displayName: 'Ari' }, true],
    [{ displayName: 'Ari', middleName: null }, true],
    [{}, false],
    [{ displayName: 'Ari', nickname: null }, false],
    [{ displayName: 7 }, false],
  ])('validates %j as %s', (body, expected) => {
    expect(validate(body)).toBe(expected);
  });
});
\`\`\`

Ajv 2020 targets JSON Schema 2020-12 semantics. Do not feed an OpenAPI 3.0 Schema Object directly and assume full compatibility, because 3.0 is not simply standard JSON Schema with a different version label.

## Exercise the provider endpoint, including omission

Serialization libraries can erase the distinction before the server sees it. Send raw JSON bodies for negative and boundary cases, then assert status and persisted state.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('PATCH distinguishes omission from explicit null', async ({ request }) => {
  const created = await request.post('/api/customers', {
    data: { displayName: 'Ari', middleName: 'Lee', nickname: 'ari' },
  });
  expect(created.ok()).toBeTruthy();
  const id = (await created.json()).id;

  const omitted = await request.patch(\`/api/customers/\${id}\`, {
    data: { displayName: 'Ari updated' },
  });
  expect(omitted.ok()).toBeTruthy();
  expect(await omitted.json()).toMatchObject({ middleName: 'Lee' });

  const cleared = await request.patch(\`/api/customers/\${id}\`, {
    data: { displayName: null, middleName: null },
  });
  expect(cleared.ok()).toBeTruthy();
  expect(await cleared.json()).toMatchObject({ displayName: null, middleName: null });

  const invalid = await request.patch(\`/api/customers/\${id}\`, {
    data: { displayName: 'Ari', nickname: null },
  });
  expect(invalid.status()).toBe(400);
});
\`\`\`

This example encodes PATCH semantics where omission means “leave unchanged” and null means “clear.” JSON Merge Patch formally has related null behavior, while a normal application/json patch endpoint must document its own semantics. Do not infer update meaning from schema validation alone.

## Responses need the same three-way coverage

A server may accept correct requests and emit invalid responses through an ORM serializer. Validate response bodies for endpoints where the field can be missing, null, or populated.

| Scenario | Contract expectation | Common implementation defect |
|---|---|---|
| Unauthorized viewer | Sensitive optional property omitted | Serializer emits it as null and leaks field existence |
| No middle name recorded | Nullable field is null | Serializer drops null unexpectedly |
| Profile projection excludes field | Optional property absent | Generated model inserts default null |
| Database has value | String is returned | Mapper converts empty value to null |

Whether omission is allowed in a response is not merely a validator detail. Consumers may interpret missing as “not fetched” and null as “fetched, no value.”

## Required plus nullable is a legitimate design

Teams sometimes remove a property from \`required\` because its business value can be unknown. That changes the wire contract unnecessarily. A required nullable property provides a stable response shape while explicitly representing unknown data.

It is appropriate when every response must disclose that the attribute was considered, or when generated consumers benefit from a stable key. It is less appropriate for sparse projections, PATCH requests, and permission-dependent fields.

| API need | Better schema choice |
|---|---|
| Stable response key, unknown allowed | Required and nullable |
| PATCH leave-unchanged behavior | Optional, nullable only if clear is supported |
| Sensitive field hidden by authorization | Optional, document omission |
| Value always known when key exists | Optional non-nullable |
| Value must always be supplied and known | Required non-nullable |

## Watch generated client type collapse

Language type systems represent presence differently. TypeScript can express \`middleName?: string | null\`; Java may need an explicit nullable wrapper or presence-tracking model; Go pointers often conflate omitted and null unless a custom type records whether unmarshalling occurred.

Test generated clients with serialization, not only compilation:

\`\`\`ts
type CustomerPatch = {
  displayName: string | null;
  middleName?: string | null;
  nickname?: string;
};

const omitted: CustomerPatch = { displayName: 'Ari' };
const cleared: CustomerPatch = { displayName: 'Ari', middleName: null };

expect(JSON.stringify(omitted)).toBe('{"displayName":"Ari"}');
expect(JSON.stringify(cleared)).toBe('{"displayName":"Ari","middleName":null}');
\`\`\`

If the generator initializes every optional nullable field to null, the client cannot express omission. That is a compatibility defect even when server-side schema validation is correct.

## Detect contract drift during schema changes

Changing optional to required breaks producers that omit the field. Changing non-nullable to nullable broadens accepted input but can break consumers that dereference without checks. Changing nullable to non-nullable breaks existing null producers and stored data.

| Change | Input compatibility | Response consumer risk |
|---|---|---|
| Optional -> required | Breaking for omissions | Usually stronger response guarantee |
| Required -> optional | Accepts more requests | Consumers may not handle absence |
| Non-nullable -> nullable | Broadens request acceptance | Consumers may crash on null |
| Nullable -> non-nullable | Rejects existing nulls | Consumers gain stronger guarantee only after migration |

Schema-diff tools can flag these transitions, but an executable consumer and provider suite proves runtime behavior. The [microservice API contract testing article](/blog/api-contract-testing-microservices) discusses where those checks sit in delivery pipelines.

## Avoid misleading defaults

A schema \`default\` is generally an annotation describing an assumed value, not a universal instruction that validators or servers insert missing properties. Test the API's actual defaulting behavior separately. If omission yields a stored default, assert the returned representation. If explicit null bypasses or rejects defaulting, include that case.

\`readOnly\` and \`writeOnly\` also affect required interpretation by request or response direction. A required read-only identifier is not expected in a create request. Use an OpenAPI-aware validator for whole-operation checks rather than extracting schemas without request-response context.

## Diagnose validator disagreements

When documentation UI, gateway, server framework, and CI validator disagree, reduce the problem to a tiny schema and three payloads. Confirm the OpenAPI version and the dialect the tool claims to support.

| Symptom | Likely cause |
|---|---|
| 3.1 type array rejected | Tool only supports OpenAPI 3.0 |
| \`nullable\` ignored | JSON Schema validator does not implement OpenAPI 3.0 extension |
| Missing property accepted | Property name absent from parent \`required\` |
| Null becomes omitted in client | Serializer configured to drop null values |
| Example passes docs but API rejects | Example is not validation or runtime schema drifted |

Pin validator versions in CI and keep a small conformance test for required-nullable combinations. Upgrading a parser should not silently reinterpret contracts.

## Build a reusable contract test matrix

For each nullable or optional property, generate cases for missing, null, valid value, wrong type, and relevant boundaries such as empty string. Pair schema-level validation with at least one deployed endpoint check and one client serialization check for important SDKs. Add persistence assertions for updates because acceptance alone does not prove omission and null produced different effects.

Review error responses as contracts too. A missing required field and a null non-nullable field should both fail, but machine-readable error locations should identify the correct property without echoing sensitive input.

## Apply the matrix to arrays, nested objects, and composition

An optional array can be absent but, unless nullable, cannot be null. An empty array is a valid present value unless \`minItems\` says otherwise. Test all three because generated models often initialize an omitted collection to \`[]\`, destroying presence information. For PATCH, missing might mean “keep members,” null might mean “clear assignment” only if allowed, and \`[]\` might mean “replace with no members.” Those meanings must be documented separately from validation.

Nested objects multiply the states. If \`address\` is optional and nullable, but \`address.country\` is required, then missing address and null address can both be valid while \`{"address": {}}\` is invalid. Generate cases at each nesting level. A validator that checks only leaf fields can wrongly reject null parents or accept incomplete objects.

\`oneOf\` and discriminators introduce another distinction. Null must be an explicit branch or allowed type when the composed schema permits it. Adding \`nullable: true\` beside composition in OpenAPI 3.0 has uneven support across tools, especially when no local \`type\` is declared. Reduce the schema, test the validator versions used by producer and consumer, and prefer a representation those tools demonstrably interpret the same way.

Parameters are different from JSON body properties. Query-string absence, an empty value, and the literal text \`null\` are not automatically JSON null. OpenAPI parameter serialization rules control how values appear. Write HTTP-level cases rather than reusing body-schema expectations for \`?filter=null\`.

Database nullability also does not define the API. A non-null database column can back an optional request property because the service supplies a default. A nullable column can back a non-null API response because the mapper substitutes a business representation. Contract tests should target the wire schema and then verify persistence behavior, without assuming ORM metadata is the source of truth.

For backward-compatibility tests, retain representative payloads from deployed clients: omitted optionals from older versions, explicit nulls from languages that serialize empty fields, and populated values. Validate them against the candidate schema and provider. This corpus catches changes that a schema diff classifies abstractly but a team needs to understand concretely.

Error payloads should preserve location. Missing \`displayName\` and present-null \`nickname\` are separate validation failures. Assert a machine-readable path and keyword or error code, not a framework's English sentence. Clients can then map the failure to the correct field even if server copy changes.

Documentation examples should include at least one omission and one explicit null where the difference matters. Showing only a full populated object invites SDK authors and consumers to assume every key is required. Examples do not replace the truth-table tests, but they communicate intent.

When migrating 3.0 to 3.1, run the same payload corpus against both schemas before switching production tooling. Replace nullable syntax mechanically only after confirming reference resolution, composition, and generator behavior. The desired acceptance matrix should remain identical unless the migration intentionally changes the contract.

Apply media-type semantics separately. JSON has a native null value, while form-urlencoded and multipart inputs often represent an empty field instead. If an operation accepts several content types, build a presence matrix for each instead of transferring JSON expectations mechanically.

A 204 response has no body, which differs from a 200 response whose body is null. Generated clients may map both to a language null, so provider tests must assert status and raw body presence before SDK mapping.

Headers and query parameters are not JSON object properties. An absent header, an empty header, and the literal text \`null\` need serialization-level tests. The nullable keyword should not be copied to every representation of an unknown business concept.

Polymorphic bodies require independent discriminator coverage. A missing discriminator can make branch selection ambiguous even when member fields permit null. Reject that payload before a generated client attempts an unsafe cast.

Keep schema fixtures sourced from the published document or its bundled build output. Copying a property into test code lets the test and actual contract drift independently. Resolve the operation through the delivery toolchain, then apply the truth table.

GraphQL nullability notation is unrelated even if the domain model is shared. Do not translate a GraphQL optional argument or non-null marker by name alone. Generate OpenAPI wire cases from the REST operation and verify any gateway mapping independently.

Code-first frameworks can infer requiredness from language annotations, constructor defaults, validation decorators, or serializer settings. Add a schema snapshot focused on the property and run the payload matrix against the generated document. A TypeScript question mark or Python \`Optional\` can be interpreted differently across generators.

For response redaction, decide whether unauthorized fields disappear or become null. Omission usually reveals less and represents “not part of this projection,” while null can indicate a known empty value. Test both schema acceptance and privacy behavior with actors who have different field permissions.

Arrays of nullable items are a separate axis from a nullable array. \`type: [array, "null"]\` allows the collection itself to be null; an item schema including null allows entries such as \`["a", null]\`. Create distinct cases for missing array, null array, empty array, and null element.

## Frequently Asked Questions

### Is nullable the same as removing a property from required?

No. Nullable permits the JSON value \`null\`; removing a property from \`required\` permits the key to be absent. They control independent dimensions.

### How do I write a required property that may be null in OpenAPI 3.1?

Put the property name in the parent object's \`required\` array and declare its type as both the normal type and \`null\`, for example \`type: [string, "null"]\`.

### Does a default make an optional field appear automatically?

Not necessarily. OpenAPI defaults are annotations, and many validators do not mutate payloads. Test server defaulting as application behavior instead of assuming schema insertion.

### Why does my generated SDK send null for every optional field?

Its model or serializer may not preserve presence separately from value. Add serialization tests and choose generator settings or custom wrappers that can represent omitted, null, and populated states.

### Should a PATCH request use nullable fields to mean clear?

It can, if the operation explicitly documents null as clear and omission as unchanged. Validate that behavior through persistence tests; schema nullability alone does not define update semantics.
`,
};
