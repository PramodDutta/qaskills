import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LangSmith Evaluation Platform Complete Guide 2026',
  description:
    'Master LangSmith for LLM evaluation in 2026. Datasets, experiments, online evaluators, monitoring dashboards, tracing, and team workflows for LangChain and beyond.',
  date: '2026-05-09',
  category: 'AI Testing',
  content: `
# LangSmith Evaluation Platform Complete Guide 2026

LangSmith is LangChain's hosted platform for tracing, debugging, evaluating, and monitoring LLM applications. By 2026 it has matured into a comprehensive evaluation platform that supports any LLM application, not just LangChain ones. Teams use it for dataset versioning, experiment comparison, online evaluators on production traces, and historical quality dashboards. If you build any non-trivial LLM application, LangSmith is one of the platforms you will consider; this guide tells you what it does, when to choose it, and how to wire it into your workflow.

This guide covers every LangSmith capability that matters: datasets, experiments, evaluators, traces, online monitoring, alerts, and team workflows. We include code samples for both LangChain and non-LangChain applications. We compare LangSmith to alternatives (Weights and Biases, Arize, Helicone) and provide a setup checklist for new teams. By the end you should know exactly how to set up LangSmith for your application and how to use its features to improve quality continuously. Use this as a tactical guide; the LangSmith docs are comprehensive but heavy.

## Key Takeaways

- LangSmith provides hosted infrastructure for traces, datasets, evaluations, and dashboards across any LLM application.
- Native LangChain integration is one line; non-LangChain integration requires explicit trace logging.
- Online evaluators score production traces continuously and feed dashboards for trend tracking.
- Datasets are versioned; experiments compare across dataset and code versions.
- LangSmith is paid (per-trace pricing); for small teams the cost is moderate, for large teams it grows quickly.
- Best for teams already in the LangChain ecosystem or teams that want a turnkey evaluation platform.

---

## What LangSmith Provides

LangSmith is four products in one. The trace store captures every LLM call your application makes, with inputs, outputs, latency, and cost. The dataset store holds versioned test cases for repeatable evaluation. The experiment runner executes evaluations against datasets and tracks results over time. The monitoring dashboard surfaces quality metrics across production traffic.

The four products work together. Traces become datasets when you label good and bad examples. Datasets become experiments when you run evaluations. Experiments become baseline metrics when you ship to production. Production traces are sampled into online evaluators that update the dashboard. The loop closes; quality is continuously measured and improved.

---

## Setup and Authentication

\`\`\`bash
pip install langsmith
export LANGCHAIN_API_KEY=ls__...
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_PROJECT=my-app
\`\`\`

For LangChain applications, tracing is automatic. Every chain invocation logs to LangSmith without code changes.

For non-LangChain applications, wrap your LLM calls with the LangSmith SDK.

\`\`\`python
from langsmith import traceable
from openai import OpenAI

client = OpenAI()

@traceable
def answer_question(question: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": question}],
    )
    return response.choices[0].message.content

result = answer_question("What is the capital of France?")
\`\`\`

The traceable decorator records inputs, outputs, and metadata. Use it on any function you want to trace.

---

## Datasets

Datasets in LangSmith are versioned collections of test cases. Each example has an input, an optional expected output, and metadata.

\`\`\`python
from langsmith import Client

client = Client()
dataset = client.create_dataset("customer-support-v1")
client.create_example(
    inputs={"question": "How do I rotate my API key?"},
    outputs={"answer": "Visit Settings > API > Rotate."},
    dataset_id=dataset.id,
)
\`\`\`

Datasets are versioned automatically. When you add or remove examples, LangSmith tracks the version. Experiments record which dataset version they ran against, so you can compare runs even when the dataset changes.

You can convert traces to dataset examples. Sample 100 traces from production, label the good and bad outputs, and add them to a dataset. The dataset reflects real traffic.

---

## Experiments

An experiment is one run of an evaluation against a dataset. The experiment runs your application against every example, applies evaluators, and logs results.

\`\`\`python
from langsmith.evaluation import evaluate

def target(inputs):
    return {"answer": answer_question(inputs["question"])}

def correctness(run, example):
    return {"key": "correctness", "score": run.outputs["answer"] == example.outputs["answer"]}

results = evaluate(
    target,
    data="customer-support-v1",
    evaluators=[correctness],
    experiment_prefix="prompt-v2",
)
\`\`\`

Each experiment appears in the dashboard. You can compare two experiments side by side: pass rate, per-example differences, latency, and cost.

The experiment_prefix is a convenience for grouping related runs. All experiments with the same prefix appear together.

---

## Evaluators

LangSmith supports any LangChain evaluator, custom Python evaluators, and hosted reference evaluators.

\`\`\`python
from langchain.evaluation import load_evaluator
from langchain_openai import ChatOpenAI

judge = ChatOpenAI(model="gpt-4o", temperature=0)
correctness_evaluator = load_evaluator("labeled_criteria", criteria="correctness", llm=judge)

def langchain_evaluator(run, example):
    result = correctness_evaluator.evaluate_strings(
        prediction=run.outputs["answer"],
        reference=example.outputs["answer"],
        input=example.inputs["question"],
    )
    return {"key": "correctness", "score": result["score"], "comment": result.get("reasoning")}

results = evaluate(target, data="customer-support-v1", evaluators=[langchain_evaluator])
\`\`\`

Multiple evaluators on the same experiment produce multiple per-example scores. The dashboard shows each evaluator separately and aggregates pass rate per evaluator.

---

## Online Evaluators

Online evaluators run on production traces. They sample a percentage of traffic, apply evaluators, and feed scores to the dashboard.

\`\`\`python
client.create_rule(
    name="correctness-online",
    project_name="prod",
    evaluators=[langchain_evaluator],
    sampling_rate=0.1,
)
\`\`\`

Online evaluators turn LangSmith into a production monitoring platform. The dashboard shows quality over time, with alerts when scores drop.

Sampling rate controls cost. 10% sampling on a high-volume application produces enough data for trends without paying full eval cost on every trace.

| Sampling Rate | Use Case | Cost |
| --- | --- | --- |
| 1% | High-volume, trend monitoring | Low |
| 10% | Standard production monitoring | Medium |
| 100% | Compliance, audit | High |

---

## Traces

Every LLM call your application makes logs as a trace in LangSmith. Traces include the prompt, completion, latency, token count, cost, and any intermediate tool calls.

The trace view in the dashboard is the primary debugging tool. When a user reports an issue, find the trace, see exactly what the model received and returned, and diagnose.

Traces can be filtered by metadata: user ID, session ID, feature, date. Add metadata to your traces with the traceable decorator.

\`\`\`python
@traceable(metadata={"feature": "search", "user_tier": "pro"})
def search(query: str) -> list:
    ...
\`\`\`

For multi-step applications, traces nest. A parent span captures the top-level call; child spans capture the LLM calls and tool calls within. The dashboard shows the full tree.

---

## Alerts

LangSmith can alert when a metric drops below a threshold or when traces match a pattern.

\`\`\`python
client.create_alert(
    name="correctness-drop",
    project_name="prod",
    condition={
        "metric": "correctness",
        "operator": "<",
        "value": 0.85,
        "window": "1h",
    },
    notify=["email:oncall@example.com", "slack:#alerts"],
)
\`\`\`

Alerts integrate with email, Slack, and PagerDuty. Use them for the metrics that matter to your business: faithfulness for RAG, correctness for QA bots, refusal rate for assistants.

---

## Comparing Experiments

The dashboard's experiment comparison view shows two experiments side by side: per-example diff, aggregate pass rate, latency, and cost.

Use comparison when you change something and want to know if it helped: a new prompt, a new model, a new retriever. Run both versions against the same dataset, see the diff, ship the better one.

A common pattern is the regression check on every PR. Run a small evaluation on PR-time and compare to the latest main run. If the score drops, the PR fails CI.

---

## Team Workflows

LangSmith supports team workflows beyond solo use.

Comments on traces. Reviewers can annotate traces with comments and labels. Useful for tagging interesting failures for follow-up.

Datasets shared across the team. Each team member can contribute examples to the same dataset.

Experiments tagged with author. Filter experiments by who ran them.

Custom dashboards. Build views that show the metrics your team cares about.

| Role | Primary LangSmith Use |
| --- | --- |
| Developer | Debug traces, iterate on prompts |
| QA engineer | Build datasets, define evaluators |
| Product manager | Quality trends, user impact |
| On-call engineer | Investigate alerts, find failing traces |

---

## Pricing

LangSmith pricing is per-trace and per-evaluator-run. Pricing tiers cover hobby, team, and enterprise.

For small teams, the hobby and team tiers are affordable: tens to hundreds of dollars per month depending on usage. For large teams with millions of traces, enterprise pricing is required and costs scale.

The cost calculation:

Production traces logged.

Evaluator runs (online and experiments).

Storage for traces and datasets.

LangSmith bills monthly. Set quotas if you want to cap spending.

---

## Comparison to Alternatives

| Platform | Tracing | Datasets | Online Evals | Dashboards | Self-Host |
| --- | --- | --- | --- | --- | --- |
| LangSmith | Yes | Yes | Yes | Yes | Yes (enterprise) |
| Weights and Biases | Yes | Yes | Limited | Yes | Yes (enterprise) |
| Arize Phoenix | Yes | Yes | Yes | Yes | Yes (OSS) |
| Helicone | Yes | Limited | Limited | Yes | Yes (OSS) |
| Langfuse | Yes | Yes | Yes | Yes | Yes (OSS) |

LangSmith is the most LangChain-friendly. Phoenix and Langfuse are open-source alternatives. W&B is broader (covers traditional ML) and good for teams already on it. Helicone focuses on observability with lighter eval features.

---

## When to Choose LangSmith

Choose LangSmith if:

You build on LangChain. Integration is one line and the data types match.

You want a turnkey evaluation platform. Datasets, experiments, evaluators, and dashboards in one place.

You can afford the per-trace pricing. For most teams, the cost is reasonable.

Your team values cross-functional visibility. The dashboards are accessible to non-engineers.

Avoid LangSmith if:

You require self-hosting and are not on the enterprise tier. Open-source alternatives (Phoenix, Langfuse) self-host more easily.

You have very high volume and pricing becomes prohibitive.

You want maximum flexibility in dataset format. LangSmith's format is opinionated.

---

## Setup Checklist

For a new team adopting LangSmith:

Create an account and set environment variables.

Add the traceable decorator (non-LangChain) or set LANGCHAIN_TRACING_V2 (LangChain).

Create your first dataset from 50 production samples.

Define an evaluator (criteria, labeled_criteria, or custom).

Run an experiment and inspect results in the dashboard.

Set up an online evaluator with 10% sampling.

Configure an alert for the metric that matters most.

Add the dashboard URL to your team wiki.

---

## Common Pitfalls

Over-logging. Tracing every internal function call produces noise and inflates cost. Trace only the LLM calls and key business functions.

Stale datasets. A dataset that does not reflect current product behavior misleads. Refresh quarterly from production samples.

Untrusted evaluators. If the evaluator is not calibrated against human judgments, the scores are noise. Calibrate before relying.

Ignoring online metrics. Online evaluators run continuously but only matter if someone watches the dashboard. Assign an owner.

Mixing prod and test traces. Separate LANGCHAIN_PROJECT for prod and test environments. Otherwise dashboards conflate.

---

## Further Resources

- LangSmith documentation and tutorials.
- LangChain evaluators guide at /blog.
- Browse LLM evaluation skills at /skills.

---

## Conclusion

LangSmith provides the most turnkey LLM evaluation platform for teams on LangChain. Tracing, datasets, evaluators, dashboards, and online monitoring all in one product. The setup is fast, the integration is seamless, and the cross-functional dashboards make quality a shared concern. For teams that match the profile, LangSmith is a strong choice. For teams that need self-hosting or want lower cost, consider open-source alternatives. Browse [/skills](/skills) for related evaluation tools and the [/blog](/blog) for related guides.
`,
};
