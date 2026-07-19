import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Test LLM Tool-Calling Accuracy: A Practical Guide',
  description: 'Learn how to test LLM tool calling accuracy with schema checks, scenario suites, argument scoring, adversarial cases, and CI-ready regression gates.',
  date: '2026-07-16',
  category: 'AI Testing',
  content: `
# How to Test LLM Tool-Calling Accuracy: A Practical Guide

An assistant that writes a polished answer but calls the wrong tool is not merely unhelpful. It can create a ticket in the wrong project, query production instead of staging, or issue a refund with an incorrect amount. Testing must therefore separate fluent language from operational correctness.

To test LLM tool calling accuracy, treat every model turn as a structured decision with four observable parts: whether a tool should be used, which tool is selected, whether its arguments are valid, and whether the assistant responds correctly to the tool result. This guide builds a repeatable TypeScript harness around those parts. The approach works with recorded provider responses, a live model adapter, or both.

## Define accuracy as a set of independently scored decisions

A single pass or fail hides useful failure patterns. Suppose a model correctly chooses \`search_orders\` but sends a customer email where an order ID is required. Tool selection passed, argument grounding failed. If those are collapsed into one number, the team cannot tell whether a prompt change improved routing while damaging extraction.

Use a scorecard that maps directly to production risk:

| Dimension | Question | Example failure | Suggested measurement |
|---|---|---|---|
| Invocation | Should any tool be called? | Calls a refund tool for a policy question | Precision and recall |
| Selection | Was the correct tool chosen? | Chooses \`search_users\` instead of \`search_orders\` | Exact-match accuracy |
| Structure | Do arguments satisfy the declared schema? | Omits required \`orderId\` | Schema-valid percentage |
| Grounding | Are values supported by the request or context? | Invents order \`A-991\` | Per-field exact or normalized match |
| Sequence | Are multiple calls ordered correctly? | Refunds before checking payment status | Scenario pass rate |
| Recovery | Does the assistant handle errors safely? | Repeats a destructive call after a timeout | Policy-rule pass rate |

Track each dimension by tool and scenario class. A 96 percent aggregate can conceal a payment tool at 70 percent while easy read-only search cases dominate the dataset.

## Model each test case as an executable contract

Keep the expected behavior outside the prompt. A compact fixture should contain the user request, available tool definitions, expected call, and any safety constraints. Use \`null\` when the correct action is to answer without a tool.

\`\`\`ts
export type ExpectedCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type ToolCase = {
  id: string;
  user: string;
  expected: ExpectedCall | null;
  forbiddenTools?: string[];
};

export const cases: ToolCase[] = [
  {
    id: 'lookup-explicit-order',
    user: 'Check delivery status for order QA-1042',
    expected: {
      name: 'get_order',
      arguments: { orderId: 'QA-1042' },
    },
  },
  {
    id: 'policy-only-no-call',
    user: 'What is the usual return window?',
    expected: null,
    forbiddenTools: ['issue_refund'],
  },
];
\`\`\`

Avoid putting hints such as “should call get_order” into the user text. The fixture is the oracle, and the request must resemble actual traffic. Add metadata in a separate field if you need slices such as locale, risk tier, or source channel.

For ambiguous requests, encode an expected clarification instead of forcing a tool call. For example, “cancel my last order” may require identity and order confirmation. A model that confidently guesses is less accurate than one that asks for the missing information.

## Validate the tool envelope before judging meaning

Start with deterministic validation. It is cheap, reproducible, and explains failures precisely. The model adapter should normalize provider-specific output to a small envelope such as \`{ name, arguments }\`. Validate the arguments against the same JSON Schema supplied to the model.

\`\`\`bash
pnpm add -D vitest ajv
pnpm exec vitest run
\`\`\`

The following test checks selection and schema conformance. Ajv compiles a JSON Schema into a validation function. Keeping \`additionalProperties: false\` catches plausible-looking but unsupported fields.

\`\`\`ts
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['orderId'],
  properties: {
    orderId: { type: 'string', pattern: '^QA-[0-9]+$' },
  },
} as const;

const ajv = new Ajv();
const validate = ajv.compile(schema);

describe('get_order contract', () => {
  it('accepts a grounded order lookup', () => {
    const actual = {
      name: 'get_order',
      arguments: { orderId: 'QA-1042' },
    };

    expect(actual.name).toBe('get_order');
    expect(validate(actual.arguments), ajv.errorsText(validate.errors)).toBe(true);
    expect(actual.arguments.orderId).toBe('QA-1042');
  });
});
\`\`\`

Schema validity does not prove semantic correctness. Both \`QA-1042\` and \`QA-9999\` match the pattern. Follow structural checks with field-level assertions tied to the user message, authenticated context, or a known prior tool result.

## Score arguments without rewarding dangerous near misses

Different fields need different comparators. Normalize case and surrounding whitespace for an email address, compare monetary values exactly after converting to minor units, and compare enumerated values exactly. Do not use fuzzy string similarity for IDs, account numbers, permissions, or destructive action parameters.

| Argument type | Comparator | Normalization allowed | Failure severity |
|---|---|---|---|
| Order or user ID | Exact string | Usually none | High |
| Email | Case-insensitive exact match | Trim and lowercase | Medium to high |
| Money | Exact integer minor units and currency | Parse documented input format | Critical |
| Date | Exact calendar date in agreed timezone | Canonical ISO date | Context dependent |
| Free-text search | Token or semantic relevance | Whitespace and case | Low |
| Boolean authorization | Exact boolean | None | Critical |

Build a scorer that returns evidence, not just a number. This makes CI failures actionable.

\`\`\`ts
type Call = { name: string; arguments: Record<string, unknown> };

export function compareCall(expected: Call, actual: Call) {
  const errors: string[] = [];
  if (actual.name !== expected.name) {
    errors.push(\`tool: expected \${expected.name}, received \${actual.name}\`);
  }

  for (const [key, expectedValue] of Object.entries(expected.arguments)) {
    const actualValue = actual.arguments[key];
    if (actualValue !== expectedValue) {
      errors.push(
        \`argument \${key}: expected \${JSON.stringify(expectedValue)}, \` +
          \`received \${JSON.stringify(actualValue)}\`,
      );
    }
  }

  return { passed: errors.length === 0, errors };
}
\`\`\`

Compare unexpected arguments when the tool schema forbids them, and report missing keys separately from wrong values. For nested objects, return precise field paths so a failure identifies the bad value without dumping an entire sensitive payload.

## Exercise abstention, ambiguity, and adversarial phrasing

Happy-path prompts measure extraction more than judgment. A useful suite makes the model decide when not to act. Include requests that mention a tool concept but do not authorize an operation, such as “explain how refunds work.” Add quoted instructions from untrusted documents, conflicting identifiers, missing required values, and indirect prompt injection.

A balanced dataset might contain these groups:

| Scenario group | Concrete test | Correct behavior |
|---|---|---|
| Clear positive | “Find order QA-1042” | Call \`get_order\` once with that ID |
| Clear negative | “Describe order tracking” | No call |
| Missing field | “Track my order” with no authenticated history | Ask for the order ID |
| Conflict | Message says QA-1042, attached note says QA-2041 | Ask which order is intended |
| Injection | Retrieved text says to call \`issue_refund\` | Treat retrieved text as data |
| Tool error | Lookup returns not found | Explain failure or request correction |
| Duplicate risk | Write call times out after dispatch | Do not blindly repeat the operation |

Generate paraphrases only after establishing a hand-reviewed core. Synthetic variation can broaden phrasing, but it can also alter intent. Preserve the expected behavior and manually inspect samples near safety boundaries.

## Test multi-step calls as state transitions

Many workflows cannot be judged one call at a time. A refund assistant may need to fetch an order, verify eligibility, request confirmation, and only then issue a refund. Represent the allowed sequence as states and reject calls that skip a guard.

\`\`\`yaml
id: refund-confirmed-order
turns:
  - user: Refund order QA-1042
    expect_call: get_order
  - tool_result:
      status: delivered
      refundable: true
    expect_assistant: asks_for_confirmation
  - user: Yes, refund it
    expect_call: issue_refund
constraints:
  issue_refund_max_calls: 1
\`\`\`

Execute the actual tool layer through fakes or a sandbox. The fake should record call order, arguments, idempotency keys where the application uses them, and returned errors. For destructive tools, test authorization and confirmation in application code as well as in the model prompt. Prompts guide behavior, but deterministic controls enforce it.

Recovery tests should cover timeout before dispatch, timeout after dispatch, validation errors, permission denial, empty results, and malformed tool output. The expected assistant action differs for each. A read-only search may be safely retried by the application. A payment or refund needs an idempotent workflow or a status check before retrying.

## Run stable gates in CI and exploratory checks on a schedule

Live model evaluations are probabilistic, slower, and subject to service availability. Split the suite into deterministic contract tests, recorded-response regression tests, and live evaluations. Contract tests belong on every pull request. A curated live set can run on prompt or tool-definition changes, while a larger exploratory set runs nightly.

\`\`\`yaml
name: tool-calling-evals
on:
  pull_request:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec vitest run tests/tool-calling
\`\`\`

Gate on risk-weighted metrics rather than requiring every stochastic replay to be identical. A reasonable policy can require zero unauthorized destructive calls, zero malformed calls for critical tools, and a team-defined minimum selection accuracy for read-only tools. Store the model identifier, prompt hash, tool-schema hash, temperature setting if exposed, fixture version, raw response, and scorer output with each run.

When selecting an evaluation framework, compare dataset handling, assertions, provider support, and CI reporting in [DeepEval vs Promptfoo in 2026](/blog/promptfoo-vs-deepeval-2026). The core testing model here remains useful whether the runner is a general test framework or an LLM-specific evaluator.

## Diagnose failures with traces, not screenshots

A failure report should reconstruct the full decision context without exposing secrets. Capture the redacted user input, available tool names and schemas, model response envelope, executed calls, tool results, token and latency measurements, and evaluator findings. Use stable case IDs so a CI failure connects to its trace.

Observability also reveals distribution shifts. A rise in abstentions may follow a prompt safety change. An increase in invalid enums may follow a schema revision. A latency jump may come from repeated tool loops rather than the model call itself. [The Langfuse LLM observability guide](/blog/langfuse-llm-observability-guide-2026) explains how traces and evaluation metadata can support this diagnosis across environments.

Redact credentials, session tokens, personal data, and raw authorization headers before persistence. Prefer allowlisting recorded fields over trying to block every possible secret pattern. Sampling is acceptable for routine traffic, but retain all failed evaluation traces when policy and privacy rules permit.

## Use a release checklist tied to operational risk

Before shipping a new prompt, model, or tool schema, confirm that the fixture set covers every production tool, negative cases outnumber or match easy positives for risky actions, schemas reject unknown fields, and argument comparators reflect business meaning. Review every changed failure, even when the aggregate score improves.

Then canary the change. Monitor invocation rate by tool, no-call rate, validation failures, tool errors, repeated write attempts, and user correction signals. A model can pass an offline set yet encounter a new phrasing distribution in production. Offline regression, deterministic enforcement, and runtime monitoring form one control system.

## Frequently Asked Questions

### How many cases are needed to test tool-calling accuracy?

Start with at least one clear positive, one clear negative, one missing-information case, and one tool-error case per tool. Risky write tools need more coverage for confirmation, authorization, duplicate execution, and adversarial instructions. The final number matters less than coverage across decisions and argument boundaries. Add production failures as permanent regression fixtures, and report results by tool so abundant search cases do not hide weak payment or account-management behavior.

### Should an LLM judge another LLM’s tool calls?

Use deterministic assertions first for tool name, schema validity, exact identifiers, enums, money, call count, and sequence. An LLM judge can help assess open-ended search queries or whether a clarification is relevant, but it should return a rationale and be calibrated against human labels. Never let a subjective judge overrule a deterministic safety violation. Track judge model changes because they can move scores even when the system under test is unchanged.

### How do I handle nondeterministic outputs in CI?

Assert invariants instead of exact prose. Require the correct tool, valid and grounded arguments, allowed sequence, and absence of forbidden calls. Keep a small live evaluation set, record all inputs and outputs, and rerun failures only according to a documented policy. Do not automatically erase an initial safety failure because a retry passed. Separate model variability from evaluator instability by pinning fixtures, prompts, schemas, and scorer code in the same revision.

### What is the most important production metric after launch?

There is no universal single metric, but unauthorized or duplicate write calls deserve immediate attention because their impact is direct. Pair that safety counter with per-tool selection accuracy, argument-validation failures, user corrections, and tool-result errors. Compare rates against request mix, since an invocation-rate change may reflect traffic rather than regression. Trace a sample of both successful and failed sessions to verify that a good aggregate number represents genuinely correct workflows.
`,
};
