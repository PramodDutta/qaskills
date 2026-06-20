import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Galileo AI LLM Evaluation Guide 2026: Metrics + Guardrails',
  description:
    'A complete guide to Galileo AI for LLM evaluation in 2026: Luna models, core metrics, the SDK, runtime guardrails, RAG and agent evaluation, CI, and open-source comparison.',
  date: '2026-06-20',
  category: 'Guide',
  content: `
# Galileo AI LLM Evaluation Guide 2026: Metrics + Guardrails

Evaluating a large language model application is hard for one stubborn reason: there is rarely a single correct answer to compare against. A chatbot can phrase a correct response a hundred ways, a RAG system can hallucinate while sounding confident, and an agent can take a wrong turn three tool calls deep. Galileo is a commercial GenAI evaluation and observability platform built to make these slippery problems measurable. It gives you a battery of research-backed metrics, a family of purpose-built evaluation models called Luna that score outputs without needing a reference answer, runtime guardrails that block bad responses before they reach users, and a console that ties traces, metrics, and experiments together.

This guide is a practical, end-to-end walkthrough of Galileo AI for LLM evaluation in 2026. We explain what Galileo is, how its Luna evaluation models work, how to install and use the SDK, what each core metric measures, how runtime guardrails and Protect work, and how to evaluate RAG systems and agents. We also show how to wire Galileo into CI and how it compares to open-source tools like Ragas and DeepEval, with clear notes on where Galileo is commercial versus free. Every code example is runnable Python. If you are building out a wider testing and evaluation toolkit, the curated [skills directory](/skills) is a good companion to this guide.

## What Is Galileo AI?

Galileo is an evaluation and observability platform for generative AI applications. Where a general-purpose logging tool tells you that a request happened, Galileo tells you whether the response was good, and why. It sits across three stages of the LLM lifecycle:

- **Experimentation.** Before you ship, you run prompts and pipelines against datasets, score them with metrics, and compare variants to pick the best prompt, model, or retrieval configuration.
- **Evaluation.** You measure quality systematically with metrics for groundedness, completeness, correctness, safety, and more, including reference-free metrics that work without a labeled gold answer.
- **Observability and protection.** In production, Galileo logs traces, computes the same metrics on live traffic, and can run guardrails that intercept unsafe or low-quality outputs in real time.

The platform is built around the idea that good evaluation should not require an army of human annotators. Its Luna models and metric suite are designed to give you trustworthy scores cheaply and fast, so you can run them continuously rather than in occasional manual review sessions. Galileo is a commercial product; it offers a free developer tier to get started, with paid plans for production-scale usage, team features, and enterprise deployment.

## The Luna Evaluation Models

The technical centerpiece of Galileo is Luna, a family of small, fine-tuned evaluation models. The problem Luna solves is cost and latency. The obvious way to score an open-ended LLM output is to ask a frontier model to judge it, an LLM-as-judge. That works, but calling a large frontier model on every response in production is slow and expensive, and it can be inconsistent.

Luna models are purpose-built for evaluation tasks. They are trained specifically to detect hallucinations, judge context adherence, flag safety issues, and compute the other metrics in Galileo's suite. Because they are small and specialized, they are far cheaper and lower-latency than calling a frontier model as a judge, which makes them practical to run on every request, not just a sampled subset. Many Luna-powered metrics are also reference-free: they assess an output against the provided context or the question itself, so you do not need a hand-labeled correct answer for every test case. That reference-free property is what lets Galileo evaluate live production traffic, where ground-truth labels never exist.

In practice you rarely interact with Luna directly. You select a metric, and Galileo runs the appropriate Luna model (or another evaluation method) under the hood. The takeaway is that Galileo's metrics are powered by models tuned for the job, which is why they can score quality continuously at production scale.

## Installing Galileo and the SDK

Galileo provides a Python SDK. Over time the libraries have consolidated, so you may see both \`galileo\` and the earlier \`promptquality\` package referenced. Install the current SDK with pip:

\`\`\`bash
pip install galileo
\`\`\`

If you are working with an older project, you may encounter the prompt-evaluation library directly:

\`\`\`bash
pip install promptquality
\`\`\`

You authenticate with an API key from your Galileo console, set as an environment variable:

\`\`\`bash
export GALILEO_API_KEY="your-galileo-api-key"
export GALILEO_PROJECT="rag-chatbot"
\`\`\`

You will typically also have an LLM provider key for the model you are evaluating:

\`\`\`bash
export OPENAI_API_KEY="your-openai-api-key"
\`\`\`

With the key in place, the SDK can log runs, attach metrics, and push results to the console. There is no infrastructure to manage on your side; Galileo's backend handles metric computation.

## Logging Runs and Evaluating Prompts

The core workflow is: run your prompt or pipeline over a dataset, log each input and output to Galileo, attach the metrics you care about, and review the scores in the console. Here is a minimal experiment that evaluates a prompt template across several inputs:

\`\`\`python
import os
from galileo import GalileoEvaluate
from openai import OpenAI

client = OpenAI()
evaluator = GalileoEvaluate(project=os.environ["GALILEO_PROJECT"])

dataset = [
    {"question": "What is a flaky test?",
     "context": "A flaky test passes and fails without code changes."},
    {"question": "What does CI stand for?",
     "context": "CI is short for Continuous Integration."},
]

def run_prompt(question: str, context: str) -> str:
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"Answer using only this context:\\n{context}"},
            {"role": "user", "content": question},
        ],
    )
    return resp.choices[0].message.content

with evaluator.run(run_name="prompt-v1") as run:
    for row in dataset:
        answer = run_prompt(row["question"], row["context"])
        run.log(
            input=row["question"],
            context=row["context"],
            output=answer,
            metrics=["context_adherence", "completeness", "correctness"],
        )
\`\`\`

Each \`run.log\` call records one example along with the metrics to compute. Galileo evaluates the output against the supplied context using its Luna models and stores the scores under the run name \`prompt-v1\`. Change the prompt, log a second run as \`prompt-v2\`, and the console lets you compare the two runs metric by metric, including which specific examples regressed. This is the same compare-experiments loop you would use with any evaluation framework, but with Galileo's reference-free metrics doing the grading.

## Core Galileo Metrics

Galileo's value lives in its metric suite. The metrics fall into a few families: groundedness and relevance for RAG, correctness and completeness for answer quality, and a set of safety metrics. Here is a reference table of the most important ones.

| Metric | What it measures | Needs a reference answer? |
|---|---|---|
| Context Adherence (Groundedness) | Whether the answer is supported by the retrieved context | No |
| Completeness | Whether the answer covers everything the context supports | No |
| Chunk Attribution | Which retrieved chunks actually contributed to the answer | No |
| Chunk Utilization | How much of each retrieved chunk was used | No |
| Context Relevance | Whether the retrieved context is relevant to the question | No |
| Correctness (Factuality) | Whether the answer is factually accurate | Optional |
| PII | Whether the output leaks personally identifiable information | No |
| Toxicity | Whether the output contains toxic or harmful language | No |
| Prompt Injection | Whether the input attempts to hijack the system prompt | No |
| Tone / Sexism / Bias | Whether the output carries unwanted tone or bias | No |

A few of these deserve a closer look.

**Context Adherence (Groundedness)** is the single most useful RAG metric. It asks: is every claim in the answer actually supported by the context the system retrieved? A high score means the model stuck to its sources; a low score is a hallucination signal.

**Completeness** is the complement. An answer can be perfectly grounded but only address half the question. Completeness measures coverage of the answerable information present in the context.

**Chunk Attribution and Chunk Utilization** are diagnostic metrics for retrieval. Attribution tells you which retrieved chunks the answer actually used, so you can spot a retriever that fetches mostly irrelevant passages. Utilization tells you how much of each used chunk mattered, which helps you tune chunk size.

**Correctness (Factuality)** checks whether the answer is true, independent of the provided context. The safety metrics, PII, Toxicity, Prompt Injection, and bias, guard the boundaries of acceptable output and input.

For a deeper treatment of the RAG-specific metrics and the theory behind groundedness and context relevance, our [Ragas RAG evaluation metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) covers the same concepts in an open-source framework.

## Runtime Guardrails and Galileo Protect

Evaluation tells you about quality after the fact. Guardrails act in real time, before a response reaches the user. Galileo Protect is the runtime component that runs metrics as rules on live traffic and takes action when a response violates them.

The pattern is a rule set: each rule names a metric, a condition, and an action. For example, "if Toxicity exceeds 0.5, block the response and return a safe fallback," or "if PII is detected, redact it," or "if Prompt Injection is detected on the input, refuse." Conceptually:

\`\`\`python
from galileo import GalileoProtect

protect = GalileoProtect(project=os.environ["GALILEO_PROJECT"])

ruleset = [
    {"metric": "toxicity", "operator": ">", "threshold": 0.5, "action": "block"},
    {"metric": "pii", "operator": "any", "action": "redact"},
    {"metric": "prompt_injection", "operator": "detected", "action": "refuse"},
]

def guarded_answer(user_input: str) -> str:
    # screen the input first
    verdict_in = protect.invoke(text=user_input, stage="input", ruleset=ruleset)
    if verdict_in.action == "refuse":
        return "I cannot help with that request."

    answer = run_prompt(user_input, context="...")

    # screen the output
    verdict_out = protect.invoke(text=answer, stage="output", ruleset=ruleset)
    if verdict_out.action == "block":
        return "I am not able to provide that response."
    return verdict_out.text  # possibly redacted
\`\`\`

The exact method names depend on your SDK version, but the model is consistent: you submit text and a ruleset, Galileo computes the relevant metrics with Luna, and returns an action. Because Luna models are fast, this can run inline in the request path without adding unacceptable latency. Guardrails let you enforce safety and quality policies as code rather than hoping the base model behaves, which is essential for any application that faces real users. Security-minded teams will recognize this as a defense-in-depth layer; our guide on [testing AI-generated code](/blog/what-is-pytest-python-explained) discusses adjacent verification practices.

## The Galileo Console

The console is the web application where everything comes together. It has three main jobs.

**Experiment comparison.** When you log multiple runs, the console shows them side by side: aggregate metric scores per run, plus a drill-down to individual examples so you can see exactly which inputs improved or regressed between prompt-v1 and prompt-v2. This is how you make data-driven prompt and model decisions instead of going on feel.

**Trace inspection.** For production observability, the console displays traces of your live application: the user input, retrieved context, intermediate steps, and final output, each annotated with its metric scores. When a response scores poorly on groundedness, you open the trace and read the exact context and answer to diagnose whether the problem is retrieval or generation.

**Monitoring and alerting.** Over time the console charts your metrics on production traffic, so you can watch groundedness or toxicity trends and get alerted when they drift. This turns evaluation from a pre-launch gate into a continuous health signal.

Everything in the console is shareable with your team, which replaces ad-hoc spreadsheets and screenshots with a single source of truth for "is the model behaving."

## RAG Evaluation with Galileo

RAG is where Galileo's metric suite shines, because RAG failures are exactly the kind of thing that is hard to catch by hand. A RAG answer can be fluent and confident while being completely unsupported by the documents it retrieved.

For a RAG pipeline you log three things per example: the question, the retrieved context (the chunks), and the generated answer. Galileo then computes the RAG metrics:

\`\`\`python
with evaluator.run(run_name="rag-eval") as run:
    for row in rag_dataset:
        chunks = retrieve(row["question"])          # your retriever
        answer = generate(row["question"], chunks)  # your generator
        run.log(
            input=row["question"],
            context=chunks,
            output=answer,
            metrics=[
                "context_adherence",   # hallucination check
                "completeness",        # coverage check
                "chunk_attribution",   # which chunks helped
                "context_relevance",   # retriever quality
            ],
        )
\`\`\`

Reading the results, you triage failures by metric. Low **Context Relevance** points at the retriever; the model never had the right information. Low **Context Adherence** with good relevance points at the generator; it had the facts but invented something anyway. Low **Completeness** means the answer was correct but partial. **Chunk Attribution** tells you whether you are retrieving too many useless chunks. This decomposition is what makes RAG debugging tractable, and it maps closely to the metrics you would compute with open-source tools, as our [DeepEval vs Ragas comparison](/blog/deepeval-vs-ragas-rag-evaluation-2026) explains.

## Agent Evaluation with Galileo

Agents add a dimension that plain RAG lacks: multi-step trajectories with tool calls. An agent might plan, call a search tool, call a calculator, and synthesize an answer. Evaluating only the final answer misses where it went wrong. Galileo supports agent evaluation by logging the full trajectory, the sequence of steps, tool invocations, and intermediate outputs, and applying metrics at the step level as well as the outcome level.

Conceptually you log the trace tree of the agent run:

\`\`\`python
with evaluator.run(run_name="agent-eval") as run:
    for task in agent_tasks:
        trace = agent.run(task["goal"])   # returns steps + tool calls + final answer
        run.log(
            input=task["goal"],
            trajectory=trace.steps,        # ordered steps with tool calls
            output=trace.final_answer,
            metrics=[
                "tool_selection_quality",  # did it pick the right tools
                "action_completion",       # did it finish the task
                "correctness",             # is the final answer right
            ],
        )
\`\`\`

Agent metrics answer questions plain quality metrics cannot: did the agent select the appropriate tool, did it complete the assigned action, did it loop unnecessarily, and was the final result correct. By scoring the trajectory and not just the endpoint, Galileo helps you find the specific step where an agent's reasoning breaks, which is usually the hardest part of debugging agentic systems.

## Running Galileo in CI

Like any evaluation framework, Galileo earns its keep when it runs automatically on every change. The CI pattern is the same as with unit tests: run an evaluation, read back the aggregate metrics, and fail the build if a metric drops below a threshold.

\`\`\`python
# galileo_ci.py
import os
from galileo import GalileoEvaluate

evaluator = GalileoEvaluate(project=os.environ["GALILEO_PROJECT"])

with evaluator.run(run_name="ci-gate") as run:
    for row in dataset:
        answer = run_prompt(row["question"], row["context"])
        run.log(input=row["question"], context=row["context"],
                output=answer, metrics=["context_adherence", "correctness"])

summary = run.aggregate()  # average metric scores for this run
adherence = summary["context_adherence"]
print(f"context adherence: {adherence:.2%}")
assert adherence >= 0.85, f"Regression: groundedness {adherence:.2%} below 85% gate"
\`\`\`

In GitHub Actions you install the SDK, provide the keys as encrypted secrets, and run the script:

\`\`\`bash
pip install galileo openai
GALILEO_API_KEY="$GALILEO_API_KEY" OPENAI_API_KEY="$OPENAI_API_KEY" python galileo_ci.py
\`\`\`

The \`assert\` enforces the quality gate while the run still pushes full results to the console for human review. This is exactly the discipline you apply to code with a test suite; if you want a refresher on building assertions and test gates in Python, see our [pytest explainer](/blog/what-is-pytest-python-explained).

## Galileo vs Open-Source Eval Tools

The most common question is when to pay for Galileo versus using open-source tools like Ragas, DeepEval, or OpenAI Evals. Here is an honest comparison.

| Capability | Galileo (commercial) | Ragas / DeepEval (open source) |
|---|---|---|
| Cost | Free tier, then paid | Free and open source |
| Hosted UI / console | Yes, full console | Self-built or third-party dashboards |
| Evaluation models | Luna, purpose-built, low cost | Bring your own judge LLM |
| Reference-free metrics | Yes, extensive | Yes, varies by framework |
| Runtime guardrails | Yes, Protect | Not built in |
| Production observability | Yes, traces and monitoring | Limited, integrate separately |
| Agent trajectory eval | Yes | Partial, varies |
| Data control | Hosted (self-hosted on enterprise) | Fully in your environment |
| Setup effort | Low, managed backend | Higher, you wire everything |
| Best for | Teams wanting an end-to-end managed platform | Teams wanting control, no vendor, or a tight budget |

The decision usually comes down to control versus convenience. **Galileo** gives you a managed, end-to-end platform: purpose-built evaluation models, a polished console, production observability, and runtime guardrails, with minimal setup. You pay for that, and your evaluation data is hosted (self-hosting is available on enterprise plans). **Ragas and DeepEval** are free, open source, and run entirely in your environment, but you supply your own judge model, build your own dashboards, and stitch together observability yourself. Many teams prototype with open-source frameworks and graduate to Galileo when they need guardrails, monitoring, and a shared console at production scale. For a fuller picture of the open-source side, read our [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026) and [DeepEval vs Ragas comparison](/blog/deepeval-vs-ragas-rag-evaluation-2026).

## Frequently Asked Questions

### What is Galileo AI used for?

Galileo AI is a commercial platform for evaluating and monitoring generative AI applications. It measures LLM output quality with research-backed metrics like groundedness, completeness, correctness, and toxicity, powered by its purpose-built Luna evaluation models. Teams use it to compare prompts and models during development, evaluate RAG and agent systems, enforce runtime guardrails on production traffic, and monitor quality continuously through a hosted console.

### What are Galileo Luna evaluation models?

Luna is Galileo's family of small, fine-tuned models built specifically for evaluation tasks such as detecting hallucinations, judging context adherence, and flagging safety issues. Because they are specialized and compact, Luna models are far cheaper and faster than calling a frontier LLM as a judge, and many of their metrics are reference-free. That combination lets Galileo score every production request continuously rather than sampling, which is what powers its guardrails and live monitoring.

### What metrics does Galileo provide?

Galileo offers RAG metrics including Context Adherence (groundedness), Completeness, Context Relevance, Chunk Attribution, and Chunk Utilization; answer-quality metrics like Correctness (factuality); and safety metrics including PII detection, Toxicity, Prompt Injection, and bias or tone checks. Most are reference-free, meaning they evaluate an output against its context or input rather than a labeled gold answer, so they work on live production traffic where ground-truth labels do not exist.

### How do Galileo guardrails work?

Galileo guardrails, delivered through Galileo Protect, run evaluation metrics as rules on live traffic in real time. You define a ruleset pairing a metric, a condition, and an action, for example block a response if Toxicity exceeds a threshold, redact detected PII, or refuse an input flagged for prompt injection. Galileo computes the metrics with its fast Luna models inline in the request path and returns the action, so unsafe or low-quality responses are intercepted before reaching users.

### Is Galileo AI free or paid?

Galileo is a commercial product with a free developer tier that lets you start logging runs, computing metrics, and exploring the console at no cost. Production-scale usage, larger teams, advanced guardrails, longer data retention, and enterprise features such as self-hosted deployment are part of paid plans. The free tier is suitable for evaluation and prototyping, while paid plans cover high-volume production monitoring and protection.

### How does Galileo compare to Ragas and DeepEval?

Galileo is a managed, end-to-end commercial platform with a hosted console, purpose-built Luna evaluation models, runtime guardrails, and production observability, all with minimal setup. Ragas and DeepEval are free, open-source frameworks that run entirely in your environment but require you to supply your own judge model and build your own dashboards and monitoring. Choose Galileo for convenience, guardrails, and managed observability; choose open source for full control, no vendor lock-in, or a tighter budget.

### Can Galileo evaluate RAG and agents?

Yes. For RAG, you log the question, retrieved context, and answer, and Galileo computes Context Adherence, Completeness, Context Relevance, and Chunk Attribution, which lets you isolate whether failures come from the retriever or the generator. For agents, Galileo logs the full trajectory of steps and tool calls and applies metrics like tool-selection quality and action completion at each step, so you can find exactly where an agent's reasoning breaks rather than only judging the final answer.

## Conclusion

Galileo AI packages the hard parts of LLM evaluation into a single platform. Its Luna models make reference-free, low-cost scoring practical at production scale; its metric suite turns vague quality concerns into concrete numbers for groundedness, completeness, correctness, and safety; its guardrails enforce those standards in real time before bad responses reach users; and its console ties experiments, traces, and monitoring together for the whole team. For RAG and agent systems in particular, the metric decomposition makes debugging tractable in a way that hand-review never can.

The practical path is to start on the free tier, log a single experiment with two or three metrics, and read the results in the console. From there, add guardrails, wire an evaluation into CI as a quality gate, and turn on production monitoring. If you prefer to keep everything in your own environment first, prototype with the open-source frameworks in our [DeepEval vs Ragas guide](/blog/deepeval-vs-ragas-rag-evaluation-2026) and [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026), then graduate to Galileo when you need managed guardrails and observability. Explore the full set of QA and LLM-evaluation skills on our [skills directory](/skills) to round out your testing stack.
`,
};
