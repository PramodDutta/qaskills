import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Arize Phoenix LLM Evaluation Tutorial: Tracing & Evals (2026)',
  description:
    'Learn Arize Phoenix for LLM evaluation: launch the app, trace with OpenInference, run hallucination and QA correctness evals, and version datasets and experiments.',
  date: '2026-06-30',
  category: 'Tutorial',
  content: `
# Arize Phoenix LLM Evaluation Tutorial: Tracing & Evals (2026)

When an LLM application starts misbehaving in production, the first question is always the same: "What did the model actually see, and why did it answer like that?" **Arize Phoenix** exists to answer that question. Phoenix is an open-source, self-hostable observability and evaluation platform for LLM and agent applications — you run it locally with one function call, it captures every trace through the OpenInference standard, and it ships with a library of ready-made evaluators that score your outputs for hallucination, QA correctness, toxicity, and more. This **arize phoenix llm evaluation** tutorial takes you from \`px.launch_app()\` to running real evals against versioned datasets and tracking experiments over time.

Phoenix is the free, open-source sibling of Arize's commercial platform, and it is deliberately friction-free to adopt. There is no signup, no API key, and no cloud dependency for the basics — \`pip install arize-phoenix\`, launch the app, and you have a tracing UI on \`localhost\`. That makes it ideal for the inner development loop where you are iterating on prompts, comparing models, and trying to drive a hallucination rate down before you ship. It also runs in a notebook, which is how most people first meet it.

The two halves of Phoenix are tracing and evaluation, and they reinforce each other. Tracing tells you what happened; evaluation tells you whether it was good. Phoenix lets you run an evaluator over your captured traces and write the scores back, so you can filter your trace view to "show me every span where the QA correctness eval failed." That feedback loop is the heart of eval-driven LLM development. By the end of this tutorial you will know how to instrument an app, run the built-in evals, build datasets of test cases, and run repeatable experiments. If you want the wider tooling context first, our [Promptfoo vs DeepEval vs Ragas comparison](/blog/promptfoo-vs-deepeval-vs-ragas-2026) maps the ecosystem, and you can browse practical [LLM evaluation skills](/skills) on QASkills.

## What Phoenix Is and Where It Fits

Phoenix sits in the same category as Langfuse and LangSmith but leans harder into the evaluation and experimentation workflow rather than long-term production monitoring. It is built around three primitives: **traces** (what your application did), **datasets** (curated examples to test against), and **experiments** (running a task over a dataset and scoring the results). The whole thing is open source under an Apache-style license and runs entirely on your machine, which makes it a natural fit for teams that cannot send data to a SaaS.

A useful way to frame Phoenix against neighbours: it is observability-first like the tools in our [LLM observability vs evaluation](/blog/llm-observability-vs-evaluation-2026) guide, but its evals library and experiment runner make it equally a testing tool, closer in spirit to the frameworks in our [DeepEval testing guide](/blog/deepeval-llm-testing-guide). You will likely use it alongside, not instead of, those tools.

## Step 1: Install and Launch the App

Getting Phoenix running is genuinely a two-line affair. Install the package and call \`launch_app\`.

\`\`\`bash
pip install arize-phoenix arize-phoenix-otel openinference-instrumentation-openai openai
\`\`\`

\`\`\`python
import phoenix as px

# Launches the Phoenix UI and a local collector
session = px.launch_app()
print(session.url)  # e.g. http://localhost:6006
\`\`\`

That call starts an in-process Phoenix server with a web UI (default port 6006) and an OpenTelemetry collector endpoint ready to receive spans. In a notebook the UI can render inline; from a script, open the printed URL in your browser. For a longer-lived setup you can instead run Phoenix as a standalone container with \`docker run -p 6006:6006 arizephoenix/phoenix\`, which is the right choice for a shared team instance or CI.

## Step 2: Trace with OpenInference

Phoenix consumes traces in the **OpenInference** semantic convention, an OpenTelemetry-based standard for LLM spans. The \`register\` helper wires up a tracer provider that points at your Phoenix collector, and the auto-instrumentation packages capture each model call without you writing span code.

\`\`\`python
from phoenix.otel import register
from openinference.instrumentation.openai import OpenAIInstrumentor

# Point the tracer at the local Phoenix collector
tracer_provider = register(
    project_name="qa-assistant",
    endpoint="http://localhost:6006/v1/traces",
)

# Auto-instrument every OpenAI call
OpenAIInstrumentor().instrument(tracer_provider=tracer_provider)

from openai import OpenAI
client = OpenAI()

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What is OpenInference?"}],
)
print(resp.choices[0].message.content)
\`\`\`

Refresh the Phoenix UI and the call appears as a span with the prompt, completion, model name, token counts, and latency. OpenInference has instrumentors for LangChain, LlamaIndex, DSPy, Anthropic, Bedrock, and more, so whatever framework you use, the instrumentation is usually a single \`.instrument()\` call away. For manual spans you can also decorate functions with the tracer to capture custom steps like retrieval or tool calls, giving you the same nested trace tree you would get from a framework integration.

## Step 3: Run Your First Eval — Hallucination

This is where Phoenix differentiates itself. It ships a \`phoenix.evals\` library of pre-built evaluators that use an LLM-as-a-judge to score outputs against well-tested rubrics. The hallucination evaluator checks whether an answer is grounded in the provided reference text. You feed it a dataframe with the right columns and it returns labels and explanations.

\`\`\`python
import pandas as pd
from phoenix.evals import HallucinationEvaluator, OpenAIModel, run_evals

eval_model = OpenAIModel(model="gpt-4o")
hallucination_eval = HallucinationEvaluator(eval_model)

df = pd.DataFrame(
    {
        "input": ["When was Phoenix released?"],
        "reference": ["Arize Phoenix is an open-source LLM observability tool."],
        "output": ["Phoenix was released in 2019 by Google."],  # unsupported claim
    }
)

results = run_evals(
    dataframe=df,
    evaluators=[hallucination_eval],
    provide_explanation=True,
)[0]

print(results[["label", "explanation"]])
# label -> "hallucinated", explanation -> why the answer is not grounded
\`\`\`

The \`provide_explanation=True\` flag is worth always enabling during development: the judge writes a short rationale for its label, which is how you build trust in the evaluator and catch cases where the rubric is being applied too strictly or loosely. The result is a label (\`factual\` or \`hallucinated\`) plus a score you can aggregate across a whole test set.

## Step 4: QA Correctness and Other Built-in Evals

Hallucination is one of several batteries-included evaluators. The QA correctness eval judges whether an answer correctly addresses the question given a reference, which is the workhorse evaluator for RAG and knowledge-assistant testing.

\`\`\`python
from phoenix.evals import QAEvaluator, ToxicityEvaluator, run_evals

qa_eval = QAEvaluator(eval_model)
tox_eval = ToxicityEvaluator(eval_model)

qa_df = pd.DataFrame(
    {
        "input": ["What license is Phoenix under?"],
        "reference": ["Arize Phoenix is open source under an Apache 2.0 license."],
        "output": ["Phoenix is open source, released under Apache 2.0."],
    }
)

qa_results, tox_results = run_evals(
    dataframe=qa_df,
    evaluators=[qa_eval, tox_eval],
    provide_explanation=True,
)
print(qa_results[["label"]])   # -> "correct"
print(tox_results[["label"]])  # -> "non-toxic"
\`\`\`

Here is how the most-used built-in evaluators map to the questions they answer. Pick the evaluator that matches your failure mode rather than running all of them blindly — each judge call costs tokens.

| Evaluator | Question it answers | Inputs needed | Typical labels |
| --- | --- | --- | --- |
| HallucinationEvaluator | Is the answer grounded in the context? | input, reference, output | factual / hallucinated |
| QAEvaluator | Does the answer correctly address the question? | input, reference, output | correct / incorrect |
| RelevanceEvaluator | Is the retrieved context relevant? | input, reference | relevant / irrelevant |
| ToxicityEvaluator | Is the output toxic? | output | toxic / non-toxic |
| SummarizationEvaluator | Is the summary faithful and complete? | input, output | good / bad |

For RAG pipelines specifically, the relevance evaluator run over your retrieved chunks plus the QA evaluator over the final answer gives you a two-stage view: is retrieval pulling the right context, and is generation using it correctly? That separation is exactly what you need to know whether to fix your retriever or your prompt.

## Step 5: Write Eval Results Back to Traces

Running evals on a dataframe is useful, but the real power comes from attaching scores to your live traces so the evaluation and observability halves connect. Phoenix lets you log span-level evaluations back into the project, so you can filter the trace UI by eval outcome.

\`\`\`python
from phoenix.trace import SpanEvaluations
import phoenix as px

# Suppose 'results' has a span_id index from your traced runs
px.Client().log_evaluations(
    SpanEvaluations(
        eval_name="Hallucination",
        dataframe=results,  # indexed by span_id, with 'label' and 'score'
    )
)
\`\`\`

Now in the Phoenix UI you can sort and filter traces by the Hallucination eval, jump straight to the failing spans, read the model's prompt and completion, and read the judge's explanation — all in one place. This closes the loop: observe a problem, evaluate it at scale, and drill into the exact spans that fail.

## Step 6: Datasets and Experiments

Ad-hoc dataframes are fine for exploration, but to track quality over time you want a versioned **dataset** of examples and repeatable **experiments** that run a task over that dataset and score the results. Phoenix manages both as first-class objects.

\`\`\`python
import phoenix as px

client = px.Client()

# Create a versioned dataset of test cases
dataset = client.upload_dataset(
    dataframe=pd.DataFrame(
        {
            "question": ["What is OpenInference?", "What backs Phoenix evals?"],
            "expected": [
                "An OpenTelemetry convention for LLM spans.",
                "An LLM-as-a-judge using configurable models.",
            ],
        }
    ),
    dataset_name="qa-regression-v1",
    input_keys=["question"],
    output_keys=["expected"],
)
\`\`\`

With a dataset in hand, define the task (the thing you are testing) and the evaluator (how you score it), then run an experiment. Each run is versioned, so you can compare a prompt change or model swap against the previous baseline.

\`\`\`python
from phoenix.experiments import run_experiment
from phoenix.experiments.evaluators import create_evaluator

def task(example):
    q = example.input["question"]
    return client_llm_answer(q)  # your app under test

@create_evaluator(name="qa_correctness")
def scores_correct(output, expected) -> float:
    # Return 1.0 if the answer matches the expectation, else 0.0
    return 1.0 if expected["expected"].lower() in output.lower() else 0.0

experiment = run_experiment(
    dataset=dataset,
    task=task,
    evaluators=[scores_correct],
    experiment_name="prompt-v2",
)
print(experiment.url)  # compare against prior runs in the UI
\`\`\`

Because experiments are stored and named, you build a history. Run \`prompt-v1\`, then \`prompt-v2\`, and Phoenix shows you whether your change moved the aggregate score up or down and on which examples it regressed. This is the difference between "I think the new prompt is better" and "the new prompt improved QA correctness from 0.82 to 0.91 with no regressions."

## Step 7: Custom Evaluators with Your Own Rubric

The built-in evaluators cover common cases, but most teams eventually need a domain-specific rubric — does this support reply follow our tone policy, does this answer cite a source, does this SQL query match the schema. Phoenix lets you define a custom LLM-judged classifier with your own template and label set.

\`\`\`python
from phoenix.evals import llm_classify, OpenAIModel

TONE_TEMPLATE = """
You are grading whether a support reply is polite and professional.
Reply: {output}
Respond with exactly one word: "polite" or "rude".
"""

graded = llm_classify(
    dataframe=pd.DataFrame({"output": ["Sure, happy to help with that!"]}),
    model=OpenAIModel(model="gpt-4o"),
    template=TONE_TEMPLATE,
    rails=["polite", "rude"],
    provide_explanation=True,
)
print(graded[["label", "explanation"]])
\`\`\`

The \`rails\` argument constrains the judge to a fixed label set, which prevents the model from inventing categories and makes results aggregatable. Custom classifiers plug into the same \`run_evals\`, dataset, and experiment machinery, so a bespoke rubric is a first-class citizen, not a second-tier hack.

## Choosing the Right Evaluator Model

The quality of any LLM-as-a-judge eval depends heavily on the judge model you pick, and this is a decision teams often make carelessly. A weaker, cheaper model used as a judge will produce noisier labels — it may miss subtle hallucinations or apply a correctness rubric inconsistently — which undermines the whole point of evaluation. As a rule, the judge should be at least as capable as the model you are evaluating, and for high-stakes evals it should be stronger. Many teams use a frontier model such as GPT-4o or Claude as the judge even when the application itself runs on a smaller, faster model, because the judge runs offline in batch and the per-eval cost is amortised across a whole test set.

Cost discipline matters here. Each evaluator call is an LLM call, so running five evaluators over a thousand-row dataset is five thousand judge calls. Pick the evaluators that match your actual failure modes rather than running the entire library, cache results where examples are stable, and run the expensive full-suite evals on a schedule rather than on every commit. For the fast inner loop, a smaller curated dataset of a few dozen representative cases gives you a signal in seconds; reserve the large regression sets for nightly runs or release gates. This tiering keeps Phoenix usable both as an interactive development tool and as a serious CI quality gate without an unbounded token bill.

It is also worth calibrating your evaluators before you trust them. Hand-label a small set of examples yourself, run the evaluator over them, and check agreement. If the judge disagrees with your human labels often, tighten the rubric template or switch to a stronger judge model before you start gating decisions on its output. An uncalibrated evaluator that quietly passes bad outputs is worse than no evaluator at all, because it gives false confidence.

## Choosing Your Phoenix Workflow

Phoenix supports several modes; match the mode to where you are in the lifecycle.

| Mode | How you run it | Best for |
| --- | --- | --- |
| Notebook | \`px.launch_app()\` inline | Exploration, prompt iteration |
| Local script | \`launch_app()\` + open URL | Local dev loop, ad-hoc evals |
| Container | \`docker run arizephoenix/phoenix\` | Shared team instance, CI gates |
| Experiments | \`run_experiment()\` over datasets | Regression testing, model comparison |

The natural progression is to start in a notebook, move to a container as the team grows, and wire experiments into CI so a pull request that regresses your QA correctness score fails the build. That CI gate is the same eval-driven philosophy described in our [DeepEval testing framework guide](/blog/deepeval-llm-testing-guide), applied through Phoenix's experiment runner.

## Frequently Asked Questions

### Is Arize Phoenix free and open source?

Yes. Phoenix is the open-source, self-hostable project from Arize, released under an Apache 2.0 license. The basics require no signup, no API key, and no cloud account — you \`pip install arize-phoenix\`, call \`px.launch_app()\`, and get a full tracing and evaluation UI on localhost. Arize also sells a commercial production-monitoring platform, but Phoenix itself runs entirely on your own infrastructure for free.

### How do I run a hallucination eval in Phoenix?

Import \`HallucinationEvaluator\` from \`phoenix.evals\`, pass it an evaluator model such as \`OpenAIModel(model="gpt-4o")\`, then call \`run_evals\` with a dataframe containing \`input\`, \`reference\`, and \`output\` columns. The evaluator returns a label of \`factual\` or \`hallucinated\` for each row, plus an explanation when you set \`provide_explanation=True\`, so you can see why an answer was judged ungrounded.

### What is OpenInference and how does it relate to OpenTelemetry?

OpenInference is an OpenTelemetry-based semantic convention for instrumenting LLM and agent applications. It defines standard span attributes for prompts, completions, tokens, embeddings, and tool calls. Because it builds on OpenTelemetry, Phoenix can consume traces from any OpenInference-instrumented library — OpenAI, LangChain, LlamaIndex, DSPy, and others — usually with a single \`.instrument()\` call.

### What is the difference between datasets and experiments in Phoenix?

A dataset is a versioned collection of test examples — inputs and expected outputs you curate to test against. An experiment runs a task (your application under test) over every example in a dataset and applies one or more evaluators to score the results. Experiments are named and stored, so you can compare \`prompt-v1\` against \`prompt-v2\` and see exactly which examples improved or regressed.

### Can Phoenix evaluate RAG pipelines?

Yes, and it is a common use case. Run the \`RelevanceEvaluator\` over your retrieved context to check whether retrieval is pulling the right chunks, and the \`QAEvaluator\` over the final answer to check generation quality. That two-stage view tells you whether a failure lives in the retriever or the prompt, which is the key diagnostic question for any RAG system.

### How do I write a custom evaluator in Phoenix?

Use \`llm_classify\` with your own prompt template and a \`rails\` argument listing the allowed labels, or wrap a scoring function with the \`@create_evaluator\` decorator for use inside experiments. The \`rails\` list constrains the LLM judge to a fixed label set so results stay aggregatable. Custom evaluators plug into the same \`run_evals\`, dataset, and experiment machinery as the built-in ones.

### Does Phoenix run in CI?

Yes. Run Phoenix as a container with \`docker run -p 6006:6006 arizephoenix/phoenix\`, then use \`run_experiment\` over a regression dataset in your test job and assert on the aggregate score. If a pull request drops your QA correctness below a threshold, fail the build. This turns Phoenix into an eval-driven quality gate, the same pattern covered in our [DeepEval guide](/blog/deepeval-llm-testing-guide).

### How does Phoenix compare to Langfuse and LangSmith?

All three combine tracing and evaluation, but Phoenix leans hardest into the local development and experimentation loop with its batteries-included evals library and dataset/experiment runner. Langfuse emphasises self-hosted production observability, and LangSmith is tightly coupled to LangChain's hosted platform. Many teams use Phoenix for inner-loop iteration alongside another tool for production monitoring; see our [Langfuse vs LangSmith comparison](/blog/langfuse-vs-langsmith-2026-comparison) for the production side.

## Conclusion

Arize Phoenix is one of the fastest ways to bring rigour to LLM development without standing up infrastructure or signing up for a SaaS. Two lines get you tracing through the OpenInference standard; a few more get you running hallucination and QA correctness evals with LLM-as-a-judge rubrics and explanations you can trust. Wire those evals back into your traces and you can filter straight to the failing spans; promote your ad-hoc dataframes to versioned datasets and experiments and you can track quality across every prompt change and model swap.

Start in a notebook, instrument one application, and run a single hallucination eval to feel the loop. Then build a regression dataset, define a custom rubric that matches your domain, and run experiments in CI so quality regressions fail the build before they reach users. To go further, explore the hands-on [LLM evaluation skills](/skills) on QASkills, and place Phoenix in context with our [Promptfoo vs DeepEval vs Ragas](/blog/promptfoo-vs-deepeval-vs-ragas-2026) and [LLM observability vs evaluation](/blog/llm-observability-vs-evaluation-2026) guides.
`,
};
