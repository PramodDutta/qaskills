TITLE: Patronus AI Evaluation Guide (2026): Lynx & GLIDER
DESCRIPTION: Patronus AI guide for 2026: evaluate LLMs for hallucination with Lynx, use the GLIDER judge model, and run automated evals via the Patronus evaluation API.
DATE: 2026-06-15
CATEGORY: AI Evals
---
# Patronus AI Evaluation Guide (2026): Lynx & GLIDER

Patronus AI is an automated evaluation platform for LLMs and AI agents, known for its purpose-built **evaluator models**. Its flagship **Lynx** is an open-weight model trained specifically to detect **hallucinations** — judging whether a generated answer is faithful to its provided context, which is the core failure mode of RAG systems. **GLIDER** is a small, open evaluator (a fine-grained "judge" model) that grades outputs against custom rubrics and returns scores with reasoning. You access these through the Patronus evaluation API and SDK: you send an input, output, and context, choose an evaluator, and get back a pass/fail or score plus an explanation. Patronus also supports running evaluators offline on datasets and online over production traffic.

This guide explains Lynx, GLIDER, and the Patronus evaluation API, with realistic usage patterns, plus how Patronus fits a testing workflow and how to use it in CI. Patronus iterates quickly, so treat the code as accurate usage patterns and confirm exact parameter names, evaluator identifiers, and model availability against the official Patronus documentation before pinning them.

## The Patronus approach: evaluators as models

Many eval tools ask a general-purpose LLM to act as a judge with a prompt. Patronus's distinguishing bet is **dedicated evaluator models** — models trained for the job of evaluation — alongside a managed API that runs them. The argument is that a model fine-tuned to detect hallucination or to grade against a rubric is more reliable and cheaper at scale than improvising a judge prompt on a frontier model.

Two named evaluators anchor the platform:

- **Lynx** — a hallucination-detection model. Given a question, an answer, and the context the answer should be grounded in, Lynx judges whether the answer is **faithful** (supported by the context) or hallucinated. This directly targets RAG's biggest risk.
- **GLIDER** — a compact, open evaluator model for **fine-grained, rubric-based grading**. You give it a custom rubric and it returns a score with reasoning, so you can evaluate subjective or domain-specific quality without standing up your own judge.

On top of these, Patronus exposes a library of evaluators for common checks (hallucination, answer relevance, context relevance, toxicity, PII, and more) and lets you define custom ones. For a conceptual primer on LLM evaluation generally, see our [AI agent evaluation overview](/blog).

## Lynx: hallucination detection for RAG

Hallucination — confidently stating something the source context does not support — is the defining quality problem for retrieval-augmented generation. **Lynx** exists to catch it automatically. The mental model is a faithfulness judge: it compares the generated answer against the retrieved context and decides whether the answer is grounded.

The three inputs that matter for a faithfulness check are:

1. **The question** the user asked.
2. **The context** retrieved and given to the model (the source of truth).
3. **The answer** the model generated.

Lynx returns whether the answer is faithful to the context, typically with a reasoning explanation. Conceptually, calling it through the Patronus API looks like:

```python
# Usage pattern — confirm exact client/param names in the Patronus docs
from patronus import Client

client = Client()  # reads PATRONUS_API_KEY from the environment

result = client.evaluate(
    evaluator="lynx",                 # hallucination / faithfulness evaluator
    task_input="What is the refund window?",
    task_context="Our policy allows refunds within 30 days of purchase.",
    task_output="You can get a refund within 14 days.",
)

print(result.pass_)        # False — the answer contradicts the context
print(result.explanation)  # reasoning about why it is unfaithful
```

In this example the context says 30 days but the answer says 14, so a faithfulness evaluator should fail it. That is exactly the silent error a hallucination detector is meant to catch before it reaches a user. Because Lynx is open-weight, teams can also run it themselves for data-sensitive workloads, though the managed API is the simplest path.

## GLIDER: fine-grained rubric grading

Not every quality question is "is this faithful?" Often you need to grade against a **custom rubric** — tone, completeness, adherence to a format, domain correctness. **GLIDER** is built for this: a small, open judge model that scores an output against criteria you define and explains its reasoning, which matters for trust and debugging.

Conceptually you provide the output (and any reference or context) plus a rubric, and GLIDER returns a graded score:

```python
# Usage pattern — confirm exact API in the Patronus docs
result = client.evaluate(
    evaluator="glider",
    task_input="Write a polite decline to a refund request.",
    task_output=draft_reply,
    criteria="Score 1-5: is the reply polite, clear, and does it cite policy?",
)

print(result.score)        # numeric score against the rubric
print(result.explanation)  # why it scored that way
```

The value of a dedicated, explainable judge model is twofold: it is cheaper to run at scale than a frontier model, and the reasoning output lets you audit and calibrate the grading rather than trusting an opaque number. As always with LLM-as-judge, write a precise rubric and spot-check the grades on a labeled subset to calibrate.

## The evaluation API and SDK

The Patronus **evaluation API** is the common interface. You authenticate with an API key, pick an evaluator (built-in like Lynx, GLIDER, or a named check such as hallucination/relevance/toxicity, or a custom one you define), and submit the relevant fields:

```bash
export PATRONUS_API_KEY="your_key_here"
pip install patronus
```

