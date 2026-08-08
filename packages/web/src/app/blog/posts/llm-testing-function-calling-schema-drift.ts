import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM Testing Function Calling Schema Drift: Catch Tool Contract Breaks Before Users Do',
  description: 'Use LLM testing function calling schema drift checks to pin tool JSON Schemas, assert argument shapes, and block deploys when model tools silently diverge.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# LLM Testing Function Calling Schema Drift: Catch Tool Contract Breaks Before Users Do

LLM testing function calling schema drift is the discipline of treating tool definitions (names, JSON Schemas, required fields, enums) as versioned contracts, then continuously proving that (1) the schema you publish to the model matches the schema your runtime executes, and (2) model-produced tool calls still validate against that schema under realistic prompts. Drift appears when a developer renames a property in code but forgets the prompt-time tool list, when a "harmless" optional field becomes required, when an enum gains a value the executor does not understand, or when two services disagree about whether money is a string or a number.

Function calling failures rarely look like clean stack traces in product UI. Users see assistants that apologize, loop, or claim success while no ticket was created. QA teams that only snapshot final natural-language answers miss the broken tool phase entirely. The fix is not a single golden chat transcript. It is a layered suite: schema registry checks, static parity between code and tool specs, validators on every tool call in eval runs, and CI gates that fail when hashes diverge.

This guide builds those layers with concrete TypeScript-style fixtures, AJV validation patterns, drift classifications, multi-step agent loop assertions, and a failure story based on an optional-to-required field change. For broader agent evaluation design, see the [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026). When tools are exposed through Model Context Protocol servers, pair this article with [MCP servers test automation](/blog/mcp-servers-test-automation-2026).

## Define the tool schema as a first-class test fixture

Stop treating tool JSON as an inline object that product code pastes into an API client. Lift each tool into a fixture module that both production wiring and tests import.

