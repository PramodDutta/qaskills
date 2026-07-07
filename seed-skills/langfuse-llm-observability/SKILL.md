---
name: Langfuse LLM Observability Testing
description: Instrument LLM apps with Langfuse tracing, then use traces, scores, and datasets to test in production, run evaluations on real traffic, catch regressions, and close the loop from incident to golden dataset.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [langfuse, llm-observability, tracing, llm-evals, scores, datasets, production-testing, regression]
testingTypes: [llm-evals, integration, regression]
frameworks: [langfuse]
languages: [python, typescript]
domains: [ai, llm, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Langfuse LLM Observability Testing Skill

You are an expert AI quality engineer specializing in Langfuse. When the user asks you to instrument, monitor, or test an LLM application using traces and production data, follow these instructions.

## Core Principles

1. **You cannot test what you cannot see.** Tracing is the foundation: every request gets a trace with spans for retrieval, generations, and tool calls.
2. **Production is the best test set.** Real traces feed datasets; datasets feed offline evals; evals gate changes. That loop is the whole practice.
3. **Score everything three ways.** Automated LLM-as-judge scores at scale, human annotation for calibration, user feedback for ground truth.
4. **Sessions and users over single calls.** Multi-turn quality problems only appear at session level.
5. **Costs and latency are quality metrics.** Track them per trace; a regression in tokens-per-answer is a regression.

## Setup

```bash
pip install langfuse            # python
npm install langfuse            # typescript
export LANGFUSE_PUBLIC_KEY=pk-...
export LANGFUSE_SECRET_KEY=sk-...
export LANGFUSE_HOST=https://cloud.langfuse.com   # or self-hosted URL
```

## Instrumentation (Python)

```python
from langfuse import Langfuse, observe

langfuse = Langfuse()

@observe()                       # creates a trace per call
def answer(user_id: str, session_id: str, query: str):
    langfuse.update_current_trace(user_id=user_id, session_id=session_id,
                                  tags=["support-bot", "prod"])
    chunks = retrieve(query)     # decorate with @observe() too: becomes a span
    reply = generate(query, chunks)   # generations auto-capture model, tokens, cost
    return reply
```

Decorate retrieval, reranking, generation, and tool calls separately; a flat trace cannot localize failures. Wrappers/integrations exist for OpenAI, LangChain, LlamaIndex, and the Vercel AI SDK; prefer them over manual spans.

## Scoring: the Test Signal

```python
# 1. User feedback from the app (thumbs up/down)
langfuse.create_score(trace_id=trace_id, name="user-feedback", value=0, comment="wrong policy quoted")

# 2. Automated LLM-as-judge on sampled traces (configure evaluators in the UI
#    or run your own job):
from my_judges import faithfulness_judge
for trace in fetch_traces(tags=["support-bot"], sample=0.1):
    score = faithfulness_judge(trace.input, trace.output, trace.metadata["contexts"])
    langfuse.create_score(trace_id=trace.id, name="faithfulness", value=score)

# 3. Human annotation queues in the UI for calibration batches
```

Alerting policy: dashboard the 7-day moving average per score name; investigate any sustained drop even inside "acceptable" range, since judge drift and product drift look identical until triaged.

## From Traces to Regression Tests

The core testing workflow: bad trace -> dataset item -> offline eval -> CI gate.

```python
# 1. Curate: add a failing production trace to a dataset
langfuse.create_dataset(name="support-golden")
langfuse.create_dataset_item(
    dataset_name="support-golden",
    input={"query": "Can I get a refund after 45 days?"},
    expected_output="No; refund window is 30 days. Offer credit options.",
    source_trace_id=bad_trace.id,        # provenance
)

# 2. Experiment: run a candidate change against the dataset
dataset = langfuse.get_dataset("support-golden")
for item in dataset.items:
    with item.run(run_name="prompt-v9") as root:
        output = my_app.answer_candidate(item.input["query"])
        root.update(output=output)
        root.score(name="correctness", value=judge(output, item.expected_output))

# 3. Compare runs in the UI (prompt-v8 vs prompt-v9) or via API in CI
```

CI gate pattern: nightly job runs the current build against the dataset, pushes scores as a run, and fails if aggregate correctness drops below threshold or below the previous run by more than 2 points.

## Prompt Management as Change Control

Store prompts in Langfuse prompt management with labels (production, staging). Testing rules: every prompt version change runs the dataset experiment BEFORE the production label moves; traces record which prompt version served each request, so incidents bisect to prompt versions in seconds.

## Monitoring Views That Catch Bugs

| View | Bug class it catches |
|---|---|
| Traces filtered by low user-feedback | Real failures, source for dataset items |
| Score trend by prompt/model version | Regressions from "harmless" prompt edits |
| Cost per trace over time | Token explosions from context stuffing |
| Latency percentiles per span | Slow retrieval hiding behind fast generation |
| Sessions with high turn count | Loops, users re-asking because answers fail |

## Common Mistakes

- Tracing only the final generation; without retrieval spans you cannot tell bad context from bad generation
- No user/session IDs on traces; multi-turn and per-cohort analysis becomes impossible later
- Judge scores never calibrated against human labels; drifting judges silently redefine quality
- Datasets built once and frozen; the loop only works if bad traces keep flowing in
- Shipping prompt edits without a dataset experiment because "it is just wording"

## Checklist

- [ ] Traces with spans for retrieval, generation, tools; user_id, session_id, tags set
- [ ] Three score streams live: user feedback, sampled LLM-judge, human calibration
- [ ] Golden dataset in Langfuse, grown weekly from bad traces, with provenance
- [ ] Experiments run on every prompt/model change before production label moves
- [ ] Nightly CI experiment with threshold + delta gates; cost and latency dashboards reviewed
