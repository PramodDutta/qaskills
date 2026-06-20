import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MLflow LLM Evaluation Guide 2026: mlflow.genai.evaluate',
  description:
    'Complete MLflow LLM evaluation guide for 2026: install MLflow, use mlflow.genai.evaluate with built-in and custom scorers, LLM-as-judge, tracing, and CI/CD.',
  date: '2026-06-20',
  category: 'Guide',
  content: `
# MLflow LLM Evaluation Guide 2026: mlflow.genai.evaluate

MLflow started life as the de facto open-source platform for tracking classical machine learning experiments, packaging models, and managing model registries. As large language models and retrieval-augmented generation systems moved into production, MLflow added a dedicated GenAI evaluation layer so that the same platform teams already use for experiment tracking can also measure the quality of LLM-powered applications. In 2026 the modern entry point for this work is \`mlflow.genai.evaluate()\`, an API built around the concept of *scorers*: small, composable functions that take a model's input and output and return a numeric score or a pass/fail judgment.

MLflow LLM evaluation matters because LLM outputs are not deterministic and cannot be checked with a simple string equality assertion. A model can answer the same question three different ways and all three can be correct. To know whether a prompt change, a model swap, or a new retrieval strategy actually improved your application, you need repeatable, quantified measurement across a representative dataset. That is exactly what MLflow provides: you define a dataset of inputs (and optionally expected outputs), you choose scorers such as Correctness, RelevanceToQuery, and Safety, you run \`mlflow.genai.evaluate()\`, and MLflow logs every score as a run you can compare visually in its UI.

This guide walks through installing MLflow, the modern \`mlflow.genai.evaluate()\` API, the built-in scorers, writing custom scorers with the \`@scorer\` decorator, using LLM-as-judge, structuring evaluation datasets, enabling tracing and autolog, comparing runs in the MLflow UI, wiring evaluation into CI/CD, and how MLflow compares to DeepEval and Ragas. MLflow's GenAI API evolves quickly, so treat the code below as accurate usage patterns and confirm exact names against the official MLflow docs before you pin a production version. If you are new to LLM evaluation broadly, the [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026) is a useful companion read.

## What MLflow LLM evaluation is

MLflow LLM evaluation is a framework for measuring the quality of LLM and GenAI application outputs in a structured, repeatable, and trackable way. Instead of eyeballing a handful of responses, you run your application across a dataset and apply scorers that quantify dimensions like factual correctness, relevance to the user's query, groundedness in retrieved context, and safety. Every evaluation produces a run logged to MLflow Tracking, complete with per-example scores, aggregate metrics, and the model's actual outputs, so you can compare experiments over time and across configurations.

The unit of measurement in modern MLflow is the *scorer*. A scorer receives the inputs, the model's outputs, and optionally expectations (ground truth), and returns a value. Some scorers are deterministic heuristics (exact match, regex, latency). Many are LLM-as-judge scorers that use a strong model to grade outputs against a rubric. By combining several scorers in one \`mlflow.genai.evaluate()\` call, you get a multi-dimensional quality profile for each version of your app.

It helps to understand where this fits in the wider testing world. Traditional software testing assumes determinism: given the same input, the system produces the same output, so an assertion of expected equals actual is enough. LLM applications break that assumption. The same prompt can yield a different phrasing every time, a model upgrade can quietly change behavior across thousands of inputs, and a retrieval tweak can improve some queries while regressing others. Because of this, LLM quality is statistical rather than binary. MLflow LLM evaluation embraces that reality by measuring aggregate scores across a representative dataset and tracking how those scores move as you change prompts, models, temperatures, retrieval strategies, and guardrails. The goal is not a single green check but a trend line you can trust, and a way to prove that a change made the application measurably better rather than merely different.

## Installation and setup

MLflow installs from PyPI. The GenAI evaluation features live in the main package:

\`\`\`bash
pip install mlflow
\`\`\`

Some LLM-as-judge scorers depend on a judge model. MLflow can use OpenAI, Anthropic, or other providers depending on your configuration, so set the relevant API key in your environment:

\`\`\`bash
export OPENAI_API_KEY="your_key_here"
\`\`\`

You can run a local MLflow Tracking server to view results in the browser:

\`\`\`bash
mlflow ui --port 5000
\`\`\`

Then point your script at it from Python:

\`\`\`python
import mlflow

mlflow.set_tracking_uri("http://localhost:5000")
mlflow.set_experiment("llm-eval-demo")
\`\`\`

With the tracking URI set, every evaluation run, its parameters, and its scores are persisted and visible in the MLflow UI at \`http://localhost:5000\`.

## The mlflow.genai.evaluate() API

The heart of modern MLflow LLM evaluation is \`mlflow.genai.evaluate()\`. You pass it a dataset, a prediction function (or the outputs directly), and a list of scorers. MLflow runs your function over the dataset, applies each scorer, and logs the results.

\`\`\`python
import mlflow
from mlflow.genai.scorers import Correctness, RelevanceToQuery, Safety

# A small evaluation dataset: each row has an input and an expected answer.
eval_dataset = [
    {
        "inputs": {"question": "What is the capital of France?"},
        "expectations": {"expected_response": "Paris"},
    },
    {
        "inputs": {"question": "Who wrote Pride and Prejudice?"},
        "expectations": {"expected_response": "Jane Austen"},
    },
]

# The function under test: it receives the row inputs and returns a response.
def predict_fn(question: str) -> str:
    # Replace this with a real call to your LLM application.
    answers = {
        "What is the capital of France?": "The capital of France is Paris.",
        "Who wrote Pride and Prejudice?": "Pride and Prejudice was written by Jane Austen.",
    }
    return answers.get(question, "I do not know.")

results = mlflow.genai.evaluate(
    data=eval_dataset,
    predict_fn=predict_fn,
    scorers=[Correctness(), RelevanceToQuery(), Safety()],
)

print(results.metrics)
\`\`\`

MLflow calls \`predict_fn\` once per row, passing the keys of \`inputs\` as keyword arguments. It then runs each scorer against the input, the produced output, and the expectations. The returned \`results\` object exposes aggregate \`metrics\` and a per-row table you can inspect, and everything is logged as an MLflow run for later comparison.

## Built-in scorers

MLflow ships a library of ready-to-use scorers that cover the dimensions most LLM applications care about. You import them from \`mlflow.genai.scorers\` and pass instances into the \`scorers\` list.

\`\`\`python
from mlflow.genai.scorers import (
    Correctness,
    RelevanceToQuery,
    Safety,
    Guidelines,
    RetrievalGroundedness,
)
\`\`\`

| Scorer | What it measures | Needs ground truth? | Typical use |
| --- | --- | --- | --- |
| \`Correctness\` | Whether the output is factually correct vs. the expected answer | Yes | Q&A, factual tasks |
| \`RelevanceToQuery\` | Whether the output actually addresses the user's question | No | Chatbots, assistants |
| \`Safety\` | Whether the output is free of harmful or toxic content | No | Any user-facing app |
| \`Guidelines\` | Whether the output follows a natural-language policy you define | No | Brand tone, format rules |
| \`RetrievalGroundedness\` | Whether the answer is supported by the retrieved context | No (needs context) | RAG pipelines |

The \`Guidelines\` scorer is particularly flexible: you give it a plain-English rule and an LLM judge checks compliance.

\`\`\`python
from mlflow.genai.scorers import Guidelines

tone_scorer = Guidelines(
    name="professional_tone",
    guidelines="The response must be polite, professional, and free of slang.",
)

results = mlflow.genai.evaluate(
    data=eval_dataset,
    predict_fn=predict_fn,
    scorers=[tone_scorer],
)
\`\`\`

For RAG systems, \`RetrievalGroundedness\` is essential because it catches hallucinations where the model invents facts not present in the retrieved documents. If you are building RAG specifically, our [DeepEval vs Ragas comparison](/blog/deepeval-vs-ragas-rag-evaluation-2026) digs deeper into groundedness and faithfulness metrics.

## Custom scorers with the @scorer decorator

Built-in scorers cover common cases, but real applications often need bespoke checks: a regex for an internal ID format, a JSON-schema validation, a latency threshold, or a domain-specific business rule. MLflow lets you define custom scorers with the \`@scorer\` decorator. The decorated function receives the inputs, outputs, and expectations, and returns a value: a boolean, a number, or a structured feedback object.

\`\`\`python
from mlflow.genai.scorers import scorer

@scorer
def mentions_source(outputs: str) -> bool:
    """Pass if the answer cites a source by including the word 'Source'."""
    return "Source" in outputs

@scorer
def response_length(outputs: str) -> int:
    """A numeric scorer: return the character length of the response."""
    return len(outputs)

results = mlflow.genai.evaluate(
    data=eval_dataset,
    predict_fn=predict_fn,
    scorers=[mentions_source, response_length],
)
\`\`\`

Custom scorers compose freely with built-in ones in the same \`scorers\` list. Because they are just Python functions, you can call any library, hit a validation service, or run an external classifier inside them. This is how teams encode the specific quality bar their product requires rather than relying solely on generic metrics.

## LLM-as-judge scorers

Many quality dimensions cannot be measured by code alone. Whether an answer is "helpful" or "well-reasoned" is a judgment call. MLflow's LLM-as-judge scorers use a strong model to grade outputs against a rubric, returning both a score and a written rationale. The built-in \`Correctness\`, \`RelevanceToQuery\`, \`Safety\`, and \`Guidelines\` scorers are themselves LLM-as-judge under the hood. You can also build your own judge-based scorer that wraps a custom rubric.

\`\`\`python
from mlflow.genai.scorers import scorer
from mlflow.genai.judges import meets_guidelines

@scorer
def is_concise(inputs: dict, outputs: str):
    """Use an LLM judge to decide whether the answer is concise."""
    return meets_guidelines(
        guidelines="The answer should be concise, ideally under three sentences.",
        context={"request": inputs, "response": outputs},
    )

results = mlflow.genai.evaluate(
    data=eval_dataset,
    predict_fn=predict_fn,
    scorers=[is_concise],
)
\`\`\`

LLM-as-judge gives you human-like assessment at scale, but remember that judges are themselves models and can be wrong or biased. Validate your judges against a small set of human-labeled examples before trusting them as a release gate, and prefer cheaper deterministic scorers wherever a rule can capture the requirement.

## Evaluation datasets

A scorer is only as good as the dataset you run it on. MLflow accepts datasets as a list of dicts, a pandas DataFrame, or an MLflow evaluation dataset object. Each row should contain at least the inputs your prediction function needs; for ground-truth scorers, include expectations.

\`\`\`python
import pandas as pd

df = pd.DataFrame(
    [
        {
            "inputs": {"question": "What is 2 + 2?"},
            "expectations": {"expected_response": "4"},
        },
        {
            "inputs": {"question": "Name a primary color."},
            "expectations": {"expected_response": "Red, blue, or yellow"},
        },
    ]
)

results = mlflow.genai.evaluate(
    data=df,
    predict_fn=predict_fn,
    scorers=[Correctness()],
)
\`\`\`

Curate datasets that mirror real production traffic, including edge cases and adversarial inputs. A common workflow is to mine failing examples from production traces, label them, and add them to a regression dataset so the same bug never silently returns. Keep the dataset under version control next to your code so evaluation is reproducible.

## Tracing and autolog

MLflow Tracing captures the internal steps of an LLM application: each prompt, each retrieval, each tool call, with inputs, outputs, latency, and token usage. This is invaluable for debugging why a particular example scored poorly. For many popular libraries, you can enable automatic tracing with a single autolog call.

\`\`\`python
import mlflow

# Automatically trace OpenAI client calls.
mlflow.openai.autolog()

# Or trace LangChain chains and agents automatically.
mlflow.langchain.autolog()
\`\`\`

You can also trace arbitrary functions manually with the \`@mlflow.trace\` decorator:

\`\`\`python
import mlflow

@mlflow.trace
def retrieve_and_answer(question: str) -> str:
    docs = retrieve(question)        # your retrieval step
    answer = call_llm(question, docs)  # your generation step
    return answer
\`\`\`

Traces appear in the MLflow UI linked to their evaluation run, so when a row fails a scorer you can drill straight into the exact sequence of calls that produced the bad output. Tracing plus scoring together turn evaluation from a pass/fail number into an actionable debugging surface.

In practice, tracing is what makes a low score useful rather than merely alarming. Suppose your RAG application scores 0.4 on RetrievalGroundedness for a particular question. Without tracing, all you know is that the answer was unsupported by the context, and you are left guessing whether the retriever fetched the wrong documents, the chunking split a key passage in half, the reranker buried the right chunk, or the generation step ignored the context it was given. With tracing enabled, you open that example's trace and read the actual retrieved chunks, the exact prompt assembled from them, and the raw model output, so you can see immediately which stage failed. That distinction matters because the fix is completely different in each case: a retrieval problem calls for better embeddings or chunking, while a generation problem calls for a clearer prompt or a stronger model. Capturing token usage and latency in the same traces also lets you spot the cost and speed implications of a change at the same time you assess quality, which is essential when you are balancing accuracy against the budget and latency a production application can tolerate.

## Comparing models and runs in the MLflow UI

Every \`mlflow.genai.evaluate()\` call is logged as a run. The MLflow UI lets you place runs side by side and compare aggregate scorer metrics, making it easy to see whether GPT-4o or Claude scored higher on Correctness, or whether your new prompt improved RelevanceToQuery without regressing Safety.

\`\`\`python
import mlflow
from mlflow.genai.scorers import Correctness, RelevanceToQuery

for model_name in ["model-a", "model-b"]:
    with mlflow.start_run(run_name=model_name):
        def predict_fn(question: str, _m=model_name) -> str:
            return call_model(_m, question)

        mlflow.genai.evaluate(
            data=eval_dataset,
            predict_fn=predict_fn,
            scorers=[Correctness(), RelevanceToQuery()],
        )
\`\`\`

Open the UI, select both runs, and click Compare. MLflow renders a table and charts of each scorer's aggregate value per run, plus per-example diffs so you can spot exactly which inputs one model handled better. This experiment-tracking heritage is MLflow's signature strength: evaluation results are first-class, persistent, and comparable rather than ephemeral console output.

## CI/CD integration

The real payoff of structured evaluation is catching regressions automatically. You can run \`mlflow.genai.evaluate()\` in a CI pipeline and fail the build when an aggregate score drops below a threshold, turning quality into a gate just like unit tests. The same discipline QA engineers apply to [pytest test suites](/blog/what-is-pytest-python-explained) applies to LLM evaluation.

\`\`\`python
# ci_eval.py
import sys
import mlflow
from mlflow.genai.scorers import Correctness, Safety

results = mlflow.genai.evaluate(
    data=eval_dataset,
    predict_fn=predict_fn,
    scorers=[Correctness(), Safety()],
)

correctness = results.metrics.get("correctness/mean", 0.0)
THRESHOLD = 0.8

if correctness < THRESHOLD:
    print(f"FAIL: correctness {correctness:.2f} below {THRESHOLD}")
    sys.exit(1)

print(f"PASS: correctness {correctness:.2f}")
\`\`\`

Wire it into a GitHub Actions workflow:

\`\`\`yaml
name: llm-eval
on: [pull_request]
jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install mlflow openai
      - run: python ci_eval.py
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
\`\`\`

Now every pull request that degrades correctness or trips the Safety scorer fails CI before it can merge, giving you the same regression protection for prompts and models that you already have for code.

## MLflow vs DeepEval vs Ragas

MLflow is not the only LLM evaluation tool. The right choice depends on whether you want a full experiment-tracking platform, a pytest-native assertion library, or a RAG-focused metric suite.

| Tool | Core strength | Tracking UI | RAG metrics | LLM-as-judge | Best for |
| --- | --- | --- | --- | --- | --- |
| MLflow | End-to-end experiment tracking + GenAI eval | Yes (rich) | Yes | Yes | Teams already on MLflow, model/run comparison |
| DeepEval | pytest-native LLM unit testing | Limited | Yes | Yes | Engineers who want eval as code/tests |
| Ragas | Deep, research-grade RAG metrics | Via integrations | Extensive | Yes | RAG-heavy pipelines needing faithfulness depth |

MLflow's edge is that evaluation lives inside the same platform you use for training runs, model registry, and deployment, so quality scores sit next to everything else. DeepEval feels like writing tests and slots naturally into existing pytest suites. Ragas offers the deepest RAG-specific metrics. Many teams combine them: Ragas or DeepEval for the metrics, MLflow for tracking and comparison. For a side-by-side of the two RAG tools, see our [DeepEval vs Ragas guide](/blog/deepeval-vs-ragas-rag-evaluation-2026) and the [Ragas metrics deep dive](/blog/ragas-rag-evaluation-metrics-complete-guide).

## Frequently Asked Questions

### What is mlflow.evaluate used for?

\`mlflow.evaluate()\` and its modern GenAI counterpart \`mlflow.genai.evaluate()\` run a model or LLM application across a dataset and apply scorers to measure output quality. They log per-example and aggregate metrics as MLflow runs, so you can compare prompts, models, and configurations over time and gate releases on quality thresholds rather than eyeballing a few responses.

### How do I install MLflow for LLM evaluation?

Install the main package with \`pip install mlflow\`. The GenAI evaluation features, including \`mlflow.genai.evaluate()\` and the built-in scorers, ship in the core package. For LLM-as-judge scorers you also need a judge model, so set the relevant provider key such as \`OPENAI_API_KEY\` in your environment before running evaluations.

### What scorers does MLflow provide out of the box?

MLflow ships built-in scorers including Correctness, RelevanceToQuery, Safety, Guidelines, and RetrievalGroundedness. Correctness compares against ground truth, RelevanceToQuery checks the answer addresses the question, Safety flags harmful content, Guidelines enforces a natural-language policy, and RetrievalGroundedness verifies RAG answers are supported by retrieved context. You combine them in one evaluate call.

### How do I write a custom scorer in MLflow?

Decorate a Python function with \`@scorer\` from \`mlflow.genai.scorers\`. The function receives inputs, outputs, and expectations, and returns a boolean, number, or feedback object. Because it is plain Python you can run regex checks, JSON-schema validation, latency thresholds, or external classifiers. Pass the decorated function alongside built-in scorers in the evaluate call's scorers list.

### Does MLflow support LLM-as-judge evaluation?

Yes. MLflow's built-in Correctness, RelevanceToQuery, Safety, and Guidelines scorers use an LLM judge under the hood, returning both a score and a rationale. You can also build custom judge-based scorers with helpers like \`meets_guidelines\`. Validate judges against human-labeled examples first, since judges are models themselves and can be biased or wrong on edge cases.

### Can I use MLflow evaluation in CI/CD?

Yes. Run \`mlflow.genai.evaluate()\` in a script, read an aggregate metric such as \`correctness/mean\` from the results, and exit non-zero when it falls below a threshold. Add that script as a step in GitHub Actions or any CI system so every pull request that degrades quality fails the build, giving prompts and models the same regression protection as unit tests.

### How does MLflow compare to DeepEval and Ragas?

MLflow is a full experiment-tracking platform with GenAI evaluation built in, ideal for comparing models and runs in a rich UI. DeepEval is pytest-native and feels like writing unit tests. Ragas offers the deepest RAG-specific metrics. Many teams pair Ragas or DeepEval for metrics with MLflow for tracking and comparison, getting metric depth and persistent, comparable results together.

## Conclusion

MLflow brings the rigor of experiment tracking to LLM evaluation. With \`mlflow.genai.evaluate()\`, a curated dataset, and a mix of built-in scorers like Correctness, RelevanceToQuery, Safety, Guidelines, and RetrievalGroundedness plus your own \`@scorer\` functions, you can measure GenAI quality repeatably, debug failures through tracing, compare models side by side in the UI, and gate releases in CI/CD. The key is to start small: pick one quality dimension that matters for your app, build a representative dataset, and run your first evaluation today, then expand coverage as you learn where your application breaks.

Ready to level up your AI testing practice? Explore the [QASkills directory](/skills) for ready-to-install evaluation and testing skills for AI coding agents, and pair MLflow with the pytest discipline covered in our [pytest fixtures and conftest guide](/blog/pytest-fixtures-conftest-complete-guide-2026) to build a complete quality pipeline.
`,
};
