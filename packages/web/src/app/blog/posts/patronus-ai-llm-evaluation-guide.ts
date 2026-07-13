import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Patronus AI for LLM Evaluation: A Practical 2026 Guide',
  description:
    'Learn how to use Patronus AI to evaluate LLM, RAG, and agent outputs in 2026: Lynx hallucination detection, judges, the Python SDK, PII and safety checks, and CI.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Patronus AI for LLM Evaluation: A Practical 2026 Guide

Shipping an LLM feature is easy. Knowing whether it is correct, grounded, and safe on every release is the hard part. Patronus AI is one of the platforms built specifically for that job: an evaluation and guardrail layer for large language model applications, RAG pipelines, and multi-step agents. This guide walks through what Patronus AI actually does in 2026, how its evaluators work, how to drive it from the Python SDK, and where it fits next to open-source options like DeepEval and Ragas.

If you are assembling a testing stack for AI agents, Patronus tends to sit at the "scored evaluation and runtime guardrail" layer. It answers questions like: did this answer hallucinate against the retrieved context, did it leak PII, did it stay on policy, and did the agent actually accomplish the task. You still need unit tests, prompt regression tests, and observability around it, which is why teams pair it with tools covered elsewhere in the QA skills catalog.

## What Patronus AI Is

Patronus AI is a commercial evaluation platform with a hosted API, a Python SDK, and a set of managed evaluators. The core idea is that instead of hand-writing every scoring function, you call a library of pre-built and configurable evaluators that return a pass or fail result plus an explanation. You can run those evaluators in three modes:

- **Offline experiments**, where you score a dataset of inputs and outputs in bulk and compare runs.
- **Online evaluation**, where you log production traffic and evaluate a sample of it continuously.
- **Runtime guardrails**, where an evaluator runs inline before a response reaches the user and can block or flag it.

Patronus is model-agnostic. It does not care whether you generate text with an Anthropic, OpenAI, or open-weight model; it evaluates the strings and structured traces you send it. The two pieces you will hear about most are **Lynx**, an open-weight hallucination detection model, and the **judge** evaluators, which are configurable LLM-as-judge graders.

## Lynx: Hallucination Detection

Lynx is Patronus AI's hallucination detection model, released as open weights so teams can inspect and self-host it. Its single job is faithfulness: given a question, a set of retrieved context documents, and a generated answer, Lynx decides whether the answer is supported by the context or whether it contains claims that are not grounded (a hallucination).

This is the exact failure mode that breaks RAG systems in production. A retrieval step returns the right documents, but the generation step still invents a number, a policy, or a citation. Lynx is trained to catch that gap and return a binary faithfulness score plus a reasoning trace explaining which claim was unsupported.

