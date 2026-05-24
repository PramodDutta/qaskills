import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Weights and Biases LLM Evals Complete Guide 2026',
  description:
    'Master Weights and Biases (W&B) for LLM evaluation in 2026. Weave tracing, Weave evals, experiment tracking, dataset versioning, and dashboards for LLM applications.',
  date: '2026-05-10',
  category: 'AI Testing',
  content: `
# Weights and Biases LLM Evals Complete Guide 2026

Weights and Biases is the platform that became indispensable for ML model training experiments. By 2026 its Weave product has matured into a first-class LLM observability and evaluation platform that competes head-to-head with LangSmith, Arize, and Helicone. Teams that already use W&B for their traditional ML workloads find Weave a natural extension; teams new to W&B find it a comprehensive platform that covers LLMs from prototype to production.

This guide covers everything you need to use W&B Weave for LLM evaluation in 2026: tracing setup, dataset versioning, evaluation runs, custom scorers, online monitoring, and comparison with alternatives. We include runnable Python samples and a setup checklist. By the end you should know whether W&B Weave fits your team and how to wire it into your stack. The guide assumes basic familiarity with W&B's training-side features but does not require deep expertise.

## Key Takeaways

- W&B Weave is the LLM evaluation product within the Weights and Biases platform; it integrates with the existing W&B account.
- Weave tracing captures every LLM call with one line of instrumentation; the resulting traces are searchable, versioned, and shareable.
- Weave evaluations run scoring functions over datasets and produce comparison dashboards.
- Custom scorers are simple Python functions; built-in scorers cover exact match, regex, model-graded, and embedding similarity.
- Integration with the broader W&B platform is the differentiator; teams using W&B for training get LLM eval in the same UI.
- Pricing is per-seat with usage tiers; the cost is comparable to LangSmith for typical teams.

---

## Why W&B for LLM Evals

If your team uses W&B for traditional ML training, the case is strong. Models you fine-tune in W&B Sweeps appear in the same UI as the LLM evaluation runs that test them. Datasets versioned in W&B Artifacts can serve both training and evaluation. The unified UI saves context switching and lets product, ML, and engineering teams collaborate on quality.

If your team does not use W&B, Weave still competes. The trace UI is fast, the evaluation API is clean, and the dashboards are mature. Compared to LangSmith, Weave is less LangChain-centric; compared to Arize Phoenix, Weave is more polished but paid; compared to Helicone, Weave does more eval and less raw observability.

---

## Installation

\`\`\`bash
pip install weave openai
export OPENAI_API_KEY=sk-...
\`\`\`

Sign up for a W&B account if you do not have one. The CLI handles authentication.

\`\`\`bash
wandb login
\`\`\`

Initialize Weave at the start of your application.

\`\`\`python
import weave
weave.init("my-llm-project")
\`\`\`

Once initialized, every OpenAI call (and many other LLM providers) is traced automatically.

---

## Tracing

Weave tracing captures LLM calls with their inputs, outputs, latency, cost, and metadata. The integration is automatic for OpenAI; for other providers, use the weave.op decorator.

\`\`\`python
import weave
from openai import OpenAI

client = OpenAI()
weave.init("my-llm-project")

@weave.op()
def answer_question(question: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": question}],
    )
    return response.choices[0].message.content

result = answer_question("What is the capital of France?")
\`\`\`

The decorator wraps the function and logs the call to Weave. The Weave UI shows a tree of operations: which functions called which, how long each took, and what the inputs and outputs were.

For multi-step applications, the tree is hierarchical. A top-level handler that calls a RAG retriever and then an LLM shows as a parent op with two child ops.

---

## Datasets

Weave datasets are versioned collections of examples. You can create them programmatically or via the UI.

\`\`\`python
import weave

dataset = weave.Dataset(
    name="customer-support-v1",
    rows=[
        {"question": "How do I rotate my API key?", "expected": "Visit Settings > API > Rotate."},
        {"question": "What's the upload limit?", "expected": "100 MB per file."},
    ],
)
weave.publish(dataset)
\`\`\`

Datasets are versioned. Each modification creates a new version, and evaluations record which version they ran against.

For larger datasets, load from CSV, JSONL, or HuggingFace datasets.

\`\`\`python
import weave
import pandas as pd

df = pd.read_csv("test_cases.csv")
dataset = weave.Dataset(name="customer-support-v1", rows=df.to_dict("records"))
weave.publish(dataset)
\`\`\`

---

## Evaluations

A Weave evaluation runs a function (your LLM application) over a dataset and applies scorers. The result is logged to W&B with per-example scores and aggregate metrics.

\`\`\`python
import weave
from weave import Evaluation

@weave.op()
def my_model(question: str) -> str:
    return answer_question(question)

@weave.op()
def correctness_scorer(expected: str, output: str) -> dict:
    return {"correct": expected.lower() in output.lower()}

dataset = weave.ref("customer-support-v1").get()

evaluation = Evaluation(
    dataset=dataset,
    scorers=[correctness_scorer],
)

results = await evaluation.evaluate(my_model)
print(results)
\`\`\`

The evaluation runs the model on every example, scores each output, and produces an aggregate result. The Weave UI shows the per-example breakdown with the inputs, outputs, scores, and any errors.

---

## Built-in Scorers

Weave includes built-in scorers for common cases.

\`\`\`python
from weave.scorers import (
    EmbeddingSimilarityScorer,
    RegexScorer,
    LLMJudgeScorer,
)

similarity = EmbeddingSimilarityScorer(model="text-embedding-3-small")
regex = RegexScorer(pattern=r"^[A-Z]{3}\\d{6}$")
judge = LLMJudgeScorer(
    model="gpt-4o",
    prompt="Score the response on correctness from 0 to 1.",
)
\`\`\`

Scorers compose. An evaluation can apply multiple scorers and the dashboard shows each separately.

| Built-in Scorer | Best For |
| --- | --- |
| ExactMatchScorer | Deterministic outputs |
| RegexScorer | Format validation |
| EmbeddingSimilarityScorer | Semantic similarity |
| LLMJudgeScorer | Subjective quality |
| FaithfulnessScorer | RAG groundedness |

---

## Custom Scorers

Any function that takes example fields and the model output and returns a dict is a valid scorer.

\`\`\`python
@weave.op()
def has_citation(output: str) -> dict:
    return {"has_citation": "[" in output and "]" in output}
\`\`\`

The dict keys appear as metrics in the dashboard. Multiple keys produce multiple metrics from one scorer.

Custom scorers integrate with Weave's tracing. If your scorer calls an LLM (model-graded), the judge call appears in the trace tree.

---

## Comparing Models

Weave makes side-by-side model comparison straightforward.

\`\`\`python
async def evaluate_model(name: str, model_fn):
    eval = Evaluation(name=name, dataset=dataset, scorers=[correctness_scorer])
    return await eval.evaluate(model_fn)

results_gpt4 = await evaluate_model("gpt-4o", model_gpt4)
results_claude = await evaluate_model("claude-3.5-sonnet", model_claude)
\`\`\`

The Weave UI shows both runs in the same dashboard with per-example diffs. You see which examples each model gets right or wrong, and which model wins overall.

---

## Production Tracing and Monitoring

For production, Weave traces sample at a configurable rate and feed dashboards.

\`\`\`python
import weave
weave.init("prod-app", capture_rate=0.1)
\`\`\`

The 10% sampling balances cost and signal. For high-volume applications, lower sampling; for low-volume, higher.

Dashboards show traces grouped by metadata, latency distributions, error rates, and any custom scorers running online.

Set up custom dashboards that show the metrics your team cares about. The dashboard URL is shareable; put it in your team wiki.

---

## Integration with Training

The W&B advantage shines when you train your own models. A fine-tune job in W&B Sweeps logs to the same project as the evaluation runs. You can:

Compare fine-tuned model vs base model on the same dataset.

Track quality through training (intermediate checkpoints evaluated).

Promote the best checkpoint to production based on eval scores.

For teams not training their own models, the integration is less critical. But for teams that fine-tune, the unified UI is a real win.

---

## Pricing

W&B pricing has free tier, team tier, and enterprise. The free tier covers small projects; team and enterprise add seats, storage, and SLA.

For LLM evals specifically:

Storage cost depends on trace volume.

Per-seat licensing depending on team size.

Enterprise tier for self-hosting and advanced security.

Most teams find W&B competitive with LangSmith on price. Compare both for your specific volume.

---

## Comparison to Alternatives

| Platform | Tracing | Datasets | Online Evals | Dashboards | Training Integration |
| --- | --- | --- | --- | --- | --- |
| W&B Weave | Yes | Yes | Yes | Yes | Native |
| LangSmith | Yes | Yes | Yes | Yes | Limited |
| Arize Phoenix | Yes | Yes | Yes | Yes | Limited |
| Helicone | Yes | Limited | Limited | Yes | None |
| Langfuse | Yes | Yes | Yes | Yes | None |

W&B's training integration is unique. If you fine-tune, W&B is the natural choice. If you only use API models, the choice is closer.

---

## When to Choose W&B

Choose W&B if:

You already use W&B for ML training. Unified UI for training and eval.

You fine-tune models and want eval tied to checkpoints.

You want a mature, polished platform with strong dashboards.

You can afford per-seat pricing.

Avoid W&B if:

You are deeply committed to LangChain and want native integration; LangSmith is more LangChain-friendly.

You require open-source self-hosting; Langfuse or Phoenix are better.

You have very tight cost constraints.

---

## Setup Checklist

For a new team adopting W&B Weave:

Create a W&B account and project.

Install weave SDK and initialize at app startup.

Add weave.op decorators to your LLM functions.

Verify traces appear in the Weave UI.

Create a dataset from 50 production samples.

Define one scorer (exact match or LLM judge).

Run an evaluation and inspect results.

Set up production sampling with capture_rate.

Configure a custom dashboard.

Add the dashboard URL to your team wiki.

---

## Common Patterns

Pattern 1: per-PR evaluation. Run the eval on every PR against a small dataset. Fail CI if scores drop.

Pattern 2: production drift detection. Compare current week's online scores to last week's. Alert on drift.

Pattern 3: model comparison. Before switching models, run the eval on both. Use the diff to inform the decision.

Pattern 4: prompt iteration. Each prompt version gets its own evaluation run. Compare runs side by side.

---

## Common Pitfalls

Over-instrumenting. Decorating every internal function produces noisy traces. Decorate at meaningful boundaries.

Skipping dataset versioning. Modifying a dataset without versioning makes historical runs meaningless. Always version.

Untrusted scorers. Calibrate scorers against human judgments before relying on the scores.

Sampling too low. 1% sampling on a low-volume app produces noisy dashboards. Sample at least 10% for trends.

Ignoring the dashboards. The data is collected but if nobody looks at the dashboard, it does not improve quality. Make dashboards visible.

---

## Migration from Other Platforms

If you currently use LangSmith and want to move:

Datasets export to JSONL; Weave imports JSONL.

Evaluators rewrite as Weave scorers. The API is similar but not identical.

Traces do not migrate; you start fresh.

The migration takes a day or two for a typical team. The risk is gaps in historical data; plan for the discontinuity.

---

## Further Resources

- Weave documentation in the W&B docs portal.
- LangSmith comparison guide at /blog.
- Browse LLM evaluation skills at /skills.

---

## Conclusion

W&B Weave is a strong LLM evaluation platform especially for teams that already use W&B for training. The integration is seamless, the dashboards are polished, and the scorer API is clean. For teams new to W&B, Weave still competes well on its own merits. Set up tracing, build a dataset, define scorers, and integrate into CI. Browse [/skills](/skills) for more evaluation tools and the [/blog](/blog) for related guides.
`,
};
