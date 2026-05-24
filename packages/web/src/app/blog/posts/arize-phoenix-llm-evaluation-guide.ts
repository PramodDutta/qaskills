import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Arize Phoenix LLM Evaluation Complete Guide 2026',
  description:
    'Master Arize Phoenix for LLM observability and evaluation. Tracing, datasets, evaluations, RAG metrics, embeddings analysis, and self-hosting in 2026.',
  date: '2026-05-12',
  category: 'AI Testing',
  content: `
# Arize Phoenix LLM Evaluation Complete Guide 2026

Arize Phoenix is the open-source LLM observability platform that runs locally on your laptop or in your cloud. By 2026 it has become the go-to choice for teams that want LangSmith-level features without sending data to a third party. Phoenix includes tracing, dataset management, evaluations, RAG-specific metrics, and embeddings analysis. The platform is built by Arize AI, which also offers a hosted enterprise product, but Phoenix itself is free, self-hostable, and powerful enough to be the only platform many teams need.

This guide covers Phoenix end to end: installation, OpenTelemetry-based tracing, dataset creation, running evaluations, RAG metrics, embeddings analysis, and integrating with your CI pipeline. We include Python samples for every step and a setup checklist for new teams. By the end you should be able to spin up Phoenix locally or in your cloud and use it to measure quality across LLM projects. The guide assumes basic Python familiarity and that you already use OpenAI or another LLM provider.

## Key Takeaways

- Phoenix is an open-source LLM observability and evaluation platform from Arize AI; it self-hosts in one command.
- Tracing uses OpenTelemetry, so any OTel-compatible LLM library plugs in without modification.
- Built-in evaluators cover faithfulness, relevance, hallucination, toxicity, and custom criteria.
- RAG metrics include context relevance, hallucination detection, and response faithfulness.
- Embeddings analysis surfaces clusters and outliers in your input distribution.
- For teams that need self-hosted observability and evaluation without subscription cost, Phoenix is the strongest option.

---

## Why Phoenix

The Arize Phoenix sweet spot is teams that want LangSmith-level functionality without:

Sending data to a third party.

Paying per-trace pricing at scale.

Committing to a specific LLM framework.

Phoenix runs on your laptop for development and in your cloud for production. It uses OpenTelemetry for tracing, so any instrumented LLM library works. The evaluation suite covers the common cases and is extensible.

Compared to other open-source options (Langfuse, Helicone), Phoenix leans more into evaluation. Compared to LangSmith and Weave, Phoenix is self-hosted and open source.

---

## Installation

\`\`\`bash
pip install arize-phoenix arize-phoenix-evals openai
\`\`\`

Launch Phoenix in a notebook or as a standalone service.

\`\`\`python
import phoenix as px
px.launch_app()
\`\`\`

This opens the Phoenix UI in your browser (default port 6006). For production, run Phoenix as a Docker container.

\`\`\`bash
docker run -p 6006:6006 -i -t arizephoenix/phoenix
\`\`\`

The container runs Phoenix on port 6006. Point your applications at it for tracing.

---

## Tracing

Phoenix uses OpenTelemetry-based tracing. Instrument your LLM calls with the Phoenix instrumenters.

\`\`\`python
from openinference.instrumentation.openai import OpenAIInstrumentor
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from phoenix.otel import register

tracer_provider = register(project_name="my-llm-app")
OpenAIInstrumentor().instrument(tracer_provider=tracer_provider)

from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)
\`\`\`

The instrumenter wraps the OpenAI client so every call is traced. Traces flow to the Phoenix UI.

For other providers (Anthropic, Cohere, Mistral), use the matching instrumenter from the openinference package.

For LangChain:

\`\`\`python
from openinference.instrumentation.langchain import LangChainInstrumentor

LangChainInstrumentor().instrument(tracer_provider=tracer_provider)
\`\`\`

For LlamaIndex:

\`\`\`python
from openinference.instrumentation.llama_index import LlamaIndexInstrumentor

LlamaIndexInstrumentor().instrument(tracer_provider=tracer_provider)
\`\`\`

The instrumenters cover the common LLM libraries. For custom code, use the OpenTelemetry SDK directly.

---

## Datasets

Phoenix datasets are versioned collections of inputs and expected outputs.

\`\`\`python
import phoenix as px
import pandas as pd

df = pd.DataFrame({
    "question": ["What is the capital of France?", "What is 7 * 8?"],
    "expected_answer": ["Paris", "56"],
})

dataset = px.Client().upload_dataset(
    dataset_name="qa-v1",
    dataframe=df,
    input_keys=["question"],
    output_keys=["expected_answer"],
)
\`\`\`

You can create datasets from traces. Sample 100 production traces, label the good ones, and convert to a dataset.

---

## Evaluations

A Phoenix evaluation runs a function over a dataset and applies evaluators.

\`\`\`python
from phoenix.experiments import run_experiment

def my_app(input):
    return {"answer": call_llm(input["question"])}

def correctness_eval(input, output):
    return output["answer"].lower() == input["expected_answer"].lower()

experiment = run_experiment(
    dataset=dataset,
    task=my_app,
    evaluators=[correctness_eval],
    experiment_name="prompt-v1",
)
\`\`\`

The experiment runs the task on every example, scores the output, and logs to the Phoenix UI. The dashboard shows per-example scores, aggregate metrics, and comparisons across experiments.

---

## Built-in Evaluators

Phoenix ships evaluators for the common LLM quality dimensions.

\`\`\`python
from phoenix.evals import (
    HALLUCINATION_PROMPT_TEMPLATE,
    QA_PROMPT_TEMPLATE,
    RELEVANCE_PROMPT_TEMPLATE,
    TOXICITY_PROMPT_TEMPLATE,
    llm_classify,
    OpenAIModel,
)

model = OpenAIModel(model="gpt-4o", temperature=0)

# QA correctness evaluator
qa_results = llm_classify(
    dataframe=df_with_outputs,
    template=QA_PROMPT_TEMPLATE,
    model=model,
    rails=["correct", "incorrect"],
)
\`\`\`

The built-in prompt templates handle the common eval prompts (QA correctness, hallucination, relevance, toxicity). Each runs the judge LLM and returns a label per example.

| Built-in Evaluator | Measures |
| --- | --- |
| QA_PROMPT_TEMPLATE | Correctness of answer to question |
| RELEVANCE_PROMPT_TEMPLATE | Document relevance to query |
| HALLUCINATION_PROMPT_TEMPLATE | Whether response is grounded |
| TOXICITY_PROMPT_TEMPLATE | Harmful content detection |
| SUMMARIZATION_PROMPT_TEMPLATE | Summary quality |
| HUMAN_VS_AI_PROMPT_TEMPLATE | Preference grading |

---

## RAG-Specific Metrics

Phoenix has built-in support for RAG evaluation.

\`\`\`python
from phoenix.evals import (
    HALLUCINATION_PROMPT_TEMPLATE,
    RAG_RELEVANCY_PROMPT_TEMPLATE,
    llm_classify,
    OpenAIModel,
)

# Evaluate document relevance per query
relevance = llm_classify(
    dataframe=df_with_retrievals,
    template=RAG_RELEVANCY_PROMPT_TEMPLATE,
    model=OpenAIModel(model="gpt-4o"),
    rails=["relevant", "irrelevant"],
)

# Evaluate hallucination per response
hallucination = llm_classify(
    dataframe=df_with_responses,
    template=HALLUCINATION_PROMPT_TEMPLATE,
    model=OpenAIModel(model="gpt-4o"),
    rails=["hallucinated", "factual"],
)
\`\`\`

The RAG evaluators integrate with the tracing data. Phoenix can pull retrieval spans from traces and run relevance evaluation automatically.

---

## Embeddings Analysis

Phoenix has an embeddings analysis view that visualizes input distributions, clusters them, and identifies outliers. Useful for understanding what your model is being asked.

\`\`\`python
from phoenix import Client

client = Client()
client.log_evaluations(...)
\`\`\`

The embeddings view shows a 2D projection (UMAP or t-SNE) of your queries colored by quality scores. Clusters of low-quality queries are visible as colored regions. Drill into a cluster to see the examples.

This view is particularly useful for finding systematic failure modes. If a cluster of queries is consistently scoring low, the cluster usually corresponds to a topic your retriever or model handles poorly.

---

## Online Evaluations

For production, run evaluators on a sample of live traces.

\`\`\`python
from phoenix.evals import run_evals
from phoenix.session.client import Client

client = Client()
traces = client.get_traces(project_name="prod", since="1d")
sample = traces.sample(0.1)

results = run_evals(
    dataframe=sample,
    evaluators=[hallucination_eval, relevance_eval],
)
client.log_evaluations(results)
\`\`\`

Schedule the evaluation script (cron, Airflow) to run periodically. Results feed back into the Phoenix UI for trend tracking.

---

## Self-Hosting

For production, run Phoenix in a Docker container or Kubernetes pod. The configuration is minimal.

\`\`\`yaml
# docker-compose.yml
services:
  phoenix:
    image: arizephoenix/phoenix:latest
    ports:
      - "6006:6006"
    environment:
      PHOENIX_WORKING_DIR: /data
    volumes:
      - phoenix-data:/data

volumes:
  phoenix-data:
\`\`\`

Persistent storage is required to keep traces and datasets across restarts. Configure backups for production.

---

## Integration with CI

Run experiments on every PR.

\`\`\`yaml
# .github/workflows/evals.yml
name: Phoenix Evals
on: [pull_request]
jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: python scripts/run_evals.py
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
\`\`\`

The script runs experiments and checks scores against thresholds. Exit code reflects pass/fail.

---

## Comparison to Alternatives

| Platform | Open Source | Self-Host | RAG Metrics | Embeddings Analysis |
| --- | --- | --- | --- | --- |
| Arize Phoenix | Yes | Yes | Yes | Yes |
| LangSmith | No | Enterprise | Via integrations | No |
| W&B Weave | Partial | Enterprise | Yes | No |
| Helicone | Yes | Yes | Limited | No |
| Langfuse | Yes | Yes | Yes | No |

Phoenix's embeddings analysis is unique among open-source platforms. The RAG-specific evaluators are mature and well-tested.

---

## When to Choose Phoenix

Choose Phoenix if:

You need self-hosted observability and evaluation.

You build RAG and want first-class RAG metrics.

You want to analyze input distributions with embeddings.

You prefer OpenTelemetry standards.

You want to avoid per-trace pricing.

Avoid Phoenix if:

You want a managed service with zero ops.

You need LangChain-specific deep integration.

Your team is not comfortable with Python.

---

## Setup Checklist

Install Phoenix and launch the UI.

Install the appropriate OTel instrumenters for your LLM libraries.

Verify traces appear in the UI.

Create a dataset from 50 production samples.

Run a built-in evaluator (QA, hallucination, relevance).

Inspect results in the experiment view.

Configure online evaluation for production sampling.

Self-host with Docker for production use.

Add the Phoenix URL to your team wiki.

---

## Common Patterns

Pattern 1: laptop development. Phoenix runs locally for fast iteration. Developers see their traces immediately.

Pattern 2: shared team instance. One Phoenix instance for the team, shared dashboards.

Pattern 3: prod monitoring. Phoenix runs in the cloud with online evaluators on 10% of traffic.

Pattern 4: embeddings-driven dataset growth. Identify clusters of failures via embeddings analysis, add representative examples to the dataset, re-evaluate.

---

## Common Pitfalls

Skipping the instrumenters. Manual span creation works but the auto-instrumenters cover more cases and require less code.

Forgetting persistent storage. Phoenix in Docker without a volume loses data on restart.

Untrusted evaluators. Calibrate built-in evaluator prompts on your data before trusting scores.

No backups. Trace and dataset storage is on you when self-hosting. Back up the volume.

Stale datasets. Update datasets from recent production traces; old datasets stop being representative.

---

## Further Resources

- Phoenix documentation at docs.arize.com/phoenix.
- OpenInference instrumenters on GitHub.
- Browse LLM evaluation skills at /skills.
- Related guides on /blog: LangSmith Platform Guide, W&B Weave Guide, Helicone Monitoring Guide.

---

## Conclusion

Arize Phoenix is the leading open-source LLM observability and evaluation platform in 2026. Self-hostable, OpenTelemetry-based, with rich evaluators and unique embeddings analysis. For teams that prioritize self-hosting and want a turnkey eval platform without subscription cost, Phoenix is the strongest choice. Start with local development, scale to cloud deployment, and integrate evaluations into CI. Browse [/skills](/skills) for related tools and the [/blog](/blog) for deeper guides.
`,
};
