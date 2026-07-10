import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Structured Output JSON Schema Testing Guide',
  description:
    'Test structured output JSON Schema contracts for AI apps so parsers, validators, and model responses fail safely before production releases.',
  date: '2026-07-10',
  category: 'AI Testing',
  content: `
# Structured Output JSON Schema Testing Guide

Your parser does not care that the model "mostly followed the format." It receives bytes, parses JSON, validates fields, and either moves the workflow forward or throws. Structured output reduces that risk by asking the model provider to follow a JSON Schema, but it does not remove the need for tests. The schema can be too loose, too strict, incompatible with the provider's supported subset, or mismatched with the downstream TypeScript type.

For AI applications, structured output is a contract surface. It sits between prompt behavior and application code. If the model returns a support_ticket object, the router expects category, priority, summary, and confidence to mean specific things. If any of those meanings drift, a valid JSON object can still trigger the wrong workflow.

This guide focuses on JSON Schema testing for structured model responses. The examples use the OpenAI Responses API shape for schema-constrained text output, plus Ajv for independent validation in tests. The same testing ideas apply to other providers that support schema-constrained generation. For tool argument testing, pair this with [tool-calling accuracy testing](/blog/tool-calling-accuracy-testing-guide-2026). For evaluator design and grading, use [the OpenAI evals graders reference](/blog/openai-evals-graders-complete-reference-2026).

## Treat the schema as production code

A JSON Schema for model output is not prompt decoration. It controls what your application accepts. Store it next to the parser, review it like code, version it when consumers depend on it, and test it with fixtures that represent both valid and invalid output.

| Schema concern | Test question | Example failure |
|---|---|---|
| Required fields | Does the validator reject missing workflow-critical data? | Missing priority silently becomes normal |
| Enum values | Are downstream routes protected from invented labels? | Model returns urgent_now instead of urgent |
| Additional properties | Are unexpected fields rejected or intentionally ignored? | Hallucinated refundApproved flag reaches logs or UI |
| Numeric bounds | Are confidence and scores constrained? | Confidence 500 bypasses threshold logic |
| String shape | Are IDs, dates, and codes checked beyond being strings? | Invalid ticket ID reaches database insert |
| Provider subset | Does the schema use features supported by strict generation? | Request fails or provider ignores an unsupported keyword |

Provider-enforced structured output and local validation solve different problems. Provider enforcement improves generation. Local validation protects your code if the request is misconfigured, a provider changes behavior, old fixtures are replayed, or another model path bypasses the structured setting.

## A support triage schema with strict boundaries

Start with a schema that is narrow enough to protect the workflow. If a support triage agent can only route four categories, encode the enum. If confidence drives automation, bound it between 0 and 1. If the application should reject unknown keys, set additionalProperties to false.

\`\`\`ts
import Ajv, { type JSONSchemaType } from 'ajv';

type SupportTicketOutput = {
  category: 'billing' | 'bug' | 'account' | 'how_to';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  summary: string;
  confidence: number;
  needsHumanReview: boolean;
};

const supportTicketSchema: JSONSchemaType<SupportTicketOutput> = {
  type: 'object',
  additionalProperties: false,
  required: ['category', 'priority', 'summary', 'confidence', 'needsHumanReview'],
  properties: {
    category: { type: 'string', enum: ['billing', 'bug', 'account', 'how_to'] },
    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
    summary: { type: 'string', minLength: 1, maxLength: 500 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    needsHumanReview: { type: 'boolean' },
  },
};

const ajv = new Ajv({ allErrors: true });
const validateSupportTicket = ajv.compile(supportTicketSchema);

export function parseSupportTicketOutput(raw: string): SupportTicketOutput {
  const parsed: unknown = JSON.parse(raw);
  if (!validateSupportTicket(parsed)) {
    throw new Error('Invalid support ticket output: ' + ajv.errorsText(validateSupportTicket.errors));
  }
  return parsed;
}
\`\`\`

This code is intentionally boring. Boring is good here. The parser should not guess, repair, or coerce unless the product explicitly wants repair behavior. If the AI output contract fails, fail closed and decide whether to retry, ask a human, or route to a safe fallback.

## Calling a model with JSON Schema output

The Responses API uses text.format for structured text output. The format can be json_schema with a name, schema, and strict flag. Strict schema adherence supports a subset of JSON Schema, so keep provider-facing schemas simple and verify the exact shape in an integration test.

\`\`\`ts
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['category', 'priority', 'summary', 'confidence', 'needsHumanReview'],
  properties: {
    category: { type: 'string', enum: ['billing', 'bug', 'account', 'how_to'] },
    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
    summary: { type: 'string' },
    confidence: { type: 'number' },
    needsHumanReview: { type: 'boolean' },
  },
};

async function triage(message: string) {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: 'Classify the support request. Return only the structured result.',
      },
      {
        role: 'user',
        content: message,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'support_ticket_triage',
        schema,
        strict: true,
      },
    },
  });

  return JSON.parse(response.output_text);
}

triage('I was charged twice for my renewal and need help today.').then(console.log);
\`\`\`

This is an integration example, not a complete test. A real test would call parseSupportTicketOutput on response.output_text and assert domain behavior, such as billing plus high or urgent priority for duplicate charge language. The provider helps produce valid shape. Your test still decides whether the shape is useful.

## Fixture tests for parser compatibility

Before hitting a model, test the parser and schema locally. Fixture tests are fast and deterministic. They also catch breaking schema edits before anyone spends tokens.

\`\`\`ts
import assert from 'node:assert/strict';
import { parseSupportTicketOutput } from './support-ticket-output';

function acceptsValidTicket() {
  const parsed = parseSupportTicketOutput(
    JSON.stringify({
      category: 'billing',
      priority: 'high',
      summary: 'Customer reports duplicate renewal charge.',
      confidence: 0.94,
      needsHumanReview: true,
    }),
  );

  assert.equal(parsed.category, 'billing');
  assert.equal(parsed.needsHumanReview, true);
}

function rejectsInventedPriority() {
  assert.throws(() =>
    parseSupportTicketOutput(
      JSON.stringify({
        category: 'billing',
        priority: 'right_now',
        summary: 'Customer reports duplicate renewal charge.',
        confidence: 0.94,
        needsHumanReview: true,
      }),
    ),
  );
}

function rejectsExtraActionFlag() {
  assert.throws(() =>
    parseSupportTicketOutput(
      JSON.stringify({
        category: 'billing',
        priority: 'high',
        summary: 'Customer reports duplicate renewal charge.',
        confidence: 0.94,
        needsHumanReview: true,
        refundApproved: true,
      }),
    ),
  );
}

acceptsValidTicket();
rejectsInventedPriority();
rejectsExtraActionFlag();
\`\`\`

These tests look simple because they target the actual failure modes: invented enum, extra action flag, and valid baseline. Add fixtures from production incidents. If a model once returned a nested object where the parser expected a string, keep that fixture.

## Schema strictness without painting yourself into a corner

Strict schemas protect systems, but over-specific schemas create unnecessary churn. The trick is to be strict about workflow-critical fields and flexible only where the application is truly flexible.

| Field | Good strictness | Risky strictness |
|---|---|---|
| category | Enum matching actual routing destinations | Free text category that the router maps by guesswork |
| priority | Enum with documented escalation semantics | Ten priority levels nobody can explain |
| summary | Required string with length bounds | Regex that rejects harmless punctuation |
| confidence | Numeric range 0 to 1 | String percentage that every caller parses differently |
| needsHumanReview | Required boolean | Optional flag defaulting to false |
| explanation | Optional only if no automation depends on it | Required long prose that increases latency and token use |

If a downstream workflow changes, update the schema and parser together. Do not let the prompt invent a transitional format. Transitional compatibility belongs in explicit versioned parsers.

## Testing semantic correctness after schema validity

A schema can prove that priority is one of four strings. It cannot prove the model chose the right one. That is a semantic test. Keep semantic tests separate from schema tests so failures are understandable.

For semantic checks, build a small evaluation set with inputs and expected labels. Use exact assertions for deterministic policy decisions. Use graders or human review for nuanced tasks. The important part is to avoid mixing parser failure, provider request failure, and model judgment failure into one vague "AI test failed" result.

\`\`\`ts
import assert from 'node:assert/strict';

type Case = {
  input: string;
  expectedCategory: string;
  minimumPriority: 'normal' | 'high' | 'urgent';
};

const priorityRank = { low: 0, normal: 1, high: 2, urgent: 3 };

const cases: Case[] = [
  {
    input: 'I was billed twice this morning and need the duplicate charge reversed.',
    expectedCategory: 'billing',
    minimumPriority: 'high',
  },
  {
    input: 'The export button throws a 500 error for every report.',
    expectedCategory: 'bug',
    minimumPriority: 'high',
  },
];

export async function runTriageSemanticChecks(triage: (input: string) => Promise<any>) {
  for (const item of cases) {
    const output = await triage(item.input);
    assert.equal(output.category, item.expectedCategory);
    assert.ok(priorityRank[output.priority] >= priorityRank[item.minimumPriority]);
  }
}
\`\`\`

This is not a schema test. It assumes schema validation already passed. It checks whether the output means the right thing. That separation makes triage faster when something breaks.

## Compatibility between JSON Schema and TypeScript

TypeScript types do not validate runtime data. JSON Schema validates runtime data but can drift from TypeScript if maintained separately. Pick a direction and automate checks. Some teams write JSON Schema first and generate types. Others write Zod schemas and convert to JSON Schema for providers. Either can work if the source of truth is clear.

Avoid three independent definitions: prompt description, TypeScript type, and JSON Schema. If all three differ, the model may satisfy the prompt, the validator may reject the output, or the application may assume a field that the schema never required.

| Source of truth | Benefit | Watch out for |
|---|---|---|
| JSON Schema first | Provider contract and runtime validation are explicit | Type generation must be part of build or review |
| Zod first | Developer ergonomics and parser code are strong | Provider may not support every converted schema keyword |
| TypeScript type first | Easy for app developers to read | No runtime validation unless paired with schema |
| OpenAPI component | Works when AI output mirrors an API object | API schemas may be too permissive for model output |

For strict provider schemas, keep the provider-facing schema simple. If your local validator uses advanced JSON Schema features, test that the provider-facing subset still protects the fields that matter.

## Negative testing for refusal, truncation, and invalid inputs

Structured output does not remove operational failure modes. The request can fail. The model can refuse in contexts where refusal behavior is supported. Output can be truncated if token limits are too low. Your parser can receive an empty string because a wrapper bug read the wrong property.

Write tests for your handling path:

1. Provider call throws a rate limit or timeout error.
2. response.output_text is empty.
3. JSON.parse throws.
4. JSON validates but semantic confidence is below automation threshold.
5. Schema version is older than the parser expects.

The safe behavior depends on the workflow. A support triage system may route to human review. A code generation system may stop the action. A reporting tool may show a validation error. Define that behavior in tests.

## Versioning schemas without breaking stored outputs

Structured outputs often get stored: ticket classifications, extraction records, moderation decisions, rubric grades, tool plans, and workflow state. Once stored, schema evolution becomes a migration problem. Adding a required field may be safe for new responses and unsafe for old records. Renaming an enum may break dashboards. Removing a field may break replay.

Version the schema when consumers need different behavior. A simple version field can be enough, but it must be part of the parser contract. Tests should load old fixtures and prove the current reader either accepts them through a compatibility path or rejects them with a controlled migration error. Do not let old records fail later in a background job with a generic JSON validation message.

For AI systems, schema versions also help evals. If priority changed from low, normal, high, urgent to p0 through p3, old labeled examples should not be silently compared against the new enum. Keep the eval set tied to the schema version it expects, then migrate examples deliberately.

## Boundary tests for downstream actions

The highest-risk structured outputs are the ones that trigger actions. A JSON object that writes a database row, sends an email, files a ticket, changes a permission, or calls a tool deserves boundary tests around the action mapper.

Build fixtures at the edge of the schema: confidence exactly at the automation threshold, summary at maximum length, every enum value, needsHumanReview true with urgent priority, and a valid object that should still be blocked by business policy. These tests catch the gap between "valid JSON" and "safe action."

For example, a billing category with confidence 0.51 may be valid but still below your auto-refund threshold. A bug category with urgent priority may page support but not engineering unless the summary includes an outage marker. Encode those rules outside the model. Then test them with structured fixtures so prompt changes cannot quietly change action policy.

## Observability for schema failures

When validation fails, log the schema name, schema version, model name, prompt version, and validation error path. Do not log raw sensitive content by default. Aggregate failures by error path. If most failures are missing confidence, the schema and prompt need work. If failures cluster around one model route, the provider configuration may be wrong.

Good observability also prevents bad retries. Retrying the same prompt three times because the parser rejects an enum may waste money and still fail. A retry policy should know whether the error was provider timeout, invalid JSON, schema validation failure, or semantic rejection.

## Contract tests for provider migration

Structured-output schemas become especially important when teams change providers or move one workflow to a cheaper model. Run the same fixture set through the new route before switching traffic. Compare schema validity, semantic labels, refusal behavior, and latency. A provider can satisfy the schema and still choose different categories or confidence values.

Keep migration tests small and high-signal. Include one easy case, one ambiguous case, one adversarial formatting case, and one case near the automation threshold. The goal is not to prove the new model is globally better. The goal is to prove the structured contract your application consumes still behaves well enough for this workflow.

If the new route requires a simpler schema subset, do not silently weaken local validation. Keep the application parser strict and translate provider output into the internal schema through a reviewed adapter. Then test the adapter with the same invalid fixtures used against the original parser.

Adapters deserve ownership like any other contract layer.

## Frequently Asked Questions

### Does structured output mean I can skip JSON validation?

No. Provider-side schema enforcement improves generation, but your application still needs a runtime guard. Local validation protects alternate paths, configuration mistakes, old fixtures, and downstream parser assumptions.

### Should I use JSON mode or JSON Schema structured output?

Use JSON Schema structured output when the provider and model support it and you need fields to follow a contract. JSON mode can ensure valid JSON, but it does not by itself enforce required fields, enums, or bounds.

### Why did my strict schema request fail?

Strict structured output supports a subset of JSON Schema. Common causes are unsupported keywords, missing required fields for object properties, or forgetting additionalProperties false in strict function schemas. Simplify the provider-facing schema and keep advanced validation local if needed.

### How do I test model judgment separately from schema validity?

First validate shape with fixture and parser tests. Then run a labeled evaluation set that asserts expected categories, priorities, or decisions. Keep those failures separate in reports.

### Should the model output explanations in the same schema?

Only include explanations if a consumer needs them. Extra prose increases tokens and can create privacy or review obligations. If explanations are only for debugging, consider logging prompt traces or storing sampled evaluation artifacts instead.
`,
};
