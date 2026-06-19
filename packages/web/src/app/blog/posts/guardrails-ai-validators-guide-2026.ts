import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Guardrails AI Validators Guide (2026)",
  description: "Learn Guardrails AI in 2026: install validators from the Hub, wrap them in a Guard, validate LLM output with Pydantic or RAIL, and apply on-fail reask actions.",
  date: "2026-06-15",
  category: "Security",
  content: `# Guardrails AI Validators Guide (2026)

Guardrails AI is an open-source Python library (\`guardrails-ai\`) for validating and structuring large language model outputs. Its two core building blocks are **Validators** and **Guards**: a Validator checks one property of an output — valid JSON, no PII, no toxic language, a regex match — and a Guard wraps validators and applies them to a model's response. You define the expected shape with a Pydantic model or a RAIL spec, then call \`guard.validate(output)\` to check existing text, or \`guard(...)\` to call the model and validate in one step. When a validator fails, an **on-fail action** decides what happens — reask, raise, filter, fix, or pass through.

This guide covers installation, the Hub CLI, validators and guards, Pydantic vs RAIL, on-fail actions, an end-to-end example, and common errors. Guardrails AI evolves quickly, so treat the code below as accurate usage *patterns* and confirm exact argument names against the official Guardrails AI documentation before pinning anything in production.

## Guardrails AI vs NeMo Guardrails (disambiguation)

Before going further, clear up a name collision. **Guardrails AI** (\`guardrails-ai\`, this article) is a validation-and-structuring library focused on checking and correcting individual LLM outputs against typed schemas and validators. **NVIDIA NeMo Guardrails** is a *different* product — a toolkit for adding programmable conversational rails (dialogue flows, topic boundaries, safety policies) to chatbots, configured largely through its own Colang modeling language. They overlap conceptually (both keep LLM behavior in bounds) but are separate projects with separate APIs. Everything below refers to Guardrails AI the open-source Python library, not NeMo.

## What Guardrails AI actually does

There are three jobs Guardrails AI helps with, and it is worth separating them:

1. **Structure enforcement** — guarantee the model returns the shape you asked for (valid JSON matching a schema, the right types, required fields present) instead of free-form prose you have to parse defensively.
2. **Content validation** — assert properties of the output: no personally identifiable information, no competitor mentions, no toxic or profane language, a number within a range, a string matching a pattern.
3. **Automatic correction** — when a check fails, optionally re-prompt the model with the error so it tries again, or programmatically fix or filter the bad part, rather than just rejecting the response.

If you have ever wrapped an LLM call in a \`try/except json.loads(...)\` and a pile of \`if\` statements checking the parsed result, Guardrails AI replaces that ad-hoc glue with declarative validators and a typed schema. For a broader conceptual primer on testing and guarding LLM behavior, see our [AI agent evaluation overview](/blog).

## Installation and setup

Guardrails AI is a Python package:

\`\`\`bash
pip install guardrails-ai
\`\`\`

The library itself is open source. Most real validators, however, live in the **Guardrails Hub** — a registry of community and first-party validators — and downloading them requires a free API token. Configure the CLI once:

\`\`\`bash
guardrails configure
\`\`\`

This prompts for an API token (you create one in your Guardrails account) and writes it to a local config file so the Hub knows who is downloading. Without this step, \`guardrails hub install ...\` will fail with an authentication error. You only run \`guardrails configure\` once per machine.

## Installing validators from the Hub

Validators are installed individually from the Hub by name. The pattern is:

\`\`\`bash
guardrails hub install hub://guardrails/<validator_name>
\`\`\`

For example, to pull in a few common ones:

\`\`\`bash
# Detect/strip PII (often backed by an NER/Presidio model)
guardrails hub install hub://guardrails/detect_pii

# Block toxic or profane language
guardrails hub install hub://guardrails/toxic_language

# Enforce a value is one of an allowed set
guardrails hub install hub://guardrails/valid_choices

# Restrict to a numeric range
guardrails hub install hub://guardrails/valid_range
\`\`\`

Each install makes the validator importable in your Python code, typically from the \`guardrails.hub\` namespace:

\`\`\`python
from guardrails.hub import DetectPII, ToxicLanguage, ValidRange
\`\`\`

Two things bite newcomers here. First, you must install a validator **before** you import it — the import line will raise \`ImportError\` otherwise, because nothing was downloaded. Second, some validators (PII detection, toxicity classification) bundle or pull a machine-learning model on first use, so the first install or first run can be slow and may download weights. Budget for that in CI.

## Validators and Guards: the core model

These two concepts are the whole library:

| Concept | Role |
|---|---|
| **Validator** | Checks a single property of the output and returns pass/fail plus, optionally, a fixed value. Examples: valid JSON, no PII, regex match, value in range, no competitor mention. |
| **Guard** | A container that holds one or more validators and applies them to a model output. The Guard also knows the expected structure (from Pydantic or RAIL) and the on-fail behavior. |
| **ValidationOutcome** | The result object returned by validation: contains the \`validated_output\` and a \`validation_passed\` boolean (plus error/reask details). |

A Validator is intentionally narrow — it answers one question about one value. You compose several validators inside a Guard to express a complete contract for an output. The Guard is what you actually call; validators are the rules it enforces.

The simplest possible Guard runs validators against a plain string:

\`\`\`python
from guardrails import Guard, OnFailAction
from guardrails.hub import ToxicLanguage

guard = Guard().use(
    ToxicLanguage(on_fail=OnFailAction.EXCEPTION)
)

outcome = guard.validate("Have a great day!")
print(outcome.validation_passed)   # True
print(outcome.validated_output)    # "Have a great day!"
\`\`\`

Here \`.use(...)\` attaches a validator to the Guard, \`guard.validate(...)\` checks an existing string, and the returned \`ValidationOutcome\` tells you whether it passed and gives you the (possibly corrected) output.

## Defining structure with a Pydantic model

For structured output, the modern and recommended approach is a **Pydantic \`BaseModel\`**. You annotate fields with types and attach Guardrails validators to the fields you want checked, then build a Guard from the model with \`Guard.from_pydantic(...)\`.

\`\`\`python
from pydantic import BaseModel, Field
from guardrails import Guard, OnFailAction
from guardrails.hub import ValidRange, ValidChoices


class SupportTicket(BaseModel):
    summary: str = Field(description="One-line summary of the issue")
    priority: str = Field(
        description="Ticket priority",
        validators=[
            ValidChoices(
                choices=["low", "medium", "high"],
                on_fail=OnFailAction.REASK,
            )
        ],
    )
    estimated_hours: int = Field(
        validators=[ValidRange(min=0, max=40, on_fail=OnFailAction.FIX)]
    )


guard = Guard.from_pydantic(SupportTicket)
\`\`\`

The Pydantic schema does double duty: it enforces the *shape and types* (a string summary, an integer estimate) while the attached Guardrails validators enforce *semantic rules* (priority must be one of three values, hours must be 0–40). Guardrails also uses the schema to generate a structured-output instruction it can append to your prompt, so the model knows what JSON to produce. (The exact way validators attach to fields — field metadata vs. a helper — shifts between versions, so confirm the current syntax in the docs.)

## Defining structure with the RAIL spec

Before Pydantic support, Guardrails used **RAIL** (Reliable AI markup Language) — an XML dialect that describes the output schema and the prompt together in a \`.rail\` file. You still see RAIL in older code and some examples, and you build a Guard from it with \`Guard.from_rail(...)\`.

A RAIL file has an \`<output>\` schema and a \`<prompt>\`:

\`\`\`xml
<rail version="0.1">
<output>
  <object name="support_ticket">
    <string name="summary" description="One-line summary of the issue" />
    <string
      name="priority"
      validators="valid-choices: {['low','medium','high']}"
      on-fail-valid-choices="reask"
    />
    <integer
      name="estimated_hours"
      validators="valid-range: 0 40"
      on-fail-valid-range="fix"
    />
  </object>
</output>

<prompt>
Extract a support ticket from the message below.

\${message}

\${gr.complete_json_suffix_v2}
</prompt>
</rail>
\`\`\`

Then in Python:

\`\`\`python
from guardrails import Guard

guard = Guard.from_rail("support_ticket.rail")
\`\`\`

RAIL keeps the schema, the validators, and the prompt template in one declarative file, which some teams prefer for non-Python reviewers. But for most new projects Pydantic is the path of least resistance: you get IDE autocompletion, type checking, and reuse of models you may already have. **Do not mix the two for one Guard** — pick Pydantic *or* RAIL per Guard. Confusing the two (passing a RAIL string to \`from_pydantic\`, or vice versa) is a frequent source of cryptic errors.

## Validating output: \`guard.validate()\` vs \`guard(...)\`

There are two ways to actually run a Guard, and the difference matters.

**\`guard.validate(llm_output)\`** takes a string (or structured value) you *already have* and checks it. Use this when the model call happens elsewhere and you just want to validate the result:

\`\`\`python
raw = call_model_somewhere()              # you produced this yourself
outcome = guard.validate(raw)

if outcome.validation_passed:
    use(outcome.validated_output)
else:
    handle_failure(outcome)
\`\`\`

**\`guard(...)\`** wraps the model call *and* validation in one step. You hand the Guard a callable LLM (or an OpenAI-style client) plus the prompt or messages, and Guardrails calls the model, validates the response, and — depending on the on-fail action — may automatically reask the model to fix problems before returning:

\`\`\`python
from openai import OpenAI

client = OpenAI()

outcome = guard(
    client.chat.completions.create,
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": prompt}],
)

print(outcome.validated_output)
print(outcome.validation_passed)
\`\`\`

Both return a \`ValidationOutcome\` with \`validated_output\` and \`validation_passed\`. The wrapper form is where reask shines, because the Guard owns the model call and can re-invoke it. The exact call signature (passing an OpenAI method vs. a custom callable, \`messages=\` vs. \`prompt=\`) varies by version and provider — confirm the current form in the Guardrails AI docs for your setup.

## On-fail actions: what happens when a validator fails

Every validator takes an \`on_fail\` argument that decides the consequence of a failed check. These are the actions you will reach for:

| Action | What it does |
|---|---|
| \`OnFailAction.REASK\` | Re-prompt the model with the validation error and ask it to produce a corrected output. The headline feature for self-healing outputs. |
| \`OnFailAction.EXCEPTION\` | Raise an exception. Use when a violation is unacceptable and you want to fail loud (e.g., PII leaked). |
| \`OnFailAction.FILTER\` | Drop the offending field/value from the output, keeping the rest. |
| \`OnFailAction.FIX\` | Apply the validator's programmatic correction (e.g., clamp a number to the allowed range, redact matched PII) without calling the model. |
| \`OnFailAction.NOOP\` | Record the failure but pass the original value through unchanged — useful for monitoring without enforcement. |

Choose per validator, not globally. A common pattern: \`EXCEPTION\` on a hard safety rule (no PII), \`REASK\` on a structural/semantic rule the model can plausibly fix (wrong enum value), and \`FIX\` where a deterministic correction exists (out-of-range number → clamp). \`NOOP\` is handy when you are rolling out a new rule and want to measure how often it would fire before you start enforcing it.

A word of caution on \`REASK\`: every reask is another model call, so a validator that keeps failing can spin a reask loop that burns tokens and latency. Cap the number of reasks (Guardrails supports a reask limit) and prefer \`FIX\` or \`FILTER\` when a deterministic remedy exists.

## End-to-end example: structured extraction with reask

Here is a realistic flow that ties it together — extract a structured order from a free-text message, enforce types and rules with a Pydantic schema, and let the model self-correct via reask. Compare this declarative approach against other guardrail and eval tools on our [tool comparison hub](/compare).

\`\`\`python
from typing import List
from pydantic import BaseModel, Field
from guardrails import Guard, OnFailAction
from guardrails.hub import ValidRange, ValidChoices
from openai import OpenAI


# 1. Define the output contract as a Pydantic model
class LineItem(BaseModel):
    product: str = Field(description="Product name")
    quantity: int = Field(
        validators=[ValidRange(min=1, max=100, on_fail=OnFailAction.REASK)]
    )


class Order(BaseModel):
    customer: str = Field(description="Customer full name")
    channel: str = Field(
        validators=[
            ValidChoices(
                choices=["web", "phone", "email"],
                on_fail=OnFailAction.REASK,
            )
        ]
    )
    items: List[LineItem]


# 2. Build a Guard from the model (cap reasks to avoid runaway loops)
guard = Guard.from_pydantic(Order, num_reasks=2)

# 3. Call the model AND validate in one step
client = OpenAI()
message = (
    "Hi, this is Maria Gomez. I'd like 3 wireless keyboards "
    "and 2 monitor stands, ordered through your website."
)

outcome = guard(
    client.chat.completions.create,
    model="gpt-4o-mini",
    messages=[
        {
            "role": "user",
            "content": f"Extract the order from this message:\\n\\n{message}",
        }
    ],
)

# 4. Inspect the validated, structured result
if outcome.validation_passed:
    order = outcome.validated_output      # dict matching the Order schema
    print(order)
else:
    print("Validation failed after reasks:", outcome)
\`\`\`

If the model first returns \`channel: "internet"\` or a \`quantity\` of \`0\`, the matching validators fail, Guardrails reasks with the specific error, and the model corrects itself — up to the \`num_reasks\` cap. You get back a clean dict you can trust, instead of parsing and re-checking free text by hand. This is the LLM-output equivalent of input validation in a typed API.

## Streaming and server mode (high level)

Two capabilities are worth knowing about even if you do not use them on day one:

- **Streaming validation** — Guardrails can validate streamed output incrementally as tokens arrive, rather than waiting for the full completion, so you can stop or correct a stream early. This is useful for low-latency UIs and for catching violations before a long generation finishes. The exact streaming API differs from the blocking one, so check the docs.
- **Server mode** — Guardrails can run as a standalone validation service (it exposes an OpenAI-compatible endpoint), so non-Python applications can route their LLM traffic through your Guards over HTTP. This centralizes your validation policy instead of duplicating it in every client.

Both are optional layers on top of the same Validator/Guard model you have already learned.

## Common errors and troubleshooting

- **Hub token not configured** — \`guardrails hub install ...\` fails with an auth error. Run \`guardrails configure\` and paste a valid API token first.
- **Validator not installed before import** — \`from guardrails.hub import X\` raises \`ImportError\`. You must \`guardrails hub install hub://guardrails/x\` *before* importing it; the import only works after the download.
- **Validator needs an ML model** — PII and toxicity validators may download model weights on first use, making the first run slow or failing in an offline/CI sandbox. Pre-install and warm them in your build step, and ensure network access where they fetch.
- **Reask loops and cost** — a validator that never passes will reask until the cap, multiplying token spend and latency. Set \`num_reasks\` low, and switch to \`FIX\`/\`FILTER\` when a deterministic correction exists rather than asking the model again.
- **RAIL vs Pydantic confusion** — passing a RAIL XML string to \`Guard.from_pydantic\` (or a Pydantic model to \`from_rail\`) throws confusing errors. Pick one schema source per Guard and use the matching constructor.
- **\`validation_passed\` is False but you expected a fix** — \`FIX\` corrects deterministically and should pass; \`EXCEPTION\` never returns (it raises); \`NOOP\` passes the value through but records the failure. Check which on-fail action each validator uses if the outcome surprises you.

## When to use Guardrails AI

Reach for Guardrails AI when you need to *enforce and correct* the output of an LLM call — guaranteed structure, content rules like no-PII or no-toxicity, and automatic reasking — in Python, in your own code, with no hosted dependency for the core library. If your need is conversational dialogue policy and topic rails for a chatbot, NeMo Guardrails targets that problem instead; if your need is *measuring* quality across a dataset rather than guarding a single call, an evaluation framework is the better fit, and many teams pair the two. Browse install-ready QA and guardrail skills for AI coding agents at [/skills](/skills).

## Frequently Asked Questions

### What is Guardrails AI used for?

Guardrails AI is an open-source Python library for validating and structuring LLM outputs. You use it to guarantee a model returns the right shape (valid JSON matching a schema), to assert content rules such as no PII or no toxic language, and to automatically correct bad outputs by reasking the model or applying deterministic fixes. Its core pieces are Validators (single checks) and Guards (containers that apply them).

### What is the difference between a Validator and a Guard?

A Validator checks one property of an output and returns pass or fail, optionally with a corrected value — for example valid JSON, a value in range, or no competitor mention. A Guard wraps one or more validators, knows the expected output structure from a Pydantic model or RAIL spec, and applies the validators when you call \`guard.validate()\` or \`guard(...)\`. You write validators as rules and call the Guard to enforce them.

### What is the difference between Guardrails AI and NeMo Guardrails?

They are different projects despite the similar name. Guardrails AI (\`guardrails-ai\`) validates and structures individual LLM outputs against typed schemas and validators with on-fail correction. NVIDIA NeMo Guardrails is a toolkit for adding programmable conversational rails — dialogue flows, topic limits, and safety policies — to chatbots, configured largely through its Colang language. Choose Guardrails AI for output validation and NeMo for conversational dialogue control.

### Should I use a Pydantic model or a RAIL spec?

For new projects, a Pydantic \`BaseModel\` passed to \`Guard.from_pydantic(...)\` is usually the better choice: you get type checking, IDE autocompletion, and reuse of models you may already have. RAIL is an XML spec used with \`Guard.from_rail(...)\` that keeps the schema, validators, and prompt in one declarative file, and you still see it in older examples. Pick one per Guard — do not mix them.

### What does the on-fail action do in Guardrails AI?

The \`on_fail\` argument on a validator decides what happens when its check fails. \`REASK\` re-prompts the model with the error so it can fix the output, \`EXCEPTION\` raises, \`FILTER\` drops the offending value, \`FIX\` applies a deterministic correction without calling the model, and \`NOOP\` records the failure but passes the value through. You set it per validator so different rules can fail loud, self-heal, or just be monitored.

### Is Guardrails AI free and open source?

Yes, the \`guardrails-ai\` library is open source and free to install with \`pip install guardrails-ai\`. Downloading validators from the Guardrails Hub requires a free API token configured via \`guardrails configure\`, and running LLM calls through a Guard incurs your model provider's normal token costs — including extra calls when reask fires. Confirm the current license and Hub terms in the official Guardrails AI documentation.
`,
};
