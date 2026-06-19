import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Deepchecks LLM Evaluation Guide 2026: Properties, Golden Sets, CI',
  description:
    'A complete guide to Deepchecks LLM Evaluation: built-in and custom properties, golden sets, LLM-as-judge, CI integration, and version comparison.',
  date: '2026-06-19',
  category: 'Guide',
  content: `
# Deepchecks LLM Evaluation Guide 2026: Properties, Golden Sets, and CI

Deepchecks LLM Evaluation has become one of the more practical open-source toolkits for teams that need to measure the quality of large language model applications without rebuilding an evaluation harness from scratch. While much of the LLM tooling ecosystem in 2026 focuses narrowly on a single dimension, such as retrieval-augmented generation faithfulness or jailbreak resistance, Deepchecks takes a property-based approach: every interaction your application produces is scored along a configurable set of measurable properties such as relevance, grounded-in-context, toxicity, fluency, reading ease, and sentiment. This gives you a multi-dimensional quality profile rather than a single opaque pass or fail.

This guide walks through the full Deepchecks LLM evaluation workflow as it stands in 2026. You will learn how to install and configure the \`deepchecks-llm-client\`, how to log interactions from your production or staging application, how built-in properties differ from custom properties, how to build a golden set with human annotations, how the LLM-as-a-judge mechanism scores subjective properties, how to wire evaluation into a continuous integration pipeline so regressions are caught on every pull request, and how to compare versions side by side. Every code sample is runnable Python that you can adapt to your own application. By the end you will be able to stand up a complete, automated LLM quality gate that produces actionable scores instead of vague impressions.

If you are evaluating retrieval pipelines specifically, you may also want to read our [complete guide to Ragas RAG evaluation metrics](/blog/ragas-rag-evaluation-metrics-complete-guide) and our [DeepEval vs Ragas comparison](/blog/deepeval-vs-ragas-rag-evaluation-2026), since Deepchecks, DeepEval, and Ragas are frequently used together in production stacks.

## Why Property-Based LLM Evaluation Matters

Traditional software testing relies on deterministic assertions: given an input, the output either equals the expected value or it does not. Language models break this model because their outputs are non-deterministic, open-ended, and judged on dimensions that resist exact matching. A response can be factually correct but rude, fluent but irrelevant, or grounded in the provided context but barely readable. A single boolean cannot capture this.

Deepchecks responds with properties. A property is a named, numeric (or categorical) measurement applied to each interaction. Relevance measures how well the response addresses the user's input. Grounded-in-context measures whether the answer is supported by the retrieved documents. Toxicity flags harmful language. Fluency and reading ease measure linguistic quality. Sentiment captures emotional tone. Because each property is independent, you can set different thresholds for each, track them separately over time, and pinpoint exactly which dimension regressed when quality drops.

This decomposition is what makes Deepchecks valuable in CI. Instead of a brittle exact-match test, you assert that the mean grounded-in-context score across your golden set stays above 0.8, or that no interaction exceeds a toxicity score of 0.1. These assertions tolerate the natural variation of model output while still catching real regressions.

## Installing and Configuring the Deepchecks LLM Client

Begin by installing the client library into your project's virtual environment. The Deepchecks LLM evaluation client is distributed separately from the core tabular library.

\`\`\`bash
pip install deepchecks-llm-client
\`\`\`

Authentication uses an API key, which you generate from your Deepchecks application workspace and store as an environment variable. Never hard-code keys in source control.

\`\`\`bash
export DEEPCHECKS_LLM_API_KEY="your-api-key-here"
export DEEPCHECKS_LLM_HOST="https://app.llm.deepchecks.com"
\`\`\`

The central object is the client. You initialize it once and reference an application name and a version tag. The application groups related interactions, and the version lets you compare iterations of your prompt, model, or retrieval pipeline.

\`\`\`python
import os
from deepchecks_llm_client.client import DeepchecksLLMClient
from deepchecks_llm_client.data_types import EnvType

dc_client = DeepchecksLLMClient(
    api_token=os.environ["DEEPCHECKS_LLM_API_KEY"],
    host=os.environ.get("DEEPCHECKS_LLM_HOST"),
)

# Bind the client to a specific application and version.
dc_client.create_app("support-rag-assistant")
\`\`\`

A few configuration notes matter here. The \`EnvType\` enum distinguishes between \`PROD\`, \`EVAL\`, and \`PENTEST\` environments. Production interactions are logged continuously, while evaluation runs operate on a curated dataset. Keeping these separate prevents your golden-set scores from being diluted by live traffic.

## Logging Interactions

The heart of the workflow is logging interactions. An interaction is a single turn: the user input, the model output, and optionally the retrieved context documents and any metadata you want to attach. Deepchecks scores each logged interaction against the configured properties automatically.

\`\`\`python
from deepchecks_llm_client.data_types import LogInteractionType, EnvType

dc_client.log_interaction(
    app_name="support-rag-assistant",
    version_name="v1.2.0",
    env_type=EnvType.EVAL,
    user_interaction_id="ticket-90211",
    input="How do I reset my two-factor authentication device?",
    output=(
        "To reset 2FA, open Settings, choose Security, then "
        "select Reset Authenticator and confirm with a backup code."
    ),
    information_retrieval=[
        "Users can reset their authenticator under Settings > Security.",
        "A backup recovery code is required to confirm the reset.",
    ],
    full_prompt="System: You are a support assistant...\\\\nUser: How do I reset 2FA?",
)
\`\`\`

For higher throughput, batch your interactions. Logging hundreds or thousands one at a time over the network is slow; batching reduces overhead substantially.

\`\`\`python
from deepchecks_llm_client.data_types import LogInteractionType

interactions = []
for row in golden_dataset:
    interactions.append(
        LogInteractionType(
            user_interaction_id=row["id"],
            input=row["question"],
            output=run_my_app(row["question"]),
            information_retrieval=row["retrieved_docs"],
            expected_output=row["reference_answer"],
        )
    )

dc_client.log_batch_interactions(
    app_name="support-rag-assistant",
    version_name="v1.2.0",
    env_type=EnvType.EVAL,
    interactions=interactions,
)
\`\`\`

Note the \`expected_output\` field. When you provide a reference answer, Deepchecks can compute similarity-based properties that compare the actual output against the gold reference. Without it, the framework falls back to reference-free properties that judge the output on its own merits.

## Built-in Properties Reference

Deepchecks ships a library of built-in properties computed automatically on every interaction. Some use lightweight models or heuristics; the more subjective ones use an LLM-as-a-judge. The table below summarizes the core built-in properties and what each measures.

| Property | What it measures | Reference needed | Range |
|---|---|---|---|
| Relevance | How directly the output addresses the user input | No | 0 to 1 |
| Grounded in Context | Whether the output is supported by the retrieved documents | Retrieval required | 0 to 1 |
| Toxicity | Presence of harmful, offensive, or abusive language | No | 0 to 1 |
| Fluency | Grammatical correctness and natural phrasing | No | 0 to 1 |
| Reading Ease | How easy the text is to read (Flesch-style scale) | No | 0 to 100 |
| Sentiment | Emotional tone from negative to positive | No | -1 to 1 |
| Avoided Answer | Whether the model refused or dodged the question | No | Boolean |
| Similarity to Reference | Semantic closeness to the expected output | Reference required | 0 to 1 |

A typical evaluation activates a subset of these. For a retrieval-augmented support bot, grounded-in-context and relevance are the load-bearing properties, with toxicity acting as a safety floor. For a marketing-copy generator, fluency, reading ease, and sentiment carry more weight, while grounded-in-context may be irrelevant.

## Automatic Properties Versus Custom Properties

The built-in properties cover general quality dimensions, but real applications often have domain-specific requirements. Deepchecks lets you define custom properties that encode your own business logic. There are two flavors: deterministic custom properties computed by a Python function, and LLM-based custom properties evaluated by a judge model against a natural-language rubric.

A deterministic custom property is just a function that receives the interaction fields and returns a score. This is ideal for measurable, rule-based checks such as whether a response includes a required disclaimer or stays under a length limit.

\`\`\`python
from deepchecks_llm_client.data_types import CustomProperty, PropertyColumnType

def has_disclaimer(row) -> float:
    text = (row.get("output") or "").lower()
    return 1.0 if "not financial advice" in text else 0.0

disclaimer_property = CustomProperty(
    name="Contains Disclaimer",
    property_type=PropertyColumnType.NUMERIC,
    description="1 if the output includes the required compliance disclaimer.",
    aggregate_function="mean",
    score_function=has_disclaimer,
)

dc_client.set_custom_properties(
    app_name="support-rag-assistant",
    custom_properties=[disclaimer_property],
)
\`\`\`

For subjective custom criteria that cannot be captured by a regex or rule, you define an LLM-judge property. You supply a rubric in plain English, and Deepchecks prompts a judge model to score each interaction accordingly.

\`\`\`python
from deepchecks_llm_client.data_types import LLMProperty

helpfulness = LLMProperty(
    name="Actionable Helpfulness",
    description=(
        "Score 1 if the answer gives the user a concrete next step they "
        "can act on immediately. Score 0 if it is vague or merely "
        "restates the problem."
    ),
    output_type="numeric",
)

dc_client.set_custom_properties(
    app_name="support-rag-assistant",
    custom_properties=[helpfulness],
)
\`\`\`

Custom properties appear alongside built-in ones in every report and can be used in CI thresholds exactly like the built-ins. This blend of deterministic and LLM-based scoring is what lets a single Deepchecks evaluation cover both hard compliance rules and soft quality judgments.

## How LLM-as-a-Judge Works in Deepchecks

Subjective properties such as relevance, grounded-in-context, and your custom LLM properties rely on an LLM-as-a-judge. Rather than training a bespoke classifier, Deepchecks prompts a strong evaluator model with the interaction and a property-specific rubric, then parses a numeric or categorical score from the judge's response.

The advantage is flexibility: you can score nuanced qualities that no heuristic captures. The risk is judge bias and variance. Two practices keep judge scores reliable. First, calibrate the judge against your human annotations on the golden set and confirm the correlation is high before trusting it at scale. Second, keep rubrics narrow and unambiguous; a rubric that asks the judge to score five things at once produces noisier results than five single-focus properties.

\`\`\`python
# Configure which judge model Deepchecks uses for LLM-based properties.
dc_client.set_evaluation_config(
    app_name="support-rag-assistant",
    judge_model="gpt-4o-mini",
    judge_temperature=0.0,
)
\`\`\`

Setting the judge temperature to zero is important for reproducibility. A non-zero temperature makes the same interaction receive different scores across runs, which undermines regression detection.

## Building a Golden Set and Annotations

A golden set is a curated collection of representative inputs with known-good expected outputs and human annotations. It is the backbone of meaningful LLM evaluation: production logs tell you what is happening now, but a golden set lets you compare versions against a stable, agreed-upon benchmark.

Start small. Fifty to two hundred carefully chosen examples that span your most important use cases and your trickiest edge cases beat ten thousand random samples. Each example should include the input, an expected output, and the context documents your retrieval layer would supply.

\`\`\`python
golden_dataset = [
    {
        "id": "g-001",
        "question": "What is your refund window?",
        "reference_answer": "Refunds are available within 30 days of purchase.",
        "retrieved_docs": ["Our refund policy allows returns within 30 days."],
    },
    {
        "id": "g-002",
        "question": "Can I use the API on the free tier?",
        "reference_answer": "The free tier includes 1,000 API calls per month.",
        "retrieved_docs": ["Free tier users get 1,000 monthly API calls."],
    },
]
\`\`\`

Once interactions are logged against the golden set, human reviewers add annotations: a thumbs-up or thumbs-down, or a graded label, marking whether each output is acceptable. These human labels are the ground truth you use to validate that your automatic properties and LLM judge actually agree with human judgment.

\`\`\`python
from deepchecks_llm_client.data_types import AnnotationType

dc_client.annotate(
    app_name="support-rag-assistant",
    version_name="v1.2.0",
    user_interaction_id="g-001",
    annotation=AnnotationType.GOOD,
    reason="Accurate, grounded, and concise.",
)

dc_client.annotate(
    app_name="support-rag-assistant",
    version_name="v1.2.0",
    user_interaction_id="g-002",
    annotation=AnnotationType.BAD,
    reason="Hallucinated a call limit not present in the docs.",
)
\`\`\`

With annotations in place, Deepchecks reports the correlation between each property and the human labels, letting you trust the properties that track human judgment and discard the ones that do not.

## Running an Evaluation End to End

Putting the pieces together, a full evaluation run reads the golden set, executes your application against each input, logs the interactions, waits for property computation, and pulls the results back for assertion.

\`\`\`python
import time

def run_evaluation(version: str):
    interactions = []
    for row in golden_dataset:
        output = run_my_app(row["question"])
        interactions.append(
            LogInteractionType(
                user_interaction_id=row["id"],
                input=row["question"],
                output=output,
                information_retrieval=row["retrieved_docs"],
                expected_output=row["reference_answer"],
            )
        )

    dc_client.log_batch_interactions(
        app_name="support-rag-assistant",
        version_name=version,
        env_type=EnvType.EVAL,
        interactions=interactions,
    )

    # Allow asynchronous property computation to finish.
    time.sleep(15)

    results = dc_client.get_data(
        app_name="support-rag-assistant",
        version_name=version,
        env_type=EnvType.EVAL,
    )
    return results

results = run_evaluation("v1.2.0")
mean_grounded = results["Grounded in Context"].mean()
max_toxicity = results["Toxicity"].max()
print(f"Mean grounded-in-context: \${mean_grounded:.3f}")
print(f"Max toxicity: \${max_toxicity:.3f}")
\`\`\`

The returned data is a tabular structure (typically a pandas DataFrame) with one row per interaction and one column per property. From here, computing aggregate statistics and thresholds is ordinary data work.

## CI Integration: A Quality Gate on Every Pull Request

The real payoff of automated evaluation is catching regressions before they merge. Wrap the evaluation run in a test that fails the build when key properties fall below their thresholds, then run it in your CI pipeline.

\`\`\`python
# test_llm_quality.py
import pytest

THRESHOLDS = {
    "Grounded in Context": 0.80,
    "Relevance": 0.75,
    "Toxicity": 0.10,  # upper bound, lower is better
}

def test_llm_quality_gate():
    results = run_evaluation(version="ci-\${COMMIT_SHA}")

    grounded = results["Grounded in Context"].mean()
    relevance = results["Relevance"].mean()
    toxicity = results["Toxicity"].max()

    assert grounded >= THRESHOLDS["Grounded in Context"], (
        f"Groundedness regressed: \${grounded:.3f}"
    )
    assert relevance >= THRESHOLDS["Relevance"], (
        f"Relevance regressed: \${relevance:.3f}"
    )
    assert toxicity <= THRESHOLDS["Toxicity"], (
        f"Toxicity exceeded limit: \${toxicity:.3f}"
    )
\`\`\`

Wire it into GitHub Actions so the gate runs automatically.

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
          python-version: "3.12"
      - run: pip install deepchecks-llm-client pytest
      - name: Run LLM quality gate
        env:
          DEEPCHECKS_LLM_API_KEY: \${{ secrets.DEEPCHECKS_LLM_API_KEY }}
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
          COMMIT_SHA: \${{ github.sha }}
        run: pytest test_llm_quality.py -v
\`\`\`

Because each CI run uses a version name derived from the commit SHA, every pull request produces its own labeled evaluation in the Deepchecks dashboard, giving you a permanent audit trail of quality over time.

## Comparing Versions Side by Side

Deepchecks treats version comparison as a first-class feature. When you log interactions under different version names, the dashboard and API let you diff the property distributions between any two versions. This is how you answer questions such as "Did switching from GPT-4o to a smaller model hurt groundedness?" or "Did my new prompt improve relevance without raising toxicity?"

\`\`\`python
baseline = dc_client.get_data(
    app_name="support-rag-assistant",
    version_name="v1.1.0",
    env_type=EnvType.EVAL,
)
candidate = dc_client.get_data(
    app_name="support-rag-assistant",
    version_name="v1.2.0",
    env_type=EnvType.EVAL,
)

for prop in ["Grounded in Context", "Relevance", "Fluency"]:
    delta = candidate[prop].mean() - baseline[prop].mean()
    arrow = "up" if delta >= 0 else "down"
    print(f"\${prop}: \${delta:+.3f} (\${arrow})")
\`\`\`

A disciplined team gates promotion on these deltas: a candidate version may merge only if no critical property regresses by more than a small tolerance, and at least one property improves. This turns subjective "the new prompt feels better" debates into measurable decisions.

## Deepchecks Versus DeepEval Versus Ragas

Teams often ask how Deepchecks compares to the other two popular open-source evaluation frameworks. They overlap but emphasize different things. The table below summarizes the practical differences.

| Dimension | Deepchecks | DeepEval | Ragas |
|---|---|---|---|
| Primary focus | Multi-property quality monitoring | Unit-test-style LLM assertions | RAG pipeline metrics |
| Built-in properties / metrics | Relevance, grounded-in-context, toxicity, fluency, reading ease, sentiment | G-Eval, faithfulness, answer relevancy, hallucination | Faithfulness, context precision, context recall, answer relevancy |
| Custom scoring | Python and LLM-judge custom properties | Custom G-Eval and Python metrics | Custom metrics via prompt templates |
| Golden set + human annotation | First-class, with judge-vs-human correlation | Dataset and goldens supported | Test set generation supported |
| CI integration | Threshold assertions plus dashboard | Pytest-native | Pytest and CI friendly |
| Version comparison | Native side-by-side diffing | Manual via stored results | Manual via stored results |
| Best when | You want ongoing multi-dimensional quality monitoring | You want test-style pass/fail in CI | You are tuning a retrieval pipeline |

In practice many teams combine them: Ragas for deep retrieval diagnostics, DeepEval for crisp pass/fail unit tests, and Deepchecks for the continuous multi-property dashboard and version comparison. They are complementary rather than mutually exclusive. For a deeper look at the retrieval-focused tools, see our [DeepEval vs Ragas comparison](/blog/deepeval-vs-ragas-rag-evaluation-2026).

## Frequently Asked Questions

### Is Deepchecks LLM evaluation open source and free?

The Deepchecks LLM evaluation client library is open source, and the core property computation logic is available under a permissive license. The hosted dashboard offers a free tier suitable for small teams and evaluation experiments, with paid plans for higher interaction volumes, team collaboration, and enterprise support. You can run evaluations locally and self-host components depending on your plan.

### What is the difference between a property and a metric in Deepchecks?

In Deepchecks terminology, a property is a per-interaction measurement such as relevance or toxicity that is computed automatically on every logged output. A metric is typically an aggregate over many interactions, such as the mean groundedness across a golden set. Properties are the raw signal; the statistics you compute from them in CI are the metrics you assert against.

### How many examples do I need in my golden set?

Start with 50 to 200 high-signal examples that cover your most common use cases and your hardest edge cases. A small, carefully curated golden set with human annotations produces more actionable insight than thousands of random samples. You can expand it over time by promoting interesting production failures into the golden set.

### Can Deepchecks evaluate retrieval-augmented generation specifically?

Yes. The grounded-in-context property is purpose-built for RAG: it checks whether the output is supported by the documents you pass in the information_retrieval field. Combined with relevance, it gives you a strong picture of retrieval quality. Many teams pair Deepchecks with Ragas, which offers finer-grained context precision and recall metrics.

### Does the LLM-as-a-judge introduce bias into scores?

It can. Judge models carry their own biases and exhibit variance, especially at non-zero temperature. Mitigate this by setting judge temperature to zero, keeping each rubric narrow and single-focus, and validating the judge against human annotations on your golden set before trusting it at scale. If a property does not correlate with human labels, do not gate on it.

### How do I integrate Deepchecks into a CI pipeline?

Write a test that runs your application against the golden set, logs the interactions, retrieves the computed properties, and asserts that key aggregates stay within thresholds. Run that test in GitHub Actions or your CI of choice on every pull request, using a version name derived from the commit SHA so each run is recorded separately in the dashboard.

### Can I define custom evaluation criteria beyond the built-in properties?

Absolutely. Deepchecks supports two kinds of custom properties: deterministic ones computed by a Python function for rule-based checks like disclaimer presence or length limits, and LLM-judge properties evaluated against a natural-language rubric for subjective criteria. Custom properties appear in reports and CI thresholds exactly like the built-in ones.

### How does version comparison help me decide whether to ship a change?

By logging interactions under different version names, you can diff property distributions between any two versions. This lets you gate promotion on measurable deltas: a candidate version merges only if no critical property regresses beyond a small tolerance and at least one improves. It replaces subjective impressions with quantitative decisions.

## Conclusion

Deepchecks LLM Evaluation gives you a structured, multi-dimensional way to measure the quality of your language model application instead of relying on gut feeling. By logging interactions, scoring them against built-in and custom properties, building a golden set with human annotations, calibrating an LLM judge, and wiring threshold assertions into CI, you create an automated quality gate that catches regressions before they reach users and lets you compare versions with confidence.

The fastest path to a reliable evaluation stack is to combine the right tools for each job: property-based monitoring with Deepchecks, retrieval diagnostics with Ragas, and test-style assertions with DeepEval. Explore the full collection of QA and LLM-evaluation skills in our [skills directory](/skills) to find ready-made evaluation workflows you can drop into your own agents and pipelines today.
`,
};
