import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Tool Calling Accuracy Testing Guide for LLMs (2026)",
  description: "Test LLM tool-calling accuracy in 2026: measure tool selection, argument correctness, and JSON schema adherence with a reproducible eval harness and CI gates.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# Tool Calling Accuracy Testing Guide for LLMs (2026)

Tool-calling accuracy testing measures how reliably a large language model decides *which* function to call, fills in *correct arguments*, and emits a payload that *conforms to the tool's JSON schema*. You test it by running the model against a labeled dataset of user requests — each with an expected tool name and expected arguments — then scoring three things independently: tool selection (did it pick the right function, or call none when it should have?), argument correctness (do the values match?), and schema adherence (does the output parse and validate?). Aggregate these into per-tool accuracy metrics and gate them in CI so a model or prompt change can't silently break your agent's tool use.

This guide covers why tool calling fails, the three metrics to track, how to build a dataset and harness, scoring code in Python, schema validation, handling multi-step trajectories, and wiring it all into continuous integration. The function-calling APIs from major providers change quickly, so treat the request/response shapes below as representative patterns and confirm exact field names against your provider's current docs.

## Why tool calling is hard to get right

When you give an LLM a set of tools (functions), three distinct things can go wrong, and they fail for different reasons:

1. **Wrong tool selected.** The model calls \`search_orders\` when the user asked to cancel one, or it hallucinates a tool that doesn't exist, or — most commonly — it tries to answer from its own knowledge when it should have called a tool (and vice versa).
2. **Right tool, wrong arguments.** It calls \`book_flight\` but swaps origin and destination, drops a required \`date\`, invents a \`passenger_id\`, or coerces a number into a string.
3. **Malformed output.** The arguments don't form valid JSON, violate the declared schema (wrong types, missing required fields, extra properties), or the model wraps the call in prose so your parser chokes.

Each failure mode needs its own metric. A single "did the agent succeed" score hides which layer broke, so you can't tell whether to fix the tool descriptions, the system prompt, or the schema. Separating the three is the whole point of a good tool-calling eval.

## The three metrics to track

| Metric | Question it answers | How to score |
|---|---|---|
| **Tool selection accuracy** | Did the model call the *correct* tool (including correctly calling *none*)? | Exact match of predicted tool name vs expected; count "no call" as a valid label |
| **Argument correctness** | Given the right tool, are the arguments right? | Field-by-field comparison; exact match for IDs/enums, normalized match for free text |
| **Schema adherence** | Is the emitted call structurally valid? | Validate the arguments object against the tool's JSON Schema |

Report them separately and also as a strict **end-to-end accuracy**: a case passes only if the tool is right AND every required argument is right AND it validates. The gap between end-to-end and the individual metrics tells you where the weakness is. For a broader view of how this fits into agent quality, see our writeup on [agent trajectory evaluation](/blog).

## Building a tool-calling evaluation dataset

Your dataset is a list of cases. Each case carries the user input, the available tools for that turn, and the ground-truth expectation. Keep it as plain data so it's diffable and reviewable:

\`\`\`python
# dataset.py
TOOLS = [
    {
        "name": "get_weather",
        "description": "Get the current weather for a city.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
            },
            "required": ["city"],
            "additionalProperties": False,
        },
    },
    {
        "name": "no_tool",
        "description": "Use when no tool is appropriate; answer directly.",
        "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
    },
]

CASES = [
    {
        "id": "weather-celsius",
        "input": "What's the weather in Paris in celsius?",
        "expected_tool": "get_weather",
        "expected_args": {"city": "Paris", "unit": "celsius"},
    },
    {
        "id": "no-tool-greeting",
        "input": "Hey, how are you today?",
        "expected_tool": "no_tool",
        "expected_args": {},
    },
    {
        "id": "weather-default-unit",
        "input": "Tell me the weather in Tokyo.",
        "expected_tool": "get_weather",
        "expected_args": {"city": "Tokyo"},  # unit optional — absence is acceptable
    },
]
\`\`\`

Three dataset rules that matter in practice:

- **Include negative cases.** At least 20–30% of cases should be ones where the model should call *no* tool, or where a tempting-but-wrong tool exists. Without these you only measure recall, never precision.
- **Mark which arguments are strict.** IDs, enums, and dates need exact matches. Free-text fields (a search query, a message body) need fuzzy or semantic comparison, because two correct phrasings differ literally. Annotate each expected argument with its comparison mode.
- **Make required vs optional explicit.** If \`unit\` is optional, a case that omits it must pass. Encode that in the schema and your scorer, or you'll punish correct behavior.

## A minimal scoring harness in Python

The harness loops over cases, calls the model, parses the tool call, and computes the three scores. Below, \`call_model\` is a stand-in — swap in your provider's SDK. The key idea is that scoring is provider-agnostic once you've normalized the response into \`(tool_name, args_dict)\`.

\`\`\`python
# harness.py
import json
from jsonschema import Draft7Validator
from dataset import TOOLS, CASES

TOOL_BY_NAME = {t["name"]: t for t in TOOLS}

def parse_tool_call(raw_response) -> tuple[str | None, dict]:
    """Normalize a provider response into (tool_name, args).
    Returns (None, {}) if the model emitted no tool call."""
    call = raw_response.get("tool_call")
    if not call:
        return None, {}
    name = call["name"]
    args = call["arguments"]
    if isinstance(args, str):          # some APIs return arguments as a JSON string
        args = json.loads(args)
    return name, args

def score_args(expected: dict, actual: dict, strict_keys: set[str]) -> bool:
    """Every expected key must match. Strict keys need exact equality."""
    for key, exp_val in expected.items():
        if key not in actual:
            return False
        if key in strict_keys and actual[key] != exp_val:
            return False
        if key not in strict_keys and str(actual[key]).strip().lower() != str(exp_val).strip().lower():
            return False
    return True

def validate_schema(tool_name: str, args: dict) -> bool:
    schema = TOOL_BY_NAME[tool_name]["parameters"]
    return not list(Draft7Validator(schema).iter_errors(args))

def run_eval(call_model):
    results = []
    for case in CASES:
        raw = call_model(case["input"], TOOLS)
        tool, args = parse_tool_call(raw)

        selection_ok = (tool == case["expected_tool"])
        # schema only meaningful when a real tool was chosen
        schema_ok = validate_schema(tool, args) if tool in TOOL_BY_NAME else False
        # treat IDs/enums as strict; here only "unit" is an enum
        strict = {"unit"}
        args_ok = selection_ok and score_args(case["expected_args"], args, strict)

        results.append({
            "id": case["id"],
            "selection_ok": selection_ok,
            "schema_ok": schema_ok,
            "args_ok": args_ok,
            "end_to_end": selection_ok and schema_ok and args_ok,
        })
    return results
\`\`\`

Aggregating is just a few sums:

\`\`\`python
def summarize(results):
    n = len(results)
    pct = lambda key: round(100 * sum(r[key] for r in results) / n, 1)
    return {
        "n": n,
        "tool_selection_%": pct("selection_ok"),
        "schema_adherence_%": pct("schema_ok"),
        "argument_correctness_%": pct("args_ok"),
        "end_to_end_%": pct("end_to_end"),
    }
\`\`\`

## Validating schema adherence properly

Schema adherence is the most automatable of the three checks — it's a pure structural test. Define each tool's \`parameters\` as a real JSON Schema and validate the model's argument object against it with \`jsonschema\` (Python) or \`ajv\` (Node). The high-signal checks:

- **Types** — a \`quantity\` declared \`integer\` must not arrive as \`"3"\`.
- **Required fields** — every key in \`required\` must be present.
- **Enums** — \`unit\` must be one of the declared values.
- **\`additionalProperties: false\`** — catches hallucinated arguments the model invented.

Many providers now offer a "strict" or "structured outputs" mode that constrains generation to the schema, dramatically reducing structural failures. Even with strict mode on, keep the validation step — it's your independent check that the constraint actually held, and it protects you when you change models or providers.

\`\`\`python
from jsonschema import Draft7Validator

schema = {
    "type": "object",
    "properties": {"city": {"type": "string"}, "days": {"type": "integer"}},
    "required": ["city"],
    "additionalProperties": False,
}
errors = sorted(Draft7Validator(schema).iter_errors({"city": "Paris", "days": "7"}),
                key=lambda e: e.path)
for e in errors:
    print(e.message)   # "'7' is not of type 'integer'"
\`\`\`

## Scoring multi-step tool trajectories

Real agents chain calls: search, then read a result, then act. For multi-turn cases you have two scoring strategies:

- **Step-wise (teacher-forced).** Replay the reference trajectory and, at each step, check whether the model's next call matches the expected one given the *correct* history. This isolates per-step accuracy and prevents one early mistake from failing the whole trace. Best for diagnosing where things break.
- **End-to-end (free-run).** Let the agent run to completion against simulated tools and check the final state plus whether all *required* tool calls happened in a valid order. This measures real-world success but conflates errors.

A pragmatic combination: track an **order-independent set match** (did all required tools get called with valid args?) plus a **final-state assertion** (did the database end up correct?). Reserve strict ordering checks for flows where order genuinely matters, since many correct trajectories differ in order. Argument-correctness scoring from the single-step harness applies unchanged to each call in the trace.

## Running tool-calling evals in CI

Tool-calling accuracy regresses silently when you bump a model version, edit a tool description, or tweak the system prompt. Gate it. Set per-metric thresholds and fail the build when any drops:

\`\`\`python
# ci_gate.py
import sys
from harness import run_eval, summarize
from my_client import call_model      # your provider wrapper

THRESHOLDS = {
    "tool_selection_%": 95.0,
    "schema_adherence_%": 99.0,
    "argument_correctness_%": 90.0,
    "end_to_end_%": 88.0,
}

summary = summarize(run_eval(call_model))
print(summary)

failures = [f"{k}: {summary[k]} < {v}" for k, v in THRESHOLDS.items() if summary[k] < v]
if failures:
    print("TOOL-CALLING EVAL FAILED:\\n  " + "\\n  ".join(failures))
    sys.exit(1)
print("All tool-calling thresholds met.")
\`\`\`

\`\`\`yaml
# .github/workflows/tool-eval.yml
name: tool-calling-eval
on:
  pull_request:
    paths: ["prompts/**", "tools/**", "src/agent/**"]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install jsonschema
      - env:
          MODEL_API_KEY: \${{ secrets.MODEL_API_KEY }}
        run: python ci_gate.py
\`\`\`

Set schema adherence near 99% (structural failures are rarely acceptable), tool selection high, and argument correctness based on your tolerance for free-text variance. Run on every PR that touches prompts, tool definitions, or agent code.

## Common errors and how to fix them

- **Arguments arrive as a JSON string, not an object.** Several APIs return \`arguments\` as a serialized string. Always \`json.loads\` it before scoring — handle both shapes, as in \`parse_tool_call\` above.
- **Model under-calls tools (answers from memory).** Tighten tool descriptions and add a system-prompt instruction to prefer tools for factual/action requests. Add more negative-and-positive boundary cases so you can measure the fix.
- **Free-text argument mismatches inflate failures.** A search query "cheap flights to NYC" vs "NYC flights, low price" is semantically equal but literally different. Use normalized or embedding-based comparison for free-text fields, not exact match.
- **Enum drift after a tool change.** When you rename an enum value, old expected args silently fail. Treat your dataset's expected args as fixtures and update them with the schema in the same PR.
- **Flaky scores from temperature.** Tool-calling evals should run at low/zero temperature for determinism. If you must test at higher temperature, run each case several times and report pass-rate, not a single pass/fail. See our notes on [comparing eval approaches](/compare) for trade-offs.

## Frequently Asked Questions

### What is tool calling accuracy in LLMs?

Tool calling accuracy measures how often a language model, given a set of available functions, selects the correct tool and supplies correct, schema-valid arguments for a given user request. It is typically broken into three sub-metrics — tool selection, argument correctness, and schema adherence — plus a strict end-to-end score that requires all three to be right at once.

### How do I test if an LLM calls the right function?

Build a labeled dataset where each user request has an expected tool name (including "no tool" cases), run the model, and compare its chosen tool against the expectation as an exact match. Include cases where the correct answer is to call no tool and cases with tempting wrong tools, so you measure precision as well as recall rather than only counting obvious hits.

### How do I validate tool-call argument schemas?

Define each tool's parameters as a JSON Schema and validate the model's emitted arguments object against it using a library like jsonschema in Python or ajv in Node. Check types, required fields, enum membership, and set additionalProperties to false to catch hallucinated arguments. Keep this validation even when using a provider's strict structured-output mode, as your independent check.

### What's the difference between tool selection and argument correctness?

Tool selection asks whether the model picked the right function at all; argument correctness asks whether, having picked a function, it filled the arguments with the right values. They fail for different reasons — selection failures usually trace to tool descriptions or the system prompt, while argument failures trace to ambiguous inputs or missing constraints — so you score and report them separately.

### How do I score multi-step agent tool trajectories?

Use step-wise teacher-forced scoring to check each call against the expected next call given the correct history, which isolates per-step accuracy, and combine it with an end-to-end free-run check on the final state. For most flows, verify that all required tools were called with valid arguments (order-independent) plus a final-state assertion, reserving strict ordering checks for flows where order genuinely matters.

### Should tool-calling evals run in CI?

Yes. Tool-calling behavior regresses silently on model upgrades, prompt edits, and tool-description changes, so gate it in CI with per-metric thresholds and fail the build on any drop. Run the suite at low or zero temperature for determinism, trigger it on pull requests that touch prompts, tool definitions, or agent code, and store the dataset as reviewable fixtures.
`,
};