| Field you typically supply | Purpose |
|---|---|
| `task_input` | The user prompt / question. |
| `task_context` | The source context (for faithfulness/grounding checks). |
| `task_output` | The model's generated response to grade. |
| `evaluator` | Which evaluator to run (e.g. Lynx, GLIDER, a named check). |
| `criteria` / rubric | The grading rubric for rubric-based evaluators. |
| `gold_answer` (optional) | A reference answer where one exists. |

The response gives you a pass/fail and/or a score plus an explanation, which you log, assert on, or display. This single consistent interface is what lets you mix deterministic checks, named evaluators, and custom rubrics in one evaluation run.

## Offline and online evaluation

Like other serious eval platforms, Patronus supports two modes:

- **Offline / experiments** — run a **dataset** of inputs through your application (or candidate prompt/model) and score every output with your chosen evaluators. This is how you benchmark a change before shipping and compare it against a baseline.
- **Online / monitoring** — run evaluators over a sample of production traffic to detect quality drift after deploy, e.g. continuously checking live RAG answers for hallucination with Lynx.

The workflow mirrors a traditional test suite: a curated dataset encodes the behavior you care about, and when a production failure surfaces you promote it into the dataset so it becomes a permanent regression case. Running Lynx online is especially valuable because hallucinations are subtle and a human would never catch them all by sampling manually.

## CI integration

To gate releases on faithfulness and quality, run a Patronus evaluation in CI and fail when results drop below a threshold:

```yaml
name: patronus-eval
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install patronus
      - name: Run evaluation
        run: python evals/run_patronus.py
        env:
          PATRONUS_API_KEY: ${{ secrets.PATRONUS_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

In `run_patronus.py`, run your dataset through the app, evaluate each output (e.g. with Lynx for faithfulness), aggregate the pass rate, and exit non-zero if it falls below your floor — for instance, fail the build if more than 5% of RAG answers are flagged as hallucinated. Keep the CI dataset small and representative for speed and run the full set on a schedule. See how Patronus compares with other evaluation tooling on our [comparison hub](/compare).

## Common errors and troubleshooting

- **`PATRONUS_API_KEY` not set** — the client cannot authenticate. Export it locally and add it as a CI secret.
- **Faithfulness check seems wrong** — confirm you passed the *retrieved context* (the source of truth) as `task_context`, not the question. Lynx judges the answer against that context; an empty or wrong context produces meaningless verdicts.
- **GLIDER scores are inconsistent** — the rubric is too vague. Give explicit, scaled criteria ("Score 1-5: …") and calibrate against a few human-labeled examples.
- **Wrong evaluator identifier** — evaluator names and versions change; verify the current identifier in the docs rather than assuming.
- **Latency or cost concerns at scale** — sample production traffic for online evaluation rather than scoring every request, and consider self-hosting the open-weight evaluators for high-volume or data-sensitive use.

## When to use Patronus

Choose Patronus when reliable, explainable, hallucination-focused evaluation matters — especially for RAG systems where Lynx's faithfulness detection is a direct fit, and when you want dedicated evaluator models rather than ad-hoc judge prompts. If you primarily need a code-first offline harness with no managed evaluators, a lightweight framework may be simpler; if your priority is full production tracing and dashboards, an observability-first platform may complement Patronus. Many teams pair Patronus's evaluators with a separate observability tool. Browse install-ready evaluation skills for AI coding agents at [/skills](/skills).

## Frequently Asked Questions

### What is Patronus AI used for?

Patronus AI is an automated evaluation platform for LLMs and AI agents, centered on dedicated evaluator models. It is used to detect hallucinations, grade outputs against custom rubrics, and run quality checks like relevance, toxicity, and PII detection, both offline on datasets and online over production traffic. You access its evaluators through a managed API and SDK that returns pass/fail or scores with explanations.

### What is Lynx in Patronus AI?

Lynx is Patronus AI's open-weight model built specifically to detect hallucinations. Given a question, the retrieved context, and a generated answer, Lynx judges whether the answer is faithful to — that is, supported by — the context, which is the core failure mode of retrieval-augmented generation. It returns a faithfulness verdict with reasoning, and because it is open-weight, teams can also run it themselves for sensitive data.

### What is GLIDER?

GLIDER is a compact, open evaluator (judge) model from Patronus for fine-grained, rubric-based grading. You provide an output and a custom rubric, and GLIDER returns a score along with an explanation of its reasoning. Its appeal is that a small dedicated judge is cheaper to run at scale than a frontier model and its explanations let you audit and calibrate the grading.

### How does the Patronus evaluation API work?

You authenticate with a `PATRONUS_API_KEY`, choose an evaluator (such as Lynx, GLIDER, or a named check), and submit the relevant fields — typically the input, the context, and the generated output, plus a rubric for rubric-based evaluators. The API returns a pass/fail and/or a numeric score with an explanation, which you log, assert on in CI, or display. The same interface supports built-in, custom, and dedicated-model evaluators.

### Is Patronus AI open source or paid?

Patronus offers a managed evaluation platform with an SDK and API, while some of its evaluator models — notably Lynx and GLIDER — are released as open weights. Pricing for the managed API and the exact licensing of each model change over time, so confirm current details on the official Patronus site. Self-hosting the open-weight evaluators is an option for high-volume or data-sensitive workloads.

### Can Patronus detect hallucinations in production?

Yes. In addition to offline dataset evaluation, Patronus supports running evaluators over a sample of live production traffic, so you can continuously check real RAG answers for faithfulness with Lynx and detect quality drift after a deploy. Online evaluation is especially valuable for hallucinations because they are subtle and easy to miss by manual sampling, and you can alert or gate on the flagged rate.
