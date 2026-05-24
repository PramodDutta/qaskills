import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'TruLens LLM Evaluation Framework Complete Guide 2026',
  description:
    'Master TruLens for LLM evaluation in 2026. Feedback functions, the RAG triad, multi-turn evaluation, dashboards, and integration with LangChain and LlamaIndex.',
  date: '2026-05-13',
  category: 'AI Testing',
  content: `
# TruLens LLM Evaluation Framework Complete Guide 2026

TruLens is the open-source LLM evaluation framework from TruEra, focused on the concept of feedback functions: programmatic checks that score LLM outputs along quality dimensions. By 2026 TruLens is the framework of choice for teams that want maximum flexibility in defining quality. The framework popularized the RAG triad (context relevance, groundedness, answer relevance) which has become standard vocabulary in the RAG evaluation space.

This guide covers TruLens end to end: installation, feedback functions, the RAG triad, multi-turn evaluation, integration with LangChain and LlamaIndex, dashboards, and how TruLens compares to Ragas, OpenAI Evals, and other frameworks. Python samples cover every key API. By the end you should be able to instrument any LLM application with TruLens and use the resulting feedback to improve quality. The guide assumes basic Python familiarity and an existing LLM application.

## Key Takeaways

- TruLens centers on feedback functions, customizable programmatic checks that score LLM outputs.
- The RAG triad (context relevance, groundedness, answer relevance) is TruLens's signature methodology.
- Feedback functions can use any provider as a judge: OpenAI, Anthropic, HuggingFace, even local models.
- The dashboard provides per-record scores, aggregate trends, and the ability to drill into failing examples.
- Integration with LangChain, LlamaIndex, and arbitrary Python is supported via context managers.
- TruLens excels at custom feedback dimensions; out of the box it has fewer built-in metrics than Ragas.

---

## Why TruLens

TruLens differentiates on flexibility. Other frameworks ship a fixed set of metrics; TruLens ships a feedback function system that lets you define any metric. The same framework that scores faithfulness for a RAG app can score code quality for a code-gen app or accuracy for a math tutor.

This flexibility is a tradeoff. Teams that want plug-and-play metrics may prefer Ragas (for RAG specifically) or LangChain evaluators (for LangChain integration). Teams that want to define custom quality dimensions in Python prefer TruLens.

The RAG triad popularized by TruLens has become standard. Even teams that do not use TruLens often think in those terms: context relevance, groundedness, answer relevance.

---

## Installation

\`\`\`bash
pip install trulens openai
export OPENAI_API_KEY=sk-...
\`\`\`

Optional extras for specific providers:

\`\`\`bash
pip install trulens-providers-openai trulens-providers-huggingface trulens-providers-cortex
\`\`\`

Initialize TruLens at the start of your application.

\`\`\`python
from trulens.core import TruSession

session = TruSession()
\`\`\`

This creates a local SQLite database to store records and feedback. For production, configure a Postgres backend.

---

## Feedback Functions

A feedback function is a Python function that takes inputs and returns a score. TruLens provides a standard library plus a system for custom functions.

\`\`\`python
from trulens.core.feedback import Feedback
from trulens.providers.openai import OpenAI

provider = OpenAI(model_engine="gpt-4o")

f_relevance = Feedback(provider.relevance).on_input_output()
\`\`\`

The Feedback object wraps a callable. The on_input_output() chain tells TruLens to apply the function to the input and output of each record.

Custom feedback functions:

\`\`\`python
def has_citation(output: str) -> float:
    return 1.0 if "[" in output and "]" in output else 0.0

f_citation = Feedback(has_citation).on_output()
\`\`\`

Any function that returns a float between 0 and 1 is a valid feedback function. TruLens calls the function on every record and stores the score.

---

## The RAG Triad

The RAG triad measures three dimensions of RAG quality.

\`\`\`python
from trulens.core.feedback import Feedback
from trulens.providers.openai import OpenAI

provider = OpenAI(model_engine="gpt-4o")

# Context relevance: are retrieved chunks relevant to the question?
f_context_relevance = (
    Feedback(provider.context_relevance, name="Context Relevance")
    .on_input()
    .on(context_selector)
    .aggregate(np.mean)
)

# Groundedness: is the answer supported by the context?
f_groundedness = (
    Feedback(provider.groundedness_measure_with_cot_reasons, name="Groundedness")
    .on(context_selector.collect())
    .on_output()
)

# Answer relevance: does the answer address the question?
f_answer_relevance = (
    Feedback(provider.relevance, name="Answer Relevance")
    .on_input_output()
)

feedbacks = [f_context_relevance, f_groundedness, f_answer_relevance]
\`\`\`

The context_selector is a JSON path that points TruLens at the retrieved chunks within your application's data structure. TruLens supports complex selectors for nested data.

The triad covers the three failure modes of a RAG system: bad retrieval, bad grounding, irrelevant answers. Together they give a complete picture of RAG quality.

---

## Recording

Wrap your application to record inputs, outputs, and intermediate state.

\`\`\`python
from trulens.apps.langchain import TruChain

tru_chain = TruChain(
    my_langchain_chain,
    app_id="customer-support-v1",
    feedbacks=feedbacks,
)

with tru_chain as recording:
    response = my_langchain_chain.invoke({"question": "How do I rotate my API key?"})
\`\`\`

The recording captures the question, the retrieved contexts, the generated answer, and applies all feedback functions. Results stream to the TruLens dashboard.

For non-LangChain applications, use TruCustomApp or TruBasicApp.

\`\`\`python
from trulens.apps.custom import TruCustomApp

class MyApp:
    @instrument
    def retrieve(self, query: str) -> list[str]:
        ...

    @instrument
    def generate(self, query: str, contexts: list[str]) -> str:
        ...

    @instrument
    def query(self, q: str) -> str:
        contexts = self.retrieve(q)
        return self.generate(q, contexts)

app = MyApp()
tru_app = TruCustomApp(app, app_id="custom-v1", feedbacks=feedbacks)

with tru_app as recording:
    response = app.query("How do I rotate my API key?")
\`\`\`

---

## Dashboard

Launch the TruLens dashboard.

\`\`\`python
from trulens.dashboard import run_dashboard

run_dashboard()
\`\`\`

The dashboard opens in your browser (default port 8484). Views include:

App leaderboard: compare all your apps by feedback scores.

Records: list of all recorded interactions with scores per feedback.

Evaluation: drill into a single record to see the full trace and feedback scoring.

Quality vs cost: scatterplot of feedback scores against latency and cost.

The dashboard is the primary review interface. Most teams put the URL in their wiki and check it daily.

---

## Multi-Turn Evaluation

For multi-turn conversations and agents, TruLens records the full trajectory.

\`\`\`python
from trulens.apps.custom import TruCustomApp

@instrument
def chat(self, message: str, history: list[dict]) -> str:
    # ...
    return response

# Each turn is recorded separately but linked by app_id
\`\`\`

The dashboard shows multi-turn conversations as threads. Feedback applies per turn; you can also define aggregate feedback that runs over the full conversation.

---

## Providers

TruLens supports many providers for the judge model.

\`\`\`python
from trulens.providers.openai import OpenAI
from trulens.providers.huggingface import Huggingface
from trulens.providers.cortex import Cortex
from trulens.providers.litellm import LiteLLM

openai_provider = OpenAI(model_engine="gpt-4o")
hf_provider = Huggingface()
cortex_provider = Cortex(model_engine="llama3.1-70b")
litellm_provider = LiteLLM(model_engine="claude-3.5-sonnet")
\`\`\`

The LiteLLM provider gives access to dozens of LLMs through a single interface. Use a strong judge (GPT-4 class or equivalent) for reliable feedback.

| Provider | Strength |
| --- | --- |
| OpenAI | Default, well-tested |
| Anthropic via LiteLLM | Equivalent to OpenAI |
| Huggingface | Open-source judges |
| Cortex (Snowflake) | Enterprise data isolation |
| AWS Bedrock | AWS-native |

---

## Aggregating Feedback

Aggregate feedback over multiple records by mean, median, percentile, or custom aggregator.

\`\`\`python
import numpy as np

f_groundedness = (
    Feedback(provider.groundedness_measure)
    .on(context_selector.collect())
    .on_output()
    .aggregate(np.mean)
)
\`\`\`

Aggregation matters for retrieval-related feedback because each query has multiple retrieved chunks. The aggregator decides how to combine per-chunk scores into a single per-query score.

---

## Comparison to Alternatives

| Framework | Custom Feedback | Built-in Metrics | Dashboard | LangChain Integration |
| --- | --- | --- | --- | --- |
| TruLens | Yes (core feature) | Limited | Yes | Native |
| Ragas | Custom metrics | Comprehensive | Via export | Adapter |
| OpenAI Evals | Yes | Comprehensive | Yes | Adapter |
| Phoenix | Yes | Comprehensive | Yes | Yes |
| LangChain Evaluators | Yes | Comprehensive | Via LangSmith | Native |

TruLens wins on flexibility. Ragas wins on out-of-the-box RAG metrics. Both can complement each other.

---

## When to Choose TruLens

Choose TruLens if:

You want maximum flexibility in defining quality.

The RAG triad methodology fits your application.

You build on LangChain or LlamaIndex.

You want a self-hosted, open-source platform.

Avoid TruLens if:

You want ready-to-use RAG metrics with no configuration; Ragas is faster to start.

You build agents with complex tool calls; OpenAI Evals has better agent support.

You need a managed service; TruLens is open source and self-hosted only.

---

## Production Setup

For production, configure persistent storage and run the dashboard as a service.

\`\`\`python
from trulens.core import TruSession

session = TruSession(
    database_url="postgresql://user:pass@host/trulens_db",
)
\`\`\`

The Postgres backend supports concurrent writes and survives restarts.

Run the dashboard as a long-running process behind a reverse proxy. Configure authentication via your proxy.

---

## CI Integration

Run feedback evaluation in CI on every PR.

\`\`\`python
# test_quality.py
import pytest
from trulens.core import TruSession

THRESHOLDS = {"Context Relevance": 0.7, "Groundedness": 0.85, "Answer Relevance": 0.8}

def test_quality():
    session = TruSession(database_url=":memory:")
    # ... run app with TruLens
    leaderboard = session.get_leaderboard(app_ids=["customer-support-v1"])
    for metric, threshold in THRESHOLDS.items():
        assert leaderboard[metric].mean() >= threshold
\`\`\`

The in-memory database avoids polluting your production trulens DB. Use a fresh DB per CI run.

---

## Common Patterns

Pattern 1: RAG triad as default. Every RAG app starts with the three triad feedbacks. Add custom feedbacks as needed.

Pattern 2: per-app feedback. Different apps need different feedbacks. A summarization app needs conciseness; a translation app needs fluency.

Pattern 3: feedback evolution. Start with a few feedbacks; add more as you find failure modes.

Pattern 4: dashboard-driven reviews. Weekly team review of the dashboard. Top failing records get triaged.

---

## Common Pitfalls

Weak judge. Using GPT-3.5 or weaker for feedback judges produces noisy scores. Use GPT-4 class.

Vague feedback definitions. A feedback prompt like "is the response good?" produces noise. Define criteria.

Untrusted scores. Calibrate feedback functions against human judgments before trusting.

Ignoring the dashboard. Data is collected but if nobody looks, it does not help.

Mixing dev and prod. Separate sessions for dev and prod; mixing pollutes both.

---

## Migrating from Other Frameworks

If you currently use Ragas and want to move to TruLens:

The RAG triad in TruLens covers similar dimensions to Ragas's faithfulness, context relevance, and answer relevance.

Custom Ragas metrics rewrite as TruLens feedback functions.

Dataset formats convert easily.

If you currently use TruLens and want to move to Ragas:

Ragas has more built-in RAG metrics out of the box.

Custom TruLens feedbacks become Ragas custom metrics.

The migration is straightforward for standard RAG metrics; custom feedbacks need rewriting.

---

## Further Resources

- TruLens documentation and examples.
- Ragas comparison at /blog (LLM Evals Comparison guide).
- Browse LLM evaluation skills at /skills.

---

## Conclusion

TruLens is the framework of choice when flexibility matters more than out-of-the-box metrics. The feedback function system lets you define any quality dimension, the RAG triad provides a starting methodology, and the dashboard makes results visible to the team. For teams committed to LangChain or LlamaIndex who want to define custom quality dimensions, TruLens is a strong choice. Browse [/skills](/skills) for related evaluation tools and the [/blog](/blog) for deeper guides.
`,
};