\`\`\`ts
// tools/create_support_ticket.ts
export const createSupportTicketTool = {
  name: 'create_support_ticket',
  description:
    'Create a support ticket for a logged-in customer. Use when the user reports a product defect or billing problem.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['customerId', 'subject', 'priority'],
    properties: {
      customerId: {
        type: 'string',
        minLength: 3,
        description: 'Stable customer id from the session, not an email.',
      },
      subject: {
        type: 'string',
        minLength: 5,
        maxLength: 120,
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
      },
      orderId: {
        type: 'string',
        description: 'Optional commerce order id when the issue is order-specific.',
      },
    },
  },
} as const;

export type CreateSupportTicketArgs = {
  customerId: string;
  subject: string;
  priority: 'low' | 'medium' | 'high';
  orderId?: string;
};
\`\`\`

Production executor imports the same schema:

\`\`\`ts
// runtime/tool-executor.ts
import AjvModule from 'ajv';
import { createSupportTicketTool, type CreateSupportTicketArgs } from '../tools/create_support_ticket';

const Ajv = (AjvModule as unknown as { default?: typeof AjvModule }).default ?? AjvModule;
const ajv = new Ajv({ allErrors: true, strict: false });
const validateCreateTicket = ajv.compile(createSupportTicketTool.inputSchema);

export async function executeTool(
  name: string,
  args: unknown,
): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  if (name !== createSupportTicketTool.name) {
    return { ok: false, error: \`unknown_tool:\${name}\` };
  }
  if (!validateCreateTicket(args)) {
    return {
      ok: false,
      error: \`schema_validation_failed:\${ajv.errorsText(validateCreateTicket.errors)}\`,
    };
  }
  const typed = args as CreateSupportTicketArgs;
  // Call internal API with typed args...
  return {
    ok: true,
    result: { ticketId: \`tkt_\${typed.customerId}\`, priority: typed.priority },
  };
}
\`\`\`

The single-source import is the first anti-drift control. Eval code must not redefine a "similar" schema.

## Pin and hash the schema the model is allowed to call

Publish a manifest of tools that your orchestration layer sends to the model provider. Hash that manifest in CI. When someone edits a tool file, the hash changes and a deliberate review is required.

\`\`\`ts
// tools/manifest.ts
import { createHash } from 'node:crypto';
import { createSupportTicketTool } from './create_support_ticket';
import { searchKnowledgeBaseTool } from './search_knowledge_base';

export const toolManifest = {
  version: '2026-08-08.1',
  tools: [createSupportTicketTool, searchKnowledgeBaseTool],
} as const;

// Sort keys at every depth. A top-level replacer array is the trap here: it is
// applied at all levels, so it strips every nested key that is not in the list
// and the hash then ignores the parameter schemas you are trying to protect.
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value === null || typeof value !== 'object') return value;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

export function hashToolManifest(manifest: typeof toolManifest): string {
  const canonical = JSON.stringify(sortKeysDeep(manifest));
  return createHash('sha256').update(canonical).digest('hex');
}
\`\`\`

\`\`\`ts
// test/schema/manifest-hash.spec.ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { toolManifest, hashToolManifest } from '../../tools/manifest';

describe('tool manifest pin', () => {
  it('matches the committed hash fixture', () => {
    const expected = readFileSync(
      path.resolve(__dirname, 'fixtures/tool-manifest.sha256'),
      'utf8',
    ).trim();
    expect(hashToolManifest(toolManifest)).toBe(expected);
  });
});
\`\`\`

When the hash test fails, the author must update the fixture in the same PR and fill a short drift checklist in the PR template: breaking or additive, consumers notified, eval suite updated, executor migrations included.

| Drift class | Example change | Safe default gate |
|---|---|---|
| Additive optional property | Add optional \`orderId\` | Allow with hash update + eval smoke |
| Required property added | \`priority\` becomes required | Block until evals and docs update |
| Property removed | Drop \`orderId\` | Block; search for callers |
| Type change | \`quantity\` string to number | Block |
| Enum widen | Add \`priority: urgent\` | Block until executor handles it |
| Enum narrow | Remove \`low\` | Block; historical prompts may still emit it |
| Name change | \`create_support_ticket\` rename | Block; treat as new tool + deprecation |

## Assert argument shapes after every model response

Golden answer tests that only check the final assistant message hide tool failures. Instrument the agent loop so each function call is validated before execution and recorded for assertions.

\`\`\`ts
// eval/run-agent.ts
import { toolManifest } from '../tools/manifest';
import { executeTool } from '../runtime/tool-executor';

export type ToolCallRecord = {
  name: string;
  args: unknown;
  validationError?: string;
  result?: unknown;
};

export type AgentTurn = {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCallRecord[];
};

// Provider-agnostic seam: your adapter maps vendor responses into this shape.
export type ModelClient = {
  complete: (input: {
    messages: AgentTurn[];
    tools: typeof toolManifest.tools;
  }) => Promise<{
    assistantMessage: string;
    toolCalls: Array<{ name: string; args: unknown }>;
  }>;
};

export async function runAgentLoop(options: {
  client: ModelClient;
  userMessage: string;
  maxToolSteps: number;
}): Promise<{ turns: AgentTurn[]; toolCalls: ToolCallRecord[] }> {
  const turns: AgentTurn[] = [{ role: 'user', content: options.userMessage }];
  const toolCalls: ToolCallRecord[] = [];

  for (let step = 0; step < options.maxToolSteps; step += 1) {
    const model = await options.client.complete({
      messages: turns,
      tools: toolManifest.tools,
    });

    if (model.toolCalls.length === 0) {
      turns.push({ role: 'assistant', content: model.assistantMessage });
      break;
    }

    const stepRecords: ToolCallRecord[] = [];
    for (const call of model.toolCalls) {
      const executed = await executeTool(call.name, call.args);
      const record: ToolCallRecord = {
        name: call.name,
        args: call.args,
        validationError: executed.ok ? undefined : executed.error,
        result: executed.ok ? executed.result : undefined,
      };
      stepRecords.push(record);
      toolCalls.push(record);
      turns.push({
        role: 'tool',
        content: JSON.stringify(executed),
      });
    }
    turns.push({
      role: 'assistant',
      content: model.assistantMessage,
      toolCalls: stepRecords,
    });
  }

  return { turns, toolCalls };
}
\`\`\`

Eval assertion example with a deterministic fake client (no live model required for schema path tests):

\`\`\`ts
// eval/function-calling-schema.eval.spec.ts
import { runAgentLoop, type ModelClient } from './run-agent';

describe('function calling schema validation', () => {
  it('flags missing required priority', async () => {
    const client: ModelClient = {
      async complete() {
        return {
          assistantMessage: '',
          toolCalls: [
            {
              name: 'create_support_ticket',
              args: {
                customerId: 'cus_123',
                subject: 'Charged twice for one order',
                // priority intentionally missing
              },
            },
          ],
        };
      },
    };

    const result = await runAgentLoop({
      client,
      userMessage: 'I was charged twice',
      maxToolSteps: 1,
    });

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.validationError).toMatch(/schema_validation_failed/);
  });

  it('accepts a valid tool payload', async () => {
    const client: ModelClient = {
      async complete() {
        return {
          assistantMessage: 'Created your ticket.',
          toolCalls: [
            {
              name: 'create_support_ticket',
              args: {
                customerId: 'cus_123',
                subject: 'Charged twice for one order',
                priority: 'high',
                orderId: 'ord_9',
              },
            },
          ],
        };
      },
    };

    const result = await runAgentLoop({
      client,
      userMessage: 'I was charged twice',
      maxToolSteps: 1,
    });

    expect(result.toolCalls[0]?.validationError).toBeUndefined();
    expect(result.toolCalls[0]?.result).toMatchObject({ priority: 'high' });
  });
});
\`\`\`

Live-model evals still matter for "does the model choose the right tool," but schema drift tests should run offline and fast on every PR.

## Detect additive vs breaking drift with versioned schemas

Maintain an explicit version field in the manifest and, when needed, dual-publish tool definitions during migrations.

\`\`\`ts
// tools/migrations/2026-08-08-priority-required.ts
export const changeNote = {
  id: '2026-08-08-priority-required',
  tool: 'create_support_ticket',
  class: 'required_property_added',
  property: 'priority',
  migration: 'Executor defaults missing priority to medium for one release, then removes default.',
};
\`\`\`

Automated classifier (illustrative) comparing two JSON Schema objects:

\`\`\`ts
// test/schema/diff-tools.ts
type JsonSchema = {
  required?: string[];
  properties?: Record<string, unknown>;
};

export type DriftFinding =
  | { kind: 'required_added'; property: string }
  | { kind: 'required_removed'; property: string }
  | { kind: 'property_removed'; property: string }
  | { kind: 'property_added'; property: string };

export function diffObjectSchemas(
  before: JsonSchema,
  after: JsonSchema,
): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const beforeProps = new Set(Object.keys(before.properties ?? {}));
  const afterProps = new Set(Object.keys(after.properties ?? {}));
  const beforeReq = new Set(before.required ?? []);
  const afterReq = new Set(after.required ?? []);

  for (const property of afterProps) {
    if (!beforeProps.has(property)) {
      findings.push({ kind: 'property_added', property });
    }
  }
  for (const property of beforeProps) {
    if (!afterProps.has(property)) {
      findings.push({ kind: 'property_removed', property });
    }
  }
  for (const property of afterReq) {
    if (!beforeReq.has(property)) {
      findings.push({ kind: 'required_added', property });
    }
  }
  for (const property of beforeReq) {
    if (!afterReq.has(property)) {
      findings.push({ kind: 'required_removed', property });
    }
  }
  return findings;
}
\`\`\`

Wire the diff into CI against the last released manifest artifact, not only against the previous git commit on a long-lived branch. Release tags are the contract the production model configuration actually used.

## Failure mode: optional field becomes required overnight

### Story

\`orderId\` was optional on \`create_support_ticket\`. A backend engineer makes it required because the ticketing vendor API changed. They update the TypeScript type and the executor, but the tool schema shipped to the model still marks \`orderId\` as optional (or omits it from \`required\`). Offline unit tests pass with fixtures that always include \`orderId\`. Staging demos use happy-path prompts that mention order numbers. Production traffic includes billing complaints without order ids. The model omits \`orderId\`, the executor rejects the call, and the assistant invents a fake ticket confirmation in natural language because the prompt says "be helpful."

### Diagnosis

1. Inspect server logs for \`schema_validation_failed\` rates by tool name.
2. Compare the tool schema blob sent to the model provider with the schema used by AJV in the executor.
3. Find mismatch on \`required\` arrays.
4. Replay a production prompt through the eval harness with the production schema package.

### Fix

Unify the schema module, add a parity test, and add a negative eval that omits \`orderId\` when it is optional or expects a controlled clarification path when it is required.

\`\`\`ts
// test/schema/executor-model-parity.spec.ts
import { createSupportTicketTool } from '../../tools/create_support_ticket';
import { toolManifest } from '../../tools/manifest';

describe('executor and model tool parity', () => {
  it('exposes create_support_ticket schema identically in the manifest', () => {
    const fromManifest = toolManifest.tools.find(
      (tool) => tool.name === 'create_support_ticket',
    );
    expect(fromManifest).toEqual(createSupportTicketTool);
  });

  it('keeps required fields aligned with product rules', () => {
    expect(createSupportTicketTool.inputSchema.required).toEqual([
      'customerId',
      'subject',
      'priority',
    ]);
    expect(createSupportTicketTool.inputSchema.required).not.toContain('orderId');
  });
});
\`\`\`

If product truly requires \`orderId\`, update the schema, the hash fixture, the eval suite, and the user-facing clarification prompt in the same PR. Schema-only changes without prompt/eval updates are incomplete.

## What people get wrong about "the model usually follows the schema"

Providers may offer constrained decoding or schema-guided generation for some tool features, but QA should not assume perfect adherence. Models still emit wrong types, extra properties, and missing fields under long contexts, multilingual input, or multi-tool confusion. Another mistake is validating only at the outer edge while intermediate agent steps rewrite arguments. Validate at execution time every call.

A third mistake is snapshotting raw model JSON without normalizing. Arg key order and whitespace differ. Validate against JSON Schema instead of string equality. A fourth mistake is hiding validation errors from the model. Sometimes you want to return a tool error object so the model can retry; sometimes you want to stop. Encode that policy explicitly and test both paths.

| Policy | When to use | Test focus |
|---|---|---|
| Hard fail the turn | High-risk actions (refunds, deletes) | No side effect on invalid args |
| Return tool error to model | Recoverable shape mistakes | Retry produces valid second call |
| Ask user to clarify | Missing business data | No invented ids |
| Drop unknown fields | Backward compatible readers | \`additionalProperties\` behavior |

## Golden traces for multi-step tool loops

Single-call tests miss sequencing bugs: search then ticket, or ticket without search when policy requires retrieval first. Store traces as JSONL fixtures.

\`\`\`ts
// eval/fixtures/billing-complaint.trace.json
{
  "id": "billing-complaint-basic",
  "userMessage": "I was charged twice for order ord_9",
  "expectToolSequence": [
    "search_knowledge_base",
    "create_support_ticket"
  ],
  "expectTicketArgs": {
    "priority": "high",
    "orderId": "ord_9"
  }
}
\`\`\`

\`\`\`ts
// eval/trace-expectations.ts
import type { ToolCallRecord } from './run-agent';

export function assertToolSequence(
  toolCalls: ToolCallRecord[],
  expectedNames: string[],
): void {
  const names = toolCalls.map((call) => call.name);
  expect(names).toEqual(expectedNames);
}

export function assertNoValidationErrors(toolCalls: ToolCallRecord[]): void {
  for (const call of toolCalls) {
    expect(call.validationError).toBeUndefined();
  }
}
\`\`\`

Run live-model traces on a schedule or on main, not necessarily on every PR, to control cost. Run fake-client schema tests on every PR.

## CI gates that block deploys on schema registry mismatches

A practical pipeline split:

1. **PR:** unit tests, schema hash pin, executor/manifest parity, fake-client function-call validation.
2. **Main / nightly:** live-model eval sample with recorded tool calls, drift report against last production manifest artifact.
3. **Release:** canary compares production validation error rate for tool calls against an illustrative internal threshold your team sets (for example, investigate when invalid-tool-call rate doubles week over week). Do not treat any public blog number as universal.

\`\`\`yaml
# .github/workflows/llm-tool-schema.yml
name: llm-tool-schema
on:
  pull_request:
  push:
    branches: [main]
jobs:
  offline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:tool-schema
  live-eval:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run eval:live-tools
        env:
          MODEL_API_KEY: \${{ secrets.MODEL_API_KEY }}
\`\`\`

Store the last production manifest as a build artifact or object-storage object. Diff jobs should fail on breaking classes even if unit tests were updated carelessly.

## Cross-service tools and MCP surfaces

When tools are remote MCP servers, schema drift gains a network dimension: the client lists tools via the protocol, while the server may have deployed a new schema. Contract-test the tool list and input schemas the same way you would message pacts: consumer (agent host) pins expectations, server verifies it still advertises compatible tools. Combine this article with MCP-focused automation for transport details, and keep JSON Schema assertions identical at the host validation layer.

If agents in your org install skills from qaskills.sh with the qaskills CLI, prefer skills that generate tool fixtures and parity tests rather than only chat-level snapshots.

## Prompt and schema co-change checklist

Every PR that touches tools should answer:

1. Did \`inputSchema\` change?
2. Did the hash fixture update in the same PR?
3. Did executor validation change with it?
4. Did system prompts mention old field names?
5. Did eval traces that emit this tool still pass?
6. Is the change additive, breaking, or a rename?
7. Are dashboards ready to show \`schema_validation_failed\` for this tool name?

## Observability fields that make drift debuggable

Log structured events for each tool call (without secrets):

| Field | Purpose |
|---|---|
| \`toolName\` | Group error rates |
| \`schemaVersion\` / manifest hash | Join to release |
| \`validationOk\` | Primary drift signal |
| \`errorCode\` | Distinguish unknown tool vs bad args |
| \`modelId\` | Provider/model regressions |
| \`latencyMs\` | Separate slowness from shape errors |
| \`agentTraceId\` | Join multi-step loops |

Do not log full personal data from arguments. Hash or redact customer ids if policy requires.

## Red-team style prompts that stress schemas

Include offline cases that tempt the model to invent fields:

\`\`\`ts
const adversarialCases = [
  'Create a ticket and set priority to "ultra-mega-high"',
  'File a ticket for customer cus_1 but put the subject in Chinese and priority 1',
  'Call create_support_ticket with extra field adminOverride true',
  'Skip the ticket tool and claim you created one',
];
\`\`\`

Assert either valid tool args, a clarification question, or an explicit refusal policy. Invented enum values should fail validation and must not hit the backend.

## Putting a minimal suite in a new repo

1. Create \`tools/*.ts\` modules with JSON Schema and names.
2. Compile validators in the executor path.
3. Add manifest hash pin test.
4. Add fake-client evals for valid and invalid args.
5. Add parity test that the model-bound tool list equals the executor list.
6. Add nightly live eval with tool sequence assertions.
7. Alert on rising validation failure rates in production.

That suite is enough to catch the majority of function calling schema drift before users do. Expand with MCP contracts and multi-agent hosts as the architecture grows.

## Frequently Asked Questions

### Is JSON Schema the only way to test function calling arguments?

No, but it is the common interchange format many model tool APIs accept or mirror. You can also validate with Zod or other runtime validators if you generate JSON Schema from them for the model and ensure both sides share one source. The requirement is parity, not a specific library brand.

### How often should live-model tool evals run?

Run offline schema and parity tests on every PR. Run live-model sampling on main or on a schedule that fits your API budget. High-risk tools (payments, account deletion) deserve more frequent live sampling than low-risk search tools. Measure your own flake and cost; do not copy another team's cadence blindly.

### What if the provider rejects our schema features?

Stay inside the subset your provider documents for tool schemas. Advanced JSON Schema keywords may be ignored or rejected. Keep executor-side validation stricter if needed, and add tests that prove the published subset still matches executor expectations for required fields and types.

### Can we snapshot entire multi-turn transcripts instead of schema checks?

Snapshots help with regression narrative, but they are brittle and expensive as a sole strategy. Combine lightweight schema validation on every call with a smaller set of trace expectations for sequences and business outcomes. When a snapshot fails, schema errors should be checked first so you do not rewrite prompts to paper over a required-field change.
`,
};
