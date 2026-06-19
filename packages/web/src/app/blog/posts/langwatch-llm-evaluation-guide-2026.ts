import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "LangWatch LLM Evaluation & Monitoring Guide (2026)",
  description: "LangWatch guide for 2026: evaluate and monitor LLM apps with tracing, observability, online and offline evaluations, and quality dashboards for production.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# LangWatch LLM Evaluation & Monitoring Guide (2026)

LangWatch is an LLM observability and evaluation platform. It does two related jobs: it **traces** your production LLM application — capturing every message, span, latency, token count, and cost — and it **evaluates** quality, both offline (running a dataset through your app and scoring it) and online (scoring a sample of live production traffic with automated checks and LLM-as-judge graders). The result is a dashboard where you can debug individual conversations, watch quality and cost trends over time, and get alerted when something regresses after a deploy. LangWatch instruments your app via an SDK and is designed to be framework-agnostic.

This guide explains LangWatch's tracing and evaluation model, shows realistic SDK usage for Python and TypeScript, and covers online vs offline evals, datasets, alerting, and CI. LangWatch ships updates frequently, so treat the code as accurate usage patterns and verify exact method names and decorators against the official LangWatch docs before pinning them.

## Observability and evaluation, together

Most LLM tooling falls into one of two camps: evaluation frameworks that score a fixed dataset offline, or observability tools that show you traces of production traffic. LangWatch deliberately combines both, because in an LLM application the two are inseparable:

- **You cannot improve what you cannot see.** Tracing surfaces the real prompts, completions, tool calls, latencies, and costs flowing through your app — the raw material for debugging and for building eval datasets.
- **You cannot trust a deploy without scoring it.** Evaluation — offline on a curated dataset and online on live traffic — tells you whether quality went up or down, not just whether the service stayed up.

LangWatch's premise is that the same quality definitions (your evaluators) should run in both places: offline to gate a release, and online to monitor it after it ships. For a conceptual grounding in how LLM scoring works across tools, see our [AI agent evaluation overview](/blog).

## Installation and setup

LangWatch provides SDKs for Python and TypeScript/JavaScript. Install the one matching your stack:

\`\`\`bash
# Python
pip install langwatch

# TypeScript / Node
npm install langwatch
\`\`\`

Authenticate with an API key from your LangWatch project, supplied via environment variable:

\`\`\`bash
export LANGWATCH_API_KEY="your_key_here"
\`\`\`

The SDK reads the key from the environment so it never appears in source. With that set, you instrument your application to start sending traces.

## Tracing your LLM app

The first thing to wire up is **tracing**. You annotate the functions that make up an LLM interaction so LangWatch records a trace — a tree of spans representing the LLM calls, retrieval steps, tool invocations, and any custom logic. In Python this is typically a decorator plus span context:

\`\`\`python
import langwatch

@langwatch.trace()
def answer_question(question: str) -> str:
    # This whole function becomes one trace
    context = retrieve_documents(question)        # captured as a span
    answer = call_llm(question, context)          # captured as a span
    return answer
\`\`\`

Each trace records the inputs, outputs, latency, token usage, and cost, and links the spans so you can see the full path of a single request. For a RAG app you can see the retrieved documents alongside the final answer; for an agent you can see each tool call. This is the debugging surface: when a user reports a bad answer, you open that trace and see exactly what the model received and produced.

A TypeScript sketch follows the same shape — you initialize the SDK and wrap or instrument the LLM calls so each request becomes a trace with nested spans. The key idea is consistent across languages: capture the whole interaction, not just the final string.

## Online evaluations (monitoring live traffic)

Once traces flow in, you attach **evaluators** that score them automatically. These **online evaluations** run continuously over a sample (or all) of production traffic and populate quality metrics on your dashboard. Typical evaluator categories include:

| Evaluator type | What it checks |
|---|---|
| Faithfulness / groundedness | Does the answer stick to the retrieved context (RAG hallucination check)? |
| Relevance | Is the answer on-topic for the question? |
| Safety / toxicity | Does the output contain unsafe or policy-violating content? |
| PII / data leakage | Does the response expose sensitive data? |
| Custom LLM-as-judge | Your own rubric graded by a model. |
| Deterministic checks | Format, schema, regex, presence of a citation. |

Online evaluation is what turns observability into monitoring: instead of only seeing that latency spiked, you see that faithfulness dropped from 0.9 to 0.7 after this morning's prompt change. Because scoring every single request with an LLM judge is expensive, online evals usually run on a configurable sample of traffic. You configure which evaluators run on which traces in the LangWatch project settings, mapping each evaluator to the fields it needs (input, output, retrieved context).

## Offline evaluations (testing before you ship)

**Offline evaluation** runs a curated **dataset** through your application (or a candidate prompt/model) and scores the outputs — the classic eval loop. This is how you decide whether a change is safe to deploy *before* it reaches users. Conceptually you provide a dataset of inputs (with optional expected outputs), a function that produces your app's output, and a set of evaluators, then LangWatch runs and scores them as an experiment you can compare against previous runs.

\`\`\`python
import langwatch

# Pseudocode-level pattern: confirm exact API in the docs
dataset = [
    {"input": "What is our refund policy?", "expected": "30-day full refund"},
    {"input": "How do I reset my password?", "expected": "Use the reset link"},
]

def run_app(input_text: str) -> str:
    return answer_question(input_text)

# Run each case through the app, score with evaluators, record as an experiment
results = langwatch.evaluate(
    dataset=dataset,
    task=run_app,
    evaluators=["faithfulness", "answer_relevance"],
)
\`\`\`

The value is the same as any test suite: a curated dataset encodes the behavior you care about, and comparing experiment scores across runs tells you whether a prompt or model change improved or regressed quality. When a production trace reveals a failure, you promote it into the dataset so it becomes a permanent regression case — the loop that connects monitoring back to testing.

## Datasets

Datasets in LangWatch are versioned collections of records used to drive offline evals. You build them three ways:

1. **From production traces** — select real, interesting, or failing interactions from your trace history and add them to a dataset. This is the most valuable source because it reflects real user behavior.
2. **From labeled examples** — upload a curated set of inputs and expected outputs.
3. **By annotation** — human reviewers label traces (good/bad, with notes), and those annotations seed a golden dataset.

This tight link between traces and datasets is a core LangWatch idea: production is your richest source of test cases, and the platform makes turning a real failure into a regression test a few clicks rather than a manual export.

## Dashboards and alerting

Because LangWatch is a monitoring platform, it surfaces **trends and alerts**, not just point-in-time scores. On the dashboard you can track:

- Average evaluator scores (faithfulness, relevance, safety) over time.
- Cost and token usage per day, per model, per feature.
- Latency percentiles.
- Volume and error rates.

You configure **alerts** so that when a metric crosses a threshold — say faithfulness drops below 0.8, or daily cost exceeds a budget — your team is notified. This is what makes LangWatch operationally useful: a prompt change that silently increases hallucinations shows up as a falling quality line and an alert, rather than as a slow trickle of user complaints. Compare LangWatch's combined observability-plus-eval model against other tools on our [comparison hub](/compare).

## CI integration

To gate releases on quality, run an offline evaluation in CI and fail the build when scores fall below a floor. A GitHub Actions step:

\`\`\`yaml
name: langwatch-eval
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install langwatch
      - name: Run offline eval
        run: python evals/run_eval.py
        env:
          LANGWATCH_API_KEY: \${{ secrets.LANGWATCH_API_KEY }}
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
\`\`\`

In \`run_eval.py\`, run the dataset through your app, collect the evaluator scores, and raise an error (non-zero exit) if an average score is below your threshold. Because the run is recorded in LangWatch, you also get a comparison against previous experiments to see exactly which cases regressed. Keep the CI dataset small and representative for speed, and run the full set on a schedule.

## Common errors and troubleshooting

- **No traces appear** — the API key is missing, or the trace decorator/instrumentation is not actually wrapping the LLM call. Confirm \`LANGWATCH_API_KEY\` is set and the decorated function is the one being executed.
- **Evaluator scores are missing for some traces** — the evaluator could not find the field it needs (e.g. retrieved context for a faithfulness check). Map the evaluator inputs correctly in project settings.
- **Online eval costs are high** — LLM-as-judge over every request is expensive. Lower the sampling rate so only a fraction of traffic is scored.
- **Flaky LLM-as-judge scores** — tighten the rubric, lower the judge temperature, and average multiple judgments for high-stakes evaluators.
- **Spans not nested correctly** — make sure inner LLM/tool calls run inside the traced function's context so they attach to the right trace.

## When to use LangWatch

Choose LangWatch when you want observability and evaluation in one platform — tracing to debug real conversations, offline evals to gate releases, and online evals plus alerting to monitor quality and cost in production. If you only need a code-first offline benchmark with no hosted monitoring, a lightweight eval framework is simpler; if you only need raw tracing without quality scoring, a generic observability tool may suffice. Many teams value LangWatch precisely because it spans the gap. Browse install-ready evaluation and monitoring skills for AI coding agents at [/skills](/skills).

## Frequently Asked Questions

### What is LangWatch used for?

LangWatch is an observability and evaluation platform for LLM applications. It traces production traffic — capturing prompts, completions, tool calls, latency, tokens, and cost — and evaluates quality both offline against a curated dataset and online against a sample of live traffic. The result is a dashboard for debugging individual conversations and monitoring quality and cost trends over time.

### What is the difference between online and offline evaluation in LangWatch?

Offline evaluation runs a curated dataset through your app and scores the outputs before you ship, so you can gate a release on quality. Online evaluation runs evaluators continuously over a sample of live production traffic to monitor quality after deploy. LangWatch is designed so the same evaluators can run in both modes, giving you a consistent definition of quality from CI to production.

### How does LangWatch tracing work?

You instrument your application — typically with a decorator or SDK wrapper — so each LLM interaction becomes a trace, which is a tree of spans representing the model calls, retrieval steps, and tool invocations. Each trace records inputs, outputs, latency, token usage, and cost. When a user reports a bad answer, you open that trace to see exactly what the model received and produced.

### Is LangWatch open source or paid?

LangWatch offers SDKs on npm and PyPI and has both open-source components and a hosted platform with usage-based plans. The exact split, free allowance, and pricing change over time, so check the official LangWatch site for current details. Note that LLM-as-judge evaluators also incur model-provider token costs separate from the platform itself.

### Can LangWatch detect hallucinations in a RAG app?

Yes. LangWatch provides faithfulness or groundedness evaluators that check whether an answer is supported by the retrieved context, which is the core hallucination signal for retrieval-augmented generation. Because traces capture the retrieved documents alongside the final answer, the evaluator can compare them, and you can run this check both offline on a dataset and online on live traffic with alerting.

### How do I turn a production failure into a regression test in LangWatch?

When a trace reveals a bad response, you select it from your trace history and add it to a dataset, optionally with the correct expected output. That dataset then drives offline evaluations, so the failing case becomes a permanent regression test that runs on every future change. This tight link between traces and datasets is a core LangWatch workflow connecting monitoring back to testing.
`,
};