You can call Lynx through the Patronus API as a hosted evaluator, or run the open weights yourself for data-sensitive workloads. In the SDK it shows up as a named evaluator (commonly \`lynx\` for hallucination). A minimal offline check looks like this:

\`\`\`python
from patronus import Client

client = Client(api_key="YOUR_PATRONUS_API_KEY")

result = client.evaluate(
    evaluator="lynx",
    criteria="patronus:hallucination",
    evaluated_model_input="What is the refund window for damaged items?",
    evaluated_model_output="You can request a refund within 30 days of delivery.",
    evaluated_model_retrieved_context=[
        "Refunds for damaged goods must be requested within 14 days of delivery.",
    ],
)

print(result.pass_)      # False, the answer is not grounded
print(result.score)      # numeric or binary faithfulness score
print(result.explanation)  # which claim was unsupported
\`\`\`

Here the answer claims 30 days, but the retrieved policy says 14 days. Lynx flags the mismatch. This is the same conceptual test that Ragas frames as faithfulness and that DeepEval covers with its hallucination and faithfulness metrics, so if you have read the [DeepEval LLM testing guide](/blog/deepeval-llm-testing-guide-2026) or the [Ragas RAG evaluation guide](/blog/ragas-rag-evaluation-guide), the mental model transfers directly.

## The Evaluator Catalog

Beyond Lynx, Patronus ships a library of managed evaluators. The exact set evolves, but the categories are stable. The table below groups the evaluators you will reach for most often.

| Evaluator | What it checks | Typical use case |
| --- | --- | --- |
| Lynx (hallucination) | Answer grounded in retrieved context | RAG faithfulness gate |
| Answer relevance | Output addresses the user question | Q&A and support bots |
| Context relevance | Retrieved chunks match the query | Retrieval tuning |
| Context sufficiency | Context contains enough to answer | Detecting under-retrieval |
| PII detection | Output leaks personal data | Compliance, privacy |
| Toxicity | Harmful or abusive language | Safety, brand risk |
| Prompt injection | Input attempts to hijack the model | Agent and tool security |
| Custom judge | Any rubric you define in natural language | Domain-specific quality |

Each evaluator returns the same shape: a boolean \`pass_\`, an optional numeric \`score\`, and a text \`explanation\`. That uniformity is what makes it easy to assemble a suite: you pick the evaluators relevant to your app, run them all against the same input and output, and treat the combined result as your quality gate.

## Judges: Configurable LLM-as-a-Judge

Not every quality dimension has a pre-built evaluator. For domain-specific criteria (does this legal summary cite the correct statute, does this medical answer include a safety disclaimer, does this reply follow our tone guide) Patronus lets you define **judge** evaluators. A judge is an LLM-as-judge grader configured with a natural-language rubric.

\`\`\`python
from patronus import Client

client = Client(api_key="YOUR_PATRONUS_API_KEY")

# Define a custom judge once, then reuse it by name.
judge = client.create_criteria(
    name="tone-and-disclaimer",
    evaluator_family="judge",
    config={
        "pass_criteria": (
            "The response is polite and professional, and if it gives "
            "financial guidance it includes a disclaimer that it is not "
            "professional advice."
        ),
    },
)

result = client.evaluate(
    evaluator="judge",
    criteria="tone-and-disclaimer",
    evaluated_model_input="Should I move my savings into an index fund?",
    evaluated_model_output=(
        "Index funds are a common long-term option. Please note this is "
        "general information, not professional financial advice."
    ),
)

print(result.pass_, result.explanation)
\`\`\`

Judges are where Patronus overlaps most with the G-Eval style metrics in DeepEval. The difference is operational: Patronus manages the judge model, versioning, and the run history for you, whereas an open-source library asks you to bring your own judge model and store results yourself. If you want to understand the tradeoffs between managed and open judges more deeply, the [Promptfoo vs DeepEval comparison](/blog/promptfoo-vs-deepeval-2026) covers the open-source side well.

## The Patronus Python SDK

The SDK is the primary way engineers drive Patronus. Install it and set your API key as an environment variable so it never lives in source control.

\`\`\`bash
pip install patronus
export PATRONUS_API_KEY="your_api_key_here"
\`\`\`

The three verbs you use most are \`evaluate\` for a single scored call, \`experiment\` for scoring a whole dataset, and the tracing helpers for online evaluation. A single evaluation reads cleanly:

\`\`\`python
import os
from patronus import Client

client = Client(api_key=os.environ["PATRONUS_API_KEY"])

result = client.evaluate(
    evaluator="answer-relevance",
    criteria="patronus:answer-relevance",
    evaluated_model_input="How do I reset my password?",
    evaluated_model_output=(
        "Open Settings, choose Security, then Reset Password and follow "
        "the emailed link."
    ),
)

if not result.pass_:
    print("Answer was off-topic:", result.explanation)
\`\`\`

The naming to remember: \`evaluator\` selects the family (Lynx, judge, answer-relevance, and so on), and \`criteria\` selects the specific configured rule. Managed criteria are namespaced with a \`patronus:\` prefix; your own criteria use the name you gave them.

## Running Evals on RAG Outputs

RAG is the highest-value place to run Patronus because it has the most ways to fail silently. A complete RAG evaluation checks three things at once: was the retrieval relevant, was there enough context, and did the answer stay faithful to it. You can run those evaluators together over a dataset with an experiment.

\`\`\`python
from patronus import Client

client = Client(api_key="YOUR_PATRONUS_API_KEY")

dataset = [
    {
        "input": "What is the SLA for enterprise support?",
        "output": "Enterprise support has a 1-hour response SLA.",
        "context": [
            "Enterprise plans include a one-hour first-response SLA, "
            "24 hours a day.",
        ],
    },
    {
        "input": "Can I export my data as CSV?",
        "output": "Yes, exports are available in CSV and JSON.",
        "context": [
            "Users on paid plans can export data as JSON.",
        ],
    },
]

experiment = client.experiment(
    project_name="rag-support-bot",
    dataset=dataset,
    evaluators=[
        {"evaluator": "lynx", "criteria": "patronus:hallucination"},
        {"evaluator": "context-relevance", "criteria": "patronus:context-relevance"},
        {"evaluator": "answer-relevance", "criteria": "patronus:answer-relevance"},
    ],
)

print(experiment.summary())
\`\`\`

In this dataset the second row should fail hallucination: the answer claims CSV export, but the context only mentions JSON. An experiment run gives you a summary table and a link to the Patronus dashboard where you can inspect each failing row, read the judge explanation, and compare against the previous run. That run-over-run comparison is the feature that turns evaluation from a one-off script into a regression gate.

## Evaluating Agent Outputs

Agents add a dimension that plain RAG does not have: the process. An agent might reach the right final answer through a broken chain of tool calls, or fail the task while producing confident-sounding text. Patronus evaluates agent traces, not just final strings, so you can score whether the agent selected the correct tools, passed valid arguments, and completed the goal.

For agent workloads you send the trace (the sequence of steps, tool calls, and observations) and use evaluators tuned for task completion and tool correctness. This pairs naturally with observability: you capture traces in a tool like the one described in the [Langfuse observability guide](/blog/langfuse-llm-observability-guide-2026) or [Arize Phoenix evaluation guide](/blog/arize-phoenix-llm-evaluation-guide), then run Patronus evaluators over sampled traces. Observability tells you what happened; Patronus tells you whether it was correct.

A simplified agent evaluation focuses on task success:

\`\`\`python
result = client.evaluate(
    evaluator="judge",
    criteria="agent-task-complete",
    evaluated_model_input="Book a meeting with Sam next Tuesday at 2pm.",
    evaluated_model_output=(
        "Created calendar event 'Meeting with Sam' on Tuesday 2:00pm-2:30pm "
        "and sent an invite to sam@example.com."
    ),
    tags={"agent": "scheduler", "trace_id": "abc-123"},
)
\`\`\`

The \`tags\` dictionary is worth using consistently. It lets you slice results in the dashboard by agent, model version, or customer segment, which is how you find that a regression only affects one path.

## Safety, PII, and Injection Checks

Correctness is not the only concern. Patronus provides evaluators for the risk surface: PII leakage, toxicity, and prompt injection. These are the ones most likely to run as runtime guardrails rather than offline experiments, because a leak or an injection is something you want to catch before the response ships.

\`\`\`python
# Guardrail-style check before returning a response to the user.
pii = client.evaluate(
    evaluator="pii",
    criteria="patronus:pii",
    evaluated_model_output=response_text,
)

if not pii.pass_:
    response_text = "[redacted: response contained personal data]"
    log.warning("Blocked PII leak: %s", pii.explanation)
\`\`\`

The prompt injection evaluator is aimed at agents that accept untrusted input, such as web content or user-uploaded documents. It scores whether the input is trying to override the system instructions or exfiltrate data. Running it on the input side, before the agent acts, is a cheap defense against a whole class of attacks. The table below maps risk evaluators to where they usually run.

| Check | Runs on | Mode | Action on fail |
| --- | --- | --- | --- |
| PII detection | Output | Guardrail | Redact or block |
| Toxicity | Output | Guardrail | Block, regenerate |
| Prompt injection | Input | Guardrail | Reject request |
| Hallucination | Output + context | Offline or online | Flag, alert, regenerate |
| Custom policy judge | Output | Offline or guardrail | Flag for review |

## Experiments and Datasets

An **experiment** is a named, versioned run of one or more evaluators over a **dataset**. Datasets can be uploaded and managed in Patronus or passed inline from code. The value is history: because each experiment is stored, you can answer "did quality regress between v3 and v4 of the prompt" with a diff instead of a vibe.

A healthy workflow is to keep a golden dataset of representative inputs (including known-hard cases and past incidents), run an experiment on every prompt or model change, and require the pass rate to hold or improve before merging. This is the same discipline as snapshot testing in traditional software, applied to non-deterministic outputs. Curating that golden set is often more valuable than any single metric, because it encodes what your team means by "good" for your domain.

## CI Integration

Patronus experiments belong in CI so that a prompt or model change cannot merge without passing the eval gate. The pattern is to run an experiment script, read the summary pass rate, and fail the build below a threshold.

\`\`\`python
# eval_gate.py
import sys
from patronus import Client

client = Client()  # reads PATRONUS_API_KEY from env

experiment = client.experiment(
    project_name="support-bot-ci",
    dataset="golden-support-v4",  # managed dataset by name
    evaluators=[
        {"evaluator": "lynx", "criteria": "patronus:hallucination"},
        {"evaluator": "answer-relevance", "criteria": "patronus:answer-relevance"},
    ],
)

pass_rate = experiment.summary().pass_rate
THRESHOLD = 0.95

print(f"pass_rate={pass_rate:.3f} threshold={THRESHOLD}")
if pass_rate < THRESHOLD:
    print("Eval gate failed", file=sys.stderr)
    sys.exit(1)
\`\`\`

Wire that into a workflow so it runs on every pull request that touches prompts, retrieval, or model config:

\`\`\`yaml
name: llm-eval-gate
on:
  pull_request:
    paths:
      - "prompts/**"
      - "src/rag/**"
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install patronus
      - run: python eval_gate.py
        env:
          PATRONUS_API_KEY: \${{ secrets.PATRONUS_API_KEY }}
\`\`\`

Keep the golden dataset small enough to run in a couple of minutes and representative enough to catch real regressions. If runs get slow, sample the dataset in CI and run the full set nightly.

## Patronus vs DeepEval vs Ragas

These tools overlap but are not substitutes. The clearest way to choose is by what you are optimizing for: managed convenience and guardrails, open-source unit-test ergonomics, or RAG-specific metrics.

| Dimension | Patronus AI | DeepEval | Ragas |
| --- | --- | --- | --- |
| Model | Managed platform, hosted API | Open-source library | Open-source library |
| Best at | Guardrails, managed judges, Lynx | Pytest-style LLM unit tests | RAG metric suite |
| Hallucination | Lynx, purpose-built model | Faithfulness metric | Faithfulness metric |
| Runtime guardrails | Yes, inline evaluators | Not the focus | No |
| Self-hosting | Lynx weights open | Fully self-hosted | Fully self-hosted |
| Run history and dashboard | Built in | Via Confident AI | Bring your own |
| Cost model | Usage-based API | Free library, pay for compute | Free library |

In practice many teams run more than one. DeepEval or Ragas live in the local test suite because they are free and fast; Patronus runs the managed judges, Lynx, and the runtime guardrails where its dashboard and hosted models pay for themselves. If you want to browse ready-made evaluation and testing skills for AI agents, the [QA skills catalog](/skills) has installable recipes for several of these frameworks.

So when is Patronus worth adopting? It earns its keep when you have real production traffic, a compliance or safety surface, and a team that would rather consume managed evaluators than maintain judge infrastructure. The Lynx model is genuinely useful for RAG faithfulness, the guardrail mode closes the loop between evaluation and enforcement, and the experiment history turns quality into something you can track release over release.

It is less compelling if you are early, cost-sensitive, and mostly need prompt regression tests, in which case an open-source library and a golden dataset get you most of the way. The good news is that the concepts transfer: faithfulness, answer relevance, context relevance, and LLM-as-judge mean the same thing everywhere, so time spent learning Patronus is not wasted if you later move some checks in-house.

## Frequently Asked Questions

### Is Patronus AI open source?

The platform itself is a commercial hosted product with a paid API. However, Patronus released the Lynx hallucination detection model as open weights, so you can run that specific evaluator yourself for data-sensitive workloads. The managed evaluators, judges, dashboard, and experiment tracking are part of the hosted service and are accessed through the Python SDK and API.

### What makes Lynx different from a generic LLM judge?

Lynx is a model trained specifically for faithfulness: deciding whether an answer is grounded in retrieved context. A generic judge is a general model prompted to grade. Because Lynx is purpose-built and open-weight, it tends to be more consistent on hallucination detection and can be self-hosted, which matters when you cannot send context documents to a third-party API.

### How does Patronus handle agent evaluation?

Patronus can evaluate agent traces, not just final answers. You send the sequence of steps, tool calls, and observations, then apply evaluators tuned for task completion and tool correctness. Pairing it with an observability tool that captures traces gives you the full picture: the tracer records what happened and Patronus scores whether each step and the final outcome were correct.

### Can I run Patronus evaluators as runtime guardrails?

Yes. Evaluators like PII detection, toxicity, and prompt injection are designed to run inline, before a response reaches the user or before an agent acts on untrusted input. When an evaluator fails, your code can block, redact, or regenerate the response. This is different from offline experiments, which score a dataset in bulk for regression testing rather than live enforcement.

### How is Patronus different from DeepEval and Ragas?

DeepEval and Ragas are open-source libraries that run in your own test suite, ideal for pytest-style checks and RAG metrics at no cost. Patronus is a managed platform that adds hosted judges, the Lynx model, runtime guardrails, and stored experiment history. Many teams use both: open-source libraries locally for fast free checks, and Patronus for managed evaluation and guardrails in production.

### Do I need to change my model provider to use Patronus?

No. Patronus is model-agnostic. It evaluates the inputs, outputs, context, and traces you send it, regardless of which provider generated them. You can keep generating with any Anthropic, OpenAI, or open-weight model and simply add Patronus evaluation calls around your existing pipeline, which makes it easy to adopt incrementally.

### Where should Patronus sit in my testing stack?

Put it at the scored-evaluation and guardrail layer. Keep unit tests and prompt regression tests in your normal suite, capture traces in an observability tool, then run Patronus evaluators over sampled production traffic and as a CI gate on a golden dataset. It complements rather than replaces deterministic tests, and it is most valuable once you have real traffic and a safety or compliance surface to protect.
`,
};
