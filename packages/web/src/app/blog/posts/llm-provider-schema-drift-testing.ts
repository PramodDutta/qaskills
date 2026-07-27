import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM provider schema drift testing',
  description:
    'LLM provider schema drift testing: use repo evidence, focused fixtures, code examples, and CI checks to expose contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'AI Testing',
  primaryKeyword: 'LLM provider schema drift testing',
  keywords: [
    'LLM provider schema drift testing',
    'how to llm provider schema drift testing',
    'llm provider schema drift testing example',
    'LLM API response contract test',
    'provider finish reason schema',
    'token usage response drift',
  ],
  relatedSlugs: [
    'golden-dataset-llm-evaluation-guide',
    'eval-dataset-versioning-guide-2026',
    'testing-llm-applications-guide',
    'testing-llm-structured-output-json-schema-guide',
  ],
  sources: [
    'https://json-schema.org/draft/2020-12/json-schema-core',
    'https://platform.openai.com/docs/guides/function-calling',
    'https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/',
  ],
  repoEvidence: [
    'seed-skills/prompt-testing/SKILL.md',
    'seed-skills/ai-system-quality-engineer/SKILL.md',
  ],
  content: `LLM provider schema drift testing replays versioned response fixtures through a strict client before app code reads them. The gate passes when supported envelopes normalize into one exact local shape, while renamed fields, invalid nulls, unknown finish reasons, malformed usage, and incompatible errors stop with path-level schema check evidence.

## What must LLM provider schema drift testing prove?

LLM provider schema drift testing must prove wire changes cannot alter mapped app data with no clear sign. Parsing JSON is only the first check because well-formed data may still break the client contract.

The accepted path checks a known API reply, maps it once, and returns stable text, model, finish state, and token use. The test should compare the whole local result rather than a few fields. A pass must also prove no required field came from a blank or a default.

The rejected path names the case build, reply branch, data path, and failed rule. No log, cache, bill, or later eval should receive a partly mapped result. The failure must show the raw path and rule so a developer can find the break fast.

Drift includes renamed keys, new nesting, changed number types, required fields that allow null, new enum values, changed error bodies, and wrong usage sums. Each kind needs its own case and expected reason. One change per case keeps the first failed path tied to one clear cause.

This scope concerns API wire fields, not JSON made by the model for a business task. Use the [structured output testing guide](/blog/testing-llm-structured-output-json-schema-guide) when the assistant's content must satisfy a domain schema. That split keeps a wire fault from looking like a bad answer.

The [JSON Schema core specification](https://json-schema.org/draft/2020-12/json-schema-core) defines a common schema model and structured check output. Its error form can name the failed data path instead of returning one bare true or false value.

The [OpenAI function calling guide](https://platform.openai.com/docs/guides/function-calling) shows tool output tied to call IDs and sent as JSON or text. A client must keep those IDs while checking the rest of the API reply. The case should fail if a valid tool result is linked to the wrong call.

\`seed-skills/prompt-testing/SKILL.md\` reads score, speed, token use, and cost fields, then checks structured output with Zod. Those examples show why a field default with no warning can skew later test results.

\`seed-skills/ai-system-quality-engineer/SKILL.md\` places schema and budget checks before model scoring. LLM provider schema drift testing turns that order into a focused wire gate.

Use the [testing LLM applications guide](/blog/testing-llm-applications-guide) for the full app flow. This contract ends after a checked reply becomes a stable local result or a typed client error.

## Which repo behavior defines the test contract?

Read \`seed-skills/prompt-testing/SKILL.md\` from its reply compare sample through the structured output check. The file reads score, speed, token, and cost fields across prompt forms. List each field before writing a case so no live use is missed.

That code uses fallback values when extra fields are absent. Such defaults may suit a sample, but an API client test should tell an allowed gap from an unknown one. A required key must fail even when a blank value would let the next step run.

The same file defines a Zod schema for made product data and checks bad JSON cases. This article borrows that strict check for API fields while keeping made business content outside scope.

Next, \`seed-skills/ai-system-quality-engineer/SKILL.md\` says fixed schema, citation, speed, and token checks should come before model scores. Provider cases can run without a model and should fail before a paid eval. This order gives CI a fast cause before any model score can hide the wire fault.

Define two clear API branches: success and error. A branch matcher should reject an object that mixes part of a success reply with an error body.

The mapped success output can contain \`responseId\`, \`model\`, \`text\`, \`finishReason\`, and exact use counts. The mapped error should contain a stable class, safe message, API code, and retry flag. Both branches need a full expected object, not just a check that one key exists.

Keep the raw case fixed and compare all mapped values. Changing an API object during the map can hide which field the upstream reply sent.

The [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide) helps build model score cases. Wire cases need the same kind of reviewed source label, capture date, API build, and redaction note. Those facts let a reviewer tell old support from a fresh upstream change.

LLM provider schema drift testing should not accept each unknown field on sight or reject each new field by default. State the rule for each object, then test it with known extra keys.

## How to llm provider schema drift testing?

How to llm provider schema drift testing begins with safe success and error fixtures from supported API builds. Handwritten changes should stem from those controls rather than replace them, with a short note that names the old reply used for each case.

Pin the client schema build separately from the API model name. A model update and a reply update are different events even when they arrive together.

Check before the data map, then map from typed data only. Avoid optional chaining with zero or empty-string fallbacks on fields that the local contract requires, so a blank key cannot pass as a valid zero or empty text.

Represent nullability explicitly. A field that may be string or null needs a union, while an omitted required field should produce a different schema check error.

The first TypeScript and Vitest example uses Zod to define a strict supported success branch. It is proposed client code derived from the repo's schema check style, not an existing API client.

\`\`\`typescript
import { expect, it } from 'vitest';
import { z } from 'zod';

const ProviderSuccess = z
  .object({
    id: z.string().min(1),
    model: z.string().min(1),
    output_text: z.string(),
    finish_reason: z.enum(['stop', 'length', 'tool_call']),
    usage: z
      .object({
        input_tokens: z.number().int().nonnegative(),
        output_tokens: z.number().int().nonnegative(),
        total_tokens: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.usage.total_tokens !== value.usage.input_tokens + value.usage.output_tokens) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['usage', 'total_tokens'],
        message: 'usage-total-mismatch',
      });
    }
  });

function normalizeSuccess(input: unknown) {
  const value = ProviderSuccess.parse(input);
  return {
    responseId: value.id,
    model: value.model,
    text: value.output_text,
    finishReason: value.finish_reason,
    inputTokens: value.usage.input_tokens,
    outputTokens: value.usage.output_tokens,
  };
}

it('normalizes the supported reply exactly', () => {
  const fixture = {
    id: 'resp-17',
    model: 'model-pinned-1',
    output_text: 'Fixture answer',
    finish_reason: 'stop',
    usage: { input_tokens: 12, output_tokens: 4, total_tokens: 16 },
  };

  expect(normalizeSuccess(fixture)).toEqual({
    responseId: 'resp-17',
    model: 'model-pinned-1',
    text: 'Fixture answer',
    finishReason: 'stop',
    inputTokens: 12,
    outputTokens: 4,
  });
});
\`\`\`

The schema names are client choices for a controlled example. Replace them with the exact stated fields of the API build your repo supports.

Keep the success fixture frozen and run the data map twice. Both results should match, and the source fixture must remain unchanged, while a deep copy check proves no nested key was removed or replaced.

Add a separate error union instead of letting success parsing fall through to a generic exception. The [evaluation dataset versioning guide](/blog/eval-dataset-versioning-guide-2026) can inform fixture review and change history.

## Llm provider schema drift testing example: scenario and assertion matrix

An llm provider schema drift testing example should mutate one field at a time from a passing captured fixture. Multi-field corruptions are useful later but make initial ownership harder.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Supported success | Exact required fields and reconciled usage | Full mapped result matches snapshot | Missing or defaulted local field | Repository response consumers |
| Renamed text field | \`output_text\` becomes \`text\` | Missing-field error at exact path | Empty text silently normalizes | Adapter schema |
| Invalid null | \`model\` becomes null | Type error before run logs | Null becomes unknown model | JSON Schema type rules |
| New finish reason | Enum receives \`content_filter\` | Explicit unsupported-enum error | Value maps to generic stop | Provider build policy |
| Usage drift | Total differs from input plus output | Reconciliation issue on total | Cost run logs accepts mismatch | Repository token budget gate |
| New error branch | Error body changes nesting and code type | Typed error-schema failure | Generic success or retry result | Adapter error union |

Run the supported fixture before each change group. A schema that rejects both baseline and drift does not prove the intended support boundary, since the green row must pass before the red row can show a new break.

The renamed-field row should not add an empty fallback. Require a path-level issue for the missing old field and, under a strict rule, an issue for the unknown new one, with both paths shown in the saved test report.

The null row proves omission and null are not interchangeable. Record actual value type without serializing unrelated API content into CI logs.

For a new finish reason, rejecting first is safer than mapping it to a known state without review. Add support through a schema and data map change with a dedicated fixture.

Usage sums are an app rule, not a promise made by each API. If an API reports cached or thought token groups, define how they count and test the exact stated sums, including a zero case and one case where the total is wrong.

The [structured output testing guide](/blog/testing-llm-structured-output-json-schema-guide) covers made payload schemas. Keep this matrix tied to response wire, API fields, and client output.

LLM provider schema drift testing should store expected schema check paths and mapped snapshots. Those artifacts make an upstream change reviewable before production metrics start shifting.

## What failures expose LLM API response contract test?

An LLM API response contract test fails when invalid wire data reaches downstream code or valid supported data stops normalizing. Test both directions because excessive strictness can break releases as easily as silent coercion.

Renamed fields often disappear behind optional chaining. Search for defaults such as empty text, zero tokens, unknown model, or generic stop and require proof that each default is allowed, then fail the case when an unstated default reaches the app.

Changed nullability can corrupt run logs and cache keys. A null model identifier should not become a shared "unknown" bucket unless the contract explicitly defines that result.

Finish-reason drift affects end-state logic. Mapping each unknown value to stop can mark cut, blocked, or tool-based output as a normal answer, so each supported value needs its own expected app state.

Usage drift affects cost and limit checks. Reject a negative, part, string, missing, or wrong count before updating a budget or score report, and prove each bad row leaves the old total unchanged.

Error-reply drift can trigger the wrong retry path. A newly nested API code should not become a vague net fault or match the success branch by mistake, while the test still keeps the safe upstream code for review.

The negative example parameterizes these changes and asserts exact issue paths. It also proves no run logs function runs after schema check fails.

\`\`\`typescript
import { expect, it, vi } from 'vitest';

const validFixture = {
  id: 'resp-17',
  model: 'model-pinned-1',
  output_text: 'Fixture answer',
  finish_reason: 'stop',
  usage: { input_tokens: 12, output_tokens: 4, total_tokens: 16 },
};

it.each([
  ['missing text', { ...validFixture, output_text: undefined }, ['output_text']],
  ['null model', { ...validFixture, model: null }, ['model']],
  ['unknown finish', { ...validFixture, finish_reason: 'new_reason' }, ['finish_reason']],
  [
    'usage mismatch',
    { ...validFixture, usage: { input_tokens: 12, output_tokens: 4, total_tokens: 99 } },
    ['usage', 'total_tokens'],
  ],
])('rejects %s before telemetry', (_name, fixture, expectedPath) => {
  const telemetry = vi.fn();
  const parsed = ProviderSuccess.safeParse(fixture);

  expect(parsed.success).toBe(false);
  if (!parsed.success) {
    expect(parsed.error.issues[0]?.path).toEqual(expectedPath);
  }
  expect(telemetry).not.toHaveBeenCalled();
});
\`\`\`

Order checks with care because a strict object can return more than one issue. Search the issue list for expected paths when several failures are planned, and sort saved paths before a snapshot check when source order has no meaning.

Add a valid fixture with an allowed nullable field if the API contract includes one. This proves the schema does not reject null everywhere by habit.

Add an error case that looks like success but lacks output. The branch matcher must produce one clear error result or rejection, never a partial mapped success, and no text or token count may leak from the wrong branch.

Use the [testing LLM applications guide](/blog/testing-llm-applications-guide) when valid wire later produces a poor answer. LLM provider schema drift testing owns only the reply and stable client result.

## How should provider finish reason schema run in CI?

A provider finish reason schema should run against committed sanitized fixtures without calling the API. Every supported finish reason needs one positive data-map case and a stated app state.

Store the raw API value and mapped local value in expected snapshots. This catches a mapper change even when the schema check still passes.

Reject unknown values in the focused gate, then review them against current API documentation before adding support. The change should update schema, mapper, fixtures, downstream handling, and run logs together.

Run the full wire fixture suite when client code, SDK versions, model configuration, response parsing, run logs, or API pins change. Run a smaller schema smoke test on unrelated pull requests if build time requires it.

The report should include fixture ID, API label, schema build, branch, schema check result, issue paths, mapped finish state, and side-effect counts. Do not retain secret headers or unredacted user content.

Fail CI on zero fixtures, unsupported values, missing branches, duplicate fixture IDs, snapshot drift, defaulted required fields, run logs after rejection, or unreviewed fixture updates. A changed API example should never auto-approve its own contract.

The OpenTelemetry [GenAI attribute registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/) lists response finish reasons as an array and also lists model and token usage attributes. Its registry marks several entries as moved or deprecated, which itself shows why local data map should not mirror an external run logs name blindly.

Keep API reply schema check before run logs translation. A run logs convention can guide observable names, but it does not define whether the API response is valid for your client.

Use the [LLM CI quality gate guide](/blog/llm-evaluation-ci-cd-quality-gates) to sequence schema, integration, and model-backed checks. LLM provider schema drift testing should remain the earliest fixed wire gate.

## Which assertions verify token usage response drift?

Token usage response drift requires exact type, range, sums, provenance, and side-effect assertions. A nonzero total alone can hide strings, negatives, omitted groups, and double counting.

Assert counters are finite nonnegative integers when that matches the API contract. Reject numeric strings rather than relying on implicit conversion.

Assert required counters exist separately from optional groups. Missing input tokens and a legitimate zero are different states with different downstream meaning.

Assert reviewed sums for total usage. If cached or reasoning tokens are subsets, document whether they are already included before adding them.

Assert mapped input and output values exactly against each fixture. Avoid comparing only total because swapped counters can preserve the same sum.

Assert API and model provenance beside usage. Token counts without their source reply and model label are weak evidence for cost or limit decisions.

Assert schema check occurs before run logs, cache updates, billing estimates, or quality reports. Every rejected fixture should leave those spies untouched.

Assert repeated data map produces identical output and does not mutate the fixture. Mutation can make a second parser call pass after the first removed unknown fields.

Assert error responses never receive fabricated zero usage unless the local contract explicitly represents absence that way. Prefer \`null\` or a separate branch over ambiguous defaults.

Assert case totals after the suite. Accepted plus rejected fixture counts must equal discovered fixtures, and each ID must appear once.

Use the [evaluation dataset versioning guide](/blog/eval-dataset-versioning-guide-2026) for review practices around expected data changes. Transport fixtures need the same deliberate ownership even though they are not model eval goldens.

LLM provider schema drift testing should expose the first invalid field and all affected side effects. That evidence prevents a later cost anomaly from becoming the first visible symptom.

## Step-by-step test implementation

Build the suite from captured supported envelopes, then derive isolated mutations and exact mapped snapshots. Keep API access outside the focused command.

1. Read \`seed-skills/prompt-testing/SKILL.md\` and record each response quality, latency, usage, cost, and structured-data field consumed by its examples.
2. Read \`seed-skills/ai-system-quality-engineer/SKILL.md\`, then place schema and token checks before metrics, run logs, cache writes, or billing estimates.
3. Sanitize and build one supported success fixture and one supported error fixture with API, model, capture, schema, and redaction fields.
4. Implement strict branch schema check and data map, then compare complete local results and typed errors against reviewed snapshots.
5. Inject renamed fields, invalid nulls, unknown finish reasons, malformed usage, unknown extras, mixed branches, and changed error envelopes.
6. Run the focused suite in CI, reconcile fixture IDs, retain issue paths, verify unchanged inputs and side effects, and assign drift ownership.

Begin with a minimum reply that still contains each required local field. Add optional fields one at a time with explicit policy and tests.

Freeze fixtures in tests or deep-copy them before data map. Compare the original after each run to catch mutating parsers and cleanup code.

Add a mutation that replaces strict schema check with permissive passthrough. Missing fields should then default or leak downstream, and side-effect assertions should fail.

Add a mutation that maps each finish reason to stop. The dedicated finish fixtures should expose incorrect app states even though parsing succeeds.

Document the schema build and focused command beside the fixtures. A reviewer should know whether an API SDK upgrade requires deliberate recapture.

Use the [QA skills directory](/skills) for adjacent contract and AI testing patterns. Keep this suite focused on API envelopes rather than made business output.

## Failure triage and regression ownership

Start triage with fixture provenance and the first schema check issue path. Confirm the fixture matches the supported API branch before changing data map code.

A missing required field may indicate API drift, SDK serialization changes, or an incomplete fixture. Compare a safely captured reply and API build without guessing from downstream defaults.

An invalid null belongs to schema policy unless current API documentation now permits it. Review whether the local app can represent that state before widening the union.

An unknown finish reason requires coordinated ownership across client, app state, run logs, and tests. Do not patch only the enum to make schema check green.

A usage mismatch may come from new token groups or incorrect sums. Inspect stated inclusion rules and update exact fixtures rather than forcing totals to balance.

A changed error body belongs to error-branch parsing and retry classification. Verify that no failed response can match the success union or create a normal cache entry.

A valid old fixture rejected after local changes is a client regression. Compare schema build and issue list before recapturing data, since recapture can hide accidental incompatibility.

A valid new reply rejected may represent intentional upstream change. Add support only after policy review, then retain the old fixture if backward support remains required.

A zero-fixture run belongs to CI discovery and blocks release. A passing type check cannot replace runtime schema cases and side-effect assertions.

Use the [structured output testing guide](/blog/testing-llm-structured-output-json-schema-guide) when the reply is valid but made JSON is not. LLM provider schema drift testing should keep wire ownership clear.

## Frequently Asked Questions

### How do you contract-test an LLM provider adapter when response fields, nullability, usage objects, finish reasons, or error envelopes change?

Replay sanitized versioned success and error fixtures through strict branch schemas before data map. Derive one-field mutations and assert path-level issues, full mapped snapshots, immutable inputs, and untouched side effects. Add upstream changes only through reviewed schema, mapper, fixture, run logs, and downstream-state updates.

### What fixture best tests how to llm provider schema drift testing?

Use one minimal supported success reply and one supported error reply captured from a pinned API build, then redact and freeze them. Derive renamed, missing, null, enum, usage, extra-field, and mixed-branch cases. Provenance fields should identify API, model, schema build, capture, and review status.

### Which failure signal proves llm provider schema drift testing example?

The clearest signal is invalid API data creating a mapped result, run logs event, cache entry, or billing estimate. Exact issue-path drift, silent required-field defaults, unknown finish reasons mapped to stop, irreconcilable usage, mutable fixtures, and valid baseline rejection are additional stable contract failures.

### How should CI report LLM API response contract test?

Report fixture ID, API and model labels, schema build, success or error branch, schema check outcome, issue paths, mapped snapshot status, and downstream spy counts. Exclude credentials and private content. Accepted plus rejected counts must match unique discovered fixtures before the job can report a complete result.

### When should provider finish reason schema block a release?

Block release when an unknown finish reason is silently accepted, a supported value maps to the wrong local state, fixtures are missing, or rejected envelopes reach downstream code. Adding an API value requires reviewed app semantics and run-log handling, not only a wider enum in the validator.

### How can teams keep token usage response drift repeatable?

Commit sanitized fixtures with exact counters, provenance, and stated sums. Pin schema and client versions, reject implicit numeric coercion, compare input and output counters separately, and spy on each downstream write. Review new token groups explicitly, then preserve older fixtures for required backward support.

## Conclusion

LLM provider schema drift testing makes wire support a fixed release decision. Strict branch schemas, exact mapped snapshots, path-level errors, immutable fixtures, and zero downstream effects on rejection expose field, nullability, finish-state, usage, and error-reply changes before they distort app behavior.

Open the [QA skills directory](/skills) to choose an AI testing skill. Read the [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide) before implementing this regression gate.`,
};
