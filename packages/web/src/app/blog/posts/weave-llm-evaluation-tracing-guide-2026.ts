import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'W&B Weave LLM Evaluation & Tracing Guide 2026',
  description:
    'Learn W&B Weave for LLM evaluation and tracing: weave.init, the @weave.op decorator, weave.Evaluation, scorers, LLM-as-judge, the Weave UI, and CI usage in 2026.',
  date: '2026-06-20',
  category: 'Guide',
  content: `
# W&B Weave LLM Evaluation & Tracing Guide 2026

Shipping a large language model feature is the easy part. Knowing whether it actually works, and proving it still works after every prompt tweak, model swap, or retrieval change, is where most teams stall. W&B Weave is the toolkit Weights & Biases built for exactly this problem. It is a lightweight Python framework that adds automatic tracing to your LLM code, gives you a structured way to run evaluations against datasets, and ships a rich web UI for inspecting traces, comparing experiments, and building leaderboards.

If you have ever scattered \`print()\` statements through an agent loop, copy-pasted model outputs into a spreadsheet to grade them by hand, or argued with a teammate about whether the new prompt is "better," Weave is designed to end that pain. You decorate the functions you care about with \`@weave.op\`, call \`weave.init("your-project")\` once, and every call, its inputs, outputs, latency, token counts, and cost get logged automatically to a trace tree you can explore in your browser.

This guide is a complete, hands-on walkthrough of W&B Weave for LLM evaluation and tracing in 2026. We cover installation, the \`@weave.op\` decorator, building a \`weave.Evaluation\` with a dataset and scorers, writing custom scorers and LLM-as-judge scorers, the Weave UI, OpenAI and Anthropic integrations, running evals in CI, and how Weave compares to LangSmith and MLflow. Every code block is runnable Python you can paste into a notebook or script. If you are assembling a broader evaluation stack, browse the QA and evaluation skills on our [skills directory](/skills) for complementary tooling.

## What Is W&B Weave?

W&B Weave is the LLM-focused observability and evaluation product from Weights & Biases, the company best known for experiment tracking in classical machine learning. Where the original \`wandb\` library tracks training runs, metrics, and model artifacts, Weave focuses on the messy, non-deterministic world of generative AI: prompts, completions, agents, tool calls, retrieval, and the human-or-model judgments you use to score them.

Weave gives you three things that work together:

- **Tracing.** Automatic, hierarchical logging of every decorated function call, including nested calls, so you can see the full execution tree of an agent or RAG pipeline.
- **Evaluation.** A \`weave.Evaluation\` primitive that runs your model or function across a dataset, applies one or more scorers, and aggregates the results into a comparable report.
- **A UI.** A web application (hosted at wandb.ai or self-hosted) where traces, evaluations, comparisons, and leaderboards live, shareable with your whole team via a URL.

The key design decision is that Weave is incremental. You do not rewrite your application to adopt it. You add a decorator here, an \`init\` there, and you get value immediately. That makes it a natural fit for teams that already have an LLM app in production and want observability without a migration project.

## Installing Weave

Weave is a pure Python package. Install it with pip:

\`\`\`bash
pip install weave
\`\`\`

You will also want an LLM client to actually call a model. Most examples in this guide use OpenAI and Anthropic:

\`\`\`bash
pip install weave openai anthropic
\`\`\`

Weave logs to Weights & Biases, so you need an account (the free tier is generous) and an API key. Log in once from your shell:

\`\`\`bash
wandb login
\`\`\`

Or set the key as an environment variable, which is what you will do in CI:

\`\`\`bash
export WANDB_API_KEY="your-wandb-api-key"
export OPENAI_API_KEY="your-openai-api-key"
\`\`\`

That is the entire setup. There is no server to run, no database to provision. Weave talks to the W&B backend over HTTPS.

## weave.init: Starting a Project

Everything in Weave hangs off a project. You start logging by calling \`weave.init\` once, near the top of your program, with a project name:

\`\`\`python
import weave

weave.init("rag-chatbot")
\`\`\`

The string \`"rag-chatbot"\` is your project name. If you belong to multiple W&B teams (entities), you can qualify it as \`"my-team/rag-chatbot"\`. The first time you run this, Weave creates the project; afterward, all traces and evaluations land in the same place.

\`weave.init\` returns a client object, but you rarely need it directly. The important side effect is that Weave is now active: any function you have decorated with \`@weave.op\` will be traced, and any supported LLM client (OpenAI, Anthropic, and others) will be auto-patched so its calls are logged too, even without an explicit decorator.

A common mistake is calling \`weave.init\` inside a function that runs many times, or forgetting it entirely. Call it exactly once, at module load or at the start of \`main()\`.

## The @weave.op Decorator: Automatic Tracing

The heart of Weave tracing is the \`@weave.op\` decorator. Apply it to any function whose inputs and outputs you want to capture:

\`\`\`python
import weave
from openai import OpenAI

weave.init("rag-chatbot")
client = OpenAI()

@weave.op
def answer_question(question: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a concise QA assistant."},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content

print(answer_question("What is regression testing?"))
\`\`\`

When this runs, Weave logs a trace: the function name, the \`question\` argument, the returned string, the wall-clock duration, and, because the OpenAI client is auto-patched, the nested model call with its token usage and cost. A clickable URL prints to your console pointing at the trace in the Weave UI.

The decorator composes naturally. Decorate every step in a pipeline and Weave builds a nested tree:

\`\`\`python
@weave.op
def retrieve(question: str) -> list[str]:
    # pretend this hits a vector store
    return ["Regression testing re-runs tests after changes.",
            "It catches newly introduced defects."]

@weave.op
def generate(question: str, context: list[str]) -> str:
    joined = "\\n".join(context)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"Answer using only:\\n{joined}"},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content

@weave.op
def rag_pipeline(question: str) -> str:
    context = retrieve(question)
    return generate(question, context)

rag_pipeline("What is regression testing?")
\`\`\`

In the UI this renders as a tree: \`rag_pipeline\` at the root, with \`retrieve\` and \`generate\` as children, and the raw OpenAI call nested under \`generate\`. You can click any node to see its exact inputs and outputs. \`@weave.op\` also works on async functions, class methods, and generators, so it fits real production code rather than just toy scripts.

## Building a weave.Evaluation

Tracing tells you what happened. Evaluation tells you how good it was, systematically, across many examples. The \`weave.Evaluation\` class ties together three pieces: a dataset of examples, a model or function to evaluate, and one or more scorers.

A dataset is just a list of dictionaries. Each row holds the inputs your function expects, plus any reference data your scorers need:

\`\`\`python
import weave
import asyncio

weave.init("rag-chatbot")

dataset = [
    {"question": "What is a flaky test?",
     "expected": "A test that passes and fails non-deterministically."},
    {"question": "What does CI stand for?",
     "expected": "Continuous Integration."},
    {"question": "What is a smoke test?",
     "expected": "A quick check that core functionality works."},
]
\`\`\`

Next, a scorer. A scorer is a function (or \`weave.Scorer\` subclass) that receives the example fields and the model output, and returns a score. Here is a simple substring-match scorer:

\`\`\`python
@weave.op
def contains_expected(expected: str, output: str) -> dict:
    hit = expected.lower() in output.lower()
    return {"match": hit}
\`\`\`

Now define the function under evaluation and wire it all together:

\`\`\`python
@weave.op
def model(question: str) -> str:
    return answer_question(question)

evaluation = weave.Evaluation(
    dataset=dataset,
    scorers=[contains_expected],
)

asyncio.run(evaluation.evaluate(model))
\`\`\`

Weave runs \`model\` against every row, applies \`contains_expected\` to each output, and aggregates the \`match\` field into a summary (for booleans, it reports the true rate). It prints a results URL. Open it and you get a table: one row per example, the input, the output, the per-example scores, and a summary at the top. Re-run after a prompt change and Weave lets you compare the two evaluations side by side.

Note the argument-name matching: scorers receive arguments by name from the dataset row and from the model output (which arrives as \`output\`). Name your scorer parameters to match your dataset keys and you avoid manual plumbing.

## Built-in Scorers vs Custom Scorers

Weave ships a library of pre-built scorers so you do not have to write everything from scratch. They live in \`weave.scorers\` and cover common evaluation needs.

| Scorer | What it measures | Needs a judge LLM? |
|---|---|---|
| \`ValidJSONScorer\` | Whether output is parseable JSON | No |
| \`ValidXMLScorer\` | Whether output is well-formed XML | No |
| \`EmbeddingSimilarityScorer\` | Cosine similarity to a reference | No (uses embeddings) |
| \`HallucinationFreeScorer\` | Whether the answer is grounded in context | Yes |
| \`ContextRelevancyScorer\` | Whether retrieved context is relevant | Yes |
| \`SummarizationScorer\` | Quality of a summary | Yes |
| \`OpenAIModerationScorer\` | Flags unsafe or policy-violating content | No (moderation API) |

Using a built-in scorer looks like this:

\`\`\`python
from weave.scorers import ValidJSONScorer

json_scorer = ValidJSONScorer()

evaluation = weave.Evaluation(
    dataset=dataset,
    scorers=[json_scorer, contains_expected],
)
\`\`\`

Custom scorers cover everything the built-ins do not. The simplest form is a plain decorated function returning a dict of metrics:

\`\`\`python
@weave.op
def answer_quality(expected: str, output: str) -> dict:
    exact = expected.strip().lower() == output.strip().lower()
    length_ok = 5 <= len(output.split()) <= 60
    return {"exact_match": exact, "length_ok": length_ok}
\`\`\`

Returning a dict (rather than a single value) lets one scorer report several metrics at once, all of which Weave aggregates separately. For stateful or configurable scorers, subclass \`weave.Scorer\` and implement a \`score\` method, which lets you pass thresholds or model names through \`__init__\`.

## LLM-as-Judge Scorers

For open-ended outputs, exact matching is useless. The output "Continuous Integration" and "It stands for Continuous Integration" are both correct, but a substring check on the first will reward only one of them. The standard answer is an LLM-as-judge: you ask a strong model to grade the output against criteria, and you turn its verdict into a score.

Here is a self-contained judge scorer using Anthropic's Claude as the grader:

\`\`\`python
import json
import weave
from anthropic import Anthropic

judge = Anthropic()

@weave.op
def llm_judge(question: str, expected: str, output: str) -> dict:
    prompt = f"""You are grading an answer for correctness.

Question: {question}
Reference answer: {expected}
Candidate answer: {output}

Is the candidate answer factually correct and complete relative to the
reference? Respond with strict JSON: {{"correct": true|false, "reason": "..."}}"""

    msg = judge.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text
    try:
        verdict = json.loads(raw)
    except json.JSONDecodeError:
        verdict = {"correct": False, "reason": "unparseable judge output"}
    return {"correct": bool(verdict["correct"]), "reason": verdict["reason"]}
\`\`\`

Because \`llm_judge\` is itself a \`@weave.op\`, every grading call is traced too. You can open the trace and read exactly why the judge marked an answer wrong, which is invaluable when you suspect the judge, not the model, is the problem. Plug it into an evaluation like any other scorer:

\`\`\`python
evaluation = weave.Evaluation(
    dataset=dataset,
    scorers=[llm_judge],
)
asyncio.run(evaluation.evaluate(model))
\`\`\`

A few practical tips: use a strong model as the judge (a weak judge produces noisy scores), force structured output with a JSON instruction, always handle parse failures, and keep the judge prompt under version control because it is part of your evaluation contract. If you want to go deeper on judge design and metric selection, our [Ragas RAG evaluation metrics guide](/blog/ragas-rag-evaluation-metrics-complete-guide) covers the theory that underpins these scorers.

## The Weave UI: Traces, Comparisons, and Leaderboards

Code logs the data; the Weave UI is where you make sense of it. Three views matter most.

**Traces.** The trace view lists every call to your decorated functions. Click one and you see the full nested tree, the inputs and outputs at each level, latency, token counts, and dollar cost. You can filter by function name, search by content, and slice by time range. This is your debugger for production behavior: when a user reports a bad answer, find the trace and read exactly what the model saw and said.

**Comparisons.** When you run two evaluations, Weave lets you select both and view them side by side. You see per-metric deltas at the summary level and, crucially, a row-by-row diff so you can find the specific examples that regressed. This turns "the new prompt feels better" into "the new prompt improved exact-match from 72 percent to 81 percent but regressed on three multi-step questions."

**Leaderboards.** For ongoing projects, Weave can rank multiple models or prompt variants against a shared evaluation, producing a leaderboard. This is how you keep a running scoreboard as you try GPT-4o, Claude, and a fine-tuned model against the same dataset and scorers, with a single shareable URL the whole team can watch.

Every view is shareable by link, which replaces the usual ritual of pasting screenshots into Slack. Reviewers click through to the live data.

## Integrating with OpenAI and Anthropic

Weave auto-patches popular LLM SDKs the moment you call \`weave.init\`. You do not decorate the client; Weave intercepts its calls and logs them as traces, complete with token usage and cost.

OpenAI works out of the box:

\`\`\`python
import weave
from openai import OpenAI

weave.init("openai-demo")
client = OpenAI()

resp = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Name three QA metrics."}],
)
print(resp.choices[0].message.content)
\`\`\`

Anthropic is equally seamless:

\`\`\`python
import weave
from anthropic import Anthropic

weave.init("anthropic-demo")
client = Anthropic()

msg = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=200,
    messages=[{"role": "user", "content": "Name three QA metrics."}],
)
print(msg.content[0].text)
\`\`\`

In both cases, every model call appears as a trace in the UI with no decorator required. When you wrap these calls in your own \`@weave.op\` functions, the model call nests beneath your function, giving you both the high-level business logic and the low-level API call in one tree. Weave also integrates with frameworks like LangChain, LlamaIndex, and DSPy, so multi-component pipelines trace end to end.

## Running Weave Evaluations in CI

The real payoff is automated evaluation in continuous integration. You commit a prompt change, CI runs your Weave evaluation, and the build fails if a key metric drops below threshold. This catches regressions before they ship.

Wrap your evaluation in a script that asserts on the aggregated results:

\`\`\`python
# eval_ci.py
import asyncio
import weave

weave.init("rag-chatbot-ci")

dataset = [
    {"question": "What is a flaky test?",
     "expected": "A test that passes and fails non-deterministically."},
    {"question": "What does CI stand for?", "expected": "Continuous Integration."},
]

@weave.op
def contains_expected(expected: str, output: str) -> dict:
    return {"match": expected.lower() in output.lower()}

@weave.op
def model(question: str) -> str:
    return answer_question(question)

async def main():
    evaluation = weave.Evaluation(dataset=dataset, scorers=[contains_expected])
    results = await evaluation.evaluate(model)
    score = results["contains_expected"]["match"]["true_fraction"]
    print(f"match rate: {score:.2%}")
    assert score >= 0.8, f"Regression: match rate {score:.2%} below 80% gate"

if __name__ == "__main__":
    asyncio.run(main())
\`\`\`

Then a GitHub Actions workflow runs it on every pull request:

\`\`\`bash
# .github/workflows/eval.yml runs:
pip install weave openai
WANDB_API_KEY="$WANDB_API_KEY" OPENAI_API_KEY="$OPENAI_API_KEY" python eval_ci.py
\`\`\`

Store \`WANDB_API_KEY\` and \`OPENAI_API_KEY\` as encrypted repository secrets. The job posts a Weave URL in its logs so reviewers can inspect the full evaluation, while the \`assert\` enforces the quality gate. This pattern mirrors how teams gate code with unit tests; if you are new to that idea, our [pytest explainer](/blog/what-is-pytest-python-explained) covers the testing fundamentals that the assertion above builds on.

## Weave vs LangSmith vs MLflow

Weave is not the only LLM observability tool. The three names you will hear most are W&B Weave, LangSmith, and MLflow. Here is how they line up.

| Capability | W&B Weave | LangSmith | MLflow |
|---|---|---|---|
| Primary focus | LLM tracing and evaluation | LLM tracing and evaluation | Broad ML lifecycle, with LLM support |
| Tracing setup | \`@weave.op\` decorator, auto-patch SDKs | Decorator or callback handlers | \`mlflow.trace\` / autolog |
| Framework lock-in | None, framework-agnostic | Strong LangChain affinity, but usable standalone | None |
| Evaluation primitive | \`weave.Evaluation\` + scorers | \`evaluate()\` + evaluators | \`mlflow.evaluate()\` |
| LLM-as-judge | Built-in and custom scorers | Built-in LLM evaluators | Built-in and custom metrics |
| UI strength | Trace tree, comparisons, leaderboards | Trace inspection, datasets, annotation | Experiment tracking, model registry |
| Self-hosting | Yes (W&B Server) | Yes (enterprise) | Yes (fully open source) |
| Classical ML tracking | Via wandb | Limited | First-class |
| License model | Free tier + paid | Free tier + paid | Open source |

The short version: choose **Weave** if you want the smoothest decorator-based tracing, strong evaluation ergonomics, and you like the W&B ecosystem. Choose **LangSmith** if your stack is built on LangChain and you want the tightest integration with it. Choose **MLflow** if you need one tool that spans classical ML training and LLM work, or you require a fully open-source, self-hosted stack. Many teams run more than one, using MLflow for model training and Weave for the LLM layer. For a broader look at how dedicated eval frameworks compare, see our [DeepEval vs Ragas comparison](/blog/deepeval-vs-ragas-rag-evaluation-2026) and the [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026).

## Best Practices for Weave Evaluations

A few habits separate teams who get value from Weave from those who abandon it:

- **Decorate at the right granularity.** Put \`@weave.op\` on meaningful business functions (retrieve, generate, rerank), not on every tiny helper. You want a readable trace tree, not noise.
- **Version your datasets.** Treat your evaluation dataset as a fixture under source control. When it changes, your scores are no longer comparable, so make changes deliberate and visible.
- **Keep scorers deterministic where possible.** Use cheap, deterministic scorers (JSON validity, exact match, length) as fast gates, and reserve expensive LLM-judge scorers for the open-ended questions that truly need them.
- **Pin your judge model.** An LLM-as-judge is part of your measurement instrument. Pin its model and prompt so that a change in scores reflects a change in your app, not a silent change in the grader.
- **Gate CI on a metric, not a vibe.** Pick one or two headline metrics, set a threshold, and fail the build below it. Everything else is diagnostic.
- **Read the regressions.** When a comparison shows a drop, open the specific failing traces. The story is always in the individual examples, not the summary number.

## Frequently Asked Questions

### What is W&B Weave used for?

W&B Weave is used for tracing and evaluating LLM applications. You decorate functions with \`@weave.op\` to automatically log their inputs, outputs, latency, and cost, then use \`weave.Evaluation\` to score your model against a dataset with custom or built-in scorers. It also provides a web UI for inspecting traces, comparing experiments, and building leaderboards, making it a complete observability layer for generative AI.

### How do I install and initialize Weave?

Install Weave with \`pip install weave\`, then authenticate to Weights & Biases by running \`wandb login\` or setting the \`WANDB_API_KEY\` environment variable. In your code, call \`weave.init("your-project-name")\` exactly once near the start of your program. After that, any function decorated with \`@weave.op\` is traced automatically, and supported LLM clients like OpenAI and Anthropic are auto-patched so their calls are logged too.

### What does the @weave.op decorator do?

The \`@weave.op\` decorator marks a function for automatic tracing. Every time the function runs, Weave logs its arguments, return value, duration, and any nested decorated calls, building a hierarchical trace tree in the UI. It works on synchronous functions, async functions, methods, and generators. Decorating each step of a pipeline lets you see the full execution tree of an agent or RAG flow, with each model call nested under the function that triggered it.

### How do I write a custom scorer in Weave?

Write a custom scorer as a function decorated with \`@weave.op\` that accepts the relevant dataset fields plus the model \`output\` and returns a dictionary of metrics. For example, \`def my_scorer(expected, output): return {"match": expected in output}\`. Weave matches scorer parameters to dataset keys by name and aggregates each returned metric across the dataset. For stateful or configurable scorers, subclass \`weave.Scorer\` and implement a \`score\` method.

### Can I use Weave with OpenAI and Anthropic?

Yes. Weave auto-patches the OpenAI and Anthropic Python SDKs as soon as you call \`weave.init\`. Every model call is logged as a trace with token usage and cost, and no decorator is required on the client itself. When you wrap those calls inside your own \`@weave.op\` functions, the raw model call nests neatly under your business logic in the trace tree. Weave also integrates with LangChain, LlamaIndex, and DSPy.

### How is Weave different from LangSmith?

Both Weave and LangSmith trace and evaluate LLM apps, but Weave is fully framework-agnostic and centers on a simple \`@weave.op\` decorator plus a strong comparison and leaderboard UI from the Weights & Biases ecosystem. LangSmith has the tightest integration with LangChain, though it works standalone too. If your stack is built on LangChain, LangSmith fits naturally; if you want decorator-based tracing without framework ties, Weave is usually the smoother choice.

### Is W&B Weave free to use?

Weave has a free tier that is generous enough for individuals and small teams to trace and evaluate real applications. Paid plans add higher usage limits, team collaboration features, longer data retention, and enterprise controls. For organizations with strict data-residency requirements, Weave can run on W&B Server, the self-hosted deployment, so traces and evaluations never leave your infrastructure.

## Conclusion

W&B Weave turns LLM development from guesswork into measurement. With one call to \`weave.init\` and a sprinkling of \`@weave.op\` decorators, you get automatic, hierarchical tracing of your entire application. With \`weave.Evaluation\`, a dataset, and a few scorers, you get repeatable, comparable scores that tell you whether each change made things better or worse. Built-in scorers handle the common cases, custom scorers handle your domain, and LLM-as-judge scorers handle the open-ended outputs where exact matching fails. The UI makes all of it shareable, and a short CI script turns your evaluation into a quality gate that blocks regressions before they reach users.

Start small: add Weave to one function today, run one evaluation against ten examples, and open the trace. The feedback loop is immediate, and it compounds. Ready to build out your full evaluation stack? Explore the curated QA and LLM-evaluation skills on our [skills directory](/skills) and pair Weave with the frameworks covered in our [DeepEval vs Ragas guide](/blog/deepeval-vs-ragas-rag-evaluation-2026) to ship LLM features you can actually trust.
`,
};
