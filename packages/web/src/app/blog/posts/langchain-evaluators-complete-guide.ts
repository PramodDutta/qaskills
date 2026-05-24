import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LangChain Evaluators Complete Guide 2026',
  description:
    'Master LangChain evaluators in 2026. Complete guide to string evaluators, comparison evaluators, trajectory evaluators, custom evaluators, and integration with LangSmith for production tracking.',
  date: '2026-05-08',
  category: 'AI Testing',
  content: `
# LangChain Evaluators Complete Guide 2026

LangChain shipped its evaluator system to let teams measure the quality of chains, agents, and RAG pipelines without leaving the LangChain ecosystem. The evaluators integrate with LangSmith for production tracking, support both reference-free and reference-based evaluation, and cover string outputs, paired comparisons, and agent trajectories. If you build on LangChain, the evaluator module is the natural choice for quality measurement: it speaks the same data types as your chains and uses the same model wrappers.

This guide is a complete tour of LangChain evaluators in 2026. We cover the three evaluator categories (string, comparison, trajectory), every built-in evaluator type, custom evaluator authoring, the integration with LangSmith, and how LangChain evaluators compare to alternatives like Ragas and OpenAI Evals. Code samples are full Python that you can run as-is. By the end you should be able to instrument your LangChain application with comprehensive evaluation in an afternoon. Use this as a reference whenever you set up new LangChain evals.

## Key Takeaways

- LangChain ships three evaluator categories: string, comparison, and trajectory. Each targets a different evaluation need.
- String evaluators score a single output (criteria, embedding distance, JSON validity, regex, exact match, etc.).
- Comparison evaluators score two outputs against each other (pairwise preference, head-to-head).
- Trajectory evaluators score multi-step agent trajectories (tool-use correctness, step efficiency).
- All evaluators integrate with LangSmith for production monitoring, dataset versioning, and dashboards.
- Custom evaluators are simple to write by extending the base evaluator class.

---

## Why LangChain Evaluators

If your application is built on LangChain, using LangChain evaluators provides three concrete advantages. First, the data types match. Your chain produces a LangChain Run; the evaluator consumes a Run. No conversion required. Second, the LLM wrappers are the same. The evaluator uses the same ChatOpenAI or ChatAnthropic instance you already configured. Third, LangSmith integration is one line. Evaluations log to LangSmith automatically.

For non-LangChain applications, the evaluator module can still work but loses some of the seamlessness. In those cases, Ragas or OpenAI Evals may be a better fit. But within the LangChain ecosystem, the evaluators are the path of least resistance.

---

## Installation

\`\`\`bash
pip install langchain langchain-openai langsmith
export OPENAI_API_KEY=sk-...
export LANGCHAIN_API_KEY=ls__...  # for LangSmith integration
export LANGCHAIN_TRACING_V2=true
\`\`\`

The evaluator module is in langchain.evaluation. The base evaluators work without LangSmith, but you lose dashboards and dataset versioning. For serious use, LangSmith is recommended.

---

## String Evaluators

String evaluators score a single string output against a reference or a criterion. They are the most common evaluator type.

### Criteria evaluator

The criteria evaluator scores an output against a list of criteria using an LLM judge. Built-in criteria include conciseness, relevance, correctness, coherence, harmfulness, and helpfulness.

\`\`\`python
from langchain.evaluation import load_evaluator
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o", temperature=0)
evaluator = load_evaluator("criteria", criteria="conciseness", llm=llm)

result = evaluator.evaluate_strings(
    prediction="The capital of France is Paris, which is a city in Europe famous for many things including the Eiffel Tower.",
    input="What is the capital of France?",
)
print(result)
\`\`\`

The result is a dict with score (0 or 1) and reasoning. The judge LLM explains its decision, which helps debug grader behavior.

You can define custom criteria.

\`\`\`python
custom_criteria = {
    "professionalism": "Is the response written in a professional tone appropriate for customer service?"
}
evaluator = load_evaluator("criteria", criteria=custom_criteria, llm=llm)
\`\`\`

### Labeled criteria

Labeled criteria evaluators compare the prediction to a reference answer. Use this when you have ground truth.

\`\`\`python
evaluator = load_evaluator("labeled_criteria", criteria="correctness", llm=llm)
result = evaluator.evaluate_strings(
    prediction="The capital is Paris.",
    input="What is the capital of France?",
    reference="The capital of France is Paris.",
)
\`\`\`

The judge sees the reference and scores the prediction relative to it. Useful when paraphrase is acceptable but you want to catch wrong answers.

### Embedding distance

The embedding distance evaluator computes the cosine similarity between prediction and reference embeddings. The metric is a float between 0 and 1; closer to 1 means more similar.

\`\`\`python
from langchain.evaluation import load_evaluator

evaluator = load_evaluator("embedding_distance")
result = evaluator.evaluate_strings(
    prediction="Paris is the capital.",
    reference="The capital is Paris.",
)
\`\`\`

Embedding distance is fast and cheap. Use it as a pre-filter; if similarity is very low, the prediction probably needs review.

### String distance

The string distance evaluator uses edit distance metrics (Levenshtein, Damerau-Levenshtein, Jaro-Winkler, etc.). Useful for tasks where the output is a specific string with potential typos or variations.

\`\`\`python
evaluator = load_evaluator(
    "string_distance",
    distance="damerau_levenshtein",
)
\`\`\`

### JSON evaluators

For structured output, JSON evaluators check schema compliance and content equality.

\`\`\`python
from langchain.evaluation import JsonValidityEvaluator, JsonEqualityEvaluator

validity = JsonValidityEvaluator()
result = validity.evaluate_strings(prediction='{"name": "Paris"}')

equality = JsonEqualityEvaluator()
result = equality.evaluate_strings(
    prediction='{"name": "Paris"}',
    reference='{"name": "Paris"}',
)
\`\`\`

JsonSchemaEvaluator validates against a JSON Schema.

\`\`\`python
from langchain.evaluation import JsonSchemaEvaluator

evaluator = JsonSchemaEvaluator()
result = evaluator.evaluate_strings(
    prediction='{"name": "Paris"}',
    reference='{"type": "object", "required": ["name"]}',
)
\`\`\`

### Regex match

\`\`\`python
evaluator = load_evaluator("regex_match")
result = evaluator.evaluate_strings(
    prediction="Order ID: 12345",
    reference=r"Order ID: \\d+",
)
\`\`\`

### Exact match

\`\`\`python
evaluator = load_evaluator("exact_match")
result = evaluator.evaluate_strings(prediction="Paris", reference="Paris")
\`\`\`

| String Evaluator | Best For | Reference Required |
| --- | --- | --- |
| criteria | Quality dimensions | No |
| labeled_criteria | Reference comparison | Yes |
| embedding_distance | Semantic similarity | Yes |
| string_distance | Lexical similarity | Yes |
| json_validity | Structure check | No |
| json_equality | Exact JSON match | Yes |
| json_schema | Schema validation | Yes (schema) |
| regex_match | Pattern matching | Yes (pattern) |
| exact_match | Deterministic match | Yes |

---

## Comparison Evaluators

Comparison evaluators score two predictions against the same input. Useful for A/B testing prompts or models.

### Pairwise string

\`\`\`python
from langchain.evaluation import load_evaluator

evaluator = load_evaluator("pairwise_string", llm=llm)
result = evaluator.evaluate_string_pairs(
    prediction="The capital of France is Paris.",
    prediction_b="Paris is in France.",
    input="What is the capital of France?",
)
\`\`\`

The judge picks the better response. The result includes a score (A or B) and reasoning.

### Labeled pairwise

\`\`\`python
evaluator = load_evaluator("labeled_pairwise_string", llm=llm)
result = evaluator.evaluate_string_pairs(
    prediction="...",
    prediction_b="...",
    input="...",
    reference="...",
)
\`\`\`

The labeled variant uses a reference answer to bias the judge.

### Pairwise embedding distance

\`\`\`python
evaluator = load_evaluator("pairwise_embedding_distance")
\`\`\`

Computes embedding similarity between two predictions.

Pairwise evaluators are the foundation for preference learning and side-by-side comparisons. Useful when you want to know "which is better" rather than "is this good."

---

## Trajectory Evaluators

Trajectory evaluators score multi-step agent trajectories. They take the full sequence of tool calls and reasoning as input, not just the final answer.

### Trajectory evaluator

\`\`\`python
from langchain.evaluation import load_evaluator

evaluator = load_evaluator("trajectory", llm=llm)
result = evaluator.evaluate_agent_trajectory(
    prediction="The weather in Paris is sunny.",
    input="What's the weather in Paris?",
    agent_trajectory=[
        ("AgentAction(tool='weather_api', tool_input='Paris')", "sunny, 22 C")
    ],
)
\`\`\`

The judge scores whether the agent's trajectory is reasonable: were the tools necessary, were arguments correct, were the right number of steps taken.

For agent quality, trajectory evaluation is essential. A final answer of "the weather is sunny" looks good in a string evaluator but might come from an agent that called five wrong tools first.

---

## Custom Evaluators

Custom evaluators extend the base StringEvaluator or PairwiseStringEvaluator class. The contract is small.

\`\`\`python
from langchain.evaluation import StringEvaluator
from typing import Any, Optional

class HasCitationEvaluator(StringEvaluator):
    @property
    def requires_input(self) -> bool:
        return False

    @property
    def requires_reference(self) -> bool:
        return False

    @property
    def evaluation_name(self) -> str:
        return "has_citation"

    def _evaluate_strings(
        self,
        *,
        prediction: str,
        reference: Optional[str] = None,
        input: Optional[str] = None,
        **kwargs: Any,
    ) -> dict:
        has_citation = "Source:" in prediction or "[1]" in prediction
        return {"score": 1 if has_citation else 0}
\`\`\`

Custom evaluators integrate with LangSmith the same way as built-in evaluators. They appear in the dashboard with their evaluation_name.

---

## LangSmith Integration

LangSmith is where the LangChain evaluator system shines. With one line, evaluation results stream to a dashboard with historical trends, regression detection, and dataset versioning.

\`\`\`python
from langsmith import Client
from langsmith.evaluation import evaluate

client = Client()

def target_chain(inputs):
    return {"prediction": my_chain.invoke(inputs["question"])}

results = evaluate(
    target_chain,
    data="my-dataset",
    evaluators=[load_evaluator("criteria", criteria="conciseness", llm=llm)],
    experiment_prefix="prompt-v2",
)
\`\`\`

The evaluate function runs the chain against every example in the dataset, applies the evaluators, and logs results to LangSmith. The dashboard shows results grouped by experiment, with diff views between experiments.

Datasets in LangSmith are versioned. You can add, remove, or modify examples and the framework tracks which dataset version each experiment ran against. This avoids confusion when datasets change.

---

## Production Monitoring

LangSmith production monitoring tracks evaluator scores on real traffic. Configure online evaluators that run on every production trace.

\`\`\`python
from langsmith import Client

client = Client()
client.create_rule(
    name="conciseness-online",
    project_name="prod",
    evaluator_id="criteria-conciseness",
    sampling_rate=0.1,  # 10% of traces
)
\`\`\`

Online evaluators run on a sample of traces and feed scores to the dashboard. Set sampling rates to control cost: 10% is usually enough to detect regressions without paying full price.

Alerts fire when an online evaluator score drops below a threshold. The alert includes the failing trace so you can investigate.

---

## Comparison to Alternatives

| Framework | LangChain Integration | Reference-Free | Production Monitoring | Best For |
| --- | --- | --- | --- | --- |
| LangChain Evaluators | Native | Yes | Via LangSmith | Teams on LangChain |
| Ragas | Adapter | Yes | Via export | RAG-specific |
| OpenAI Evals | Adapter | Yes | Yes | Agents, broad coverage |
| TruLens | Adapter | Yes | Yes | Custom feedback functions |
| DeepEval | None | Yes | Via export | Pytest-native |

LangChain evaluators are the natural choice if your application is on LangChain. The integration is seamless and LangSmith provides excellent production tooling. For non-LangChain applications, the seamlessness is lost and other frameworks become competitive.

---

## Common Patterns

Pattern 1: chain quality check. Wrap your chain in a test that runs a small dataset through it and applies multiple evaluators (correctness, conciseness, relevance). Fail CI if any evaluator drops below threshold.

Pattern 2: model comparison. Use pairwise evaluators to compare two versions of a chain. Useful when changing models or prompts.

Pattern 3: production sampling. Configure online evaluators on production traces with a low sampling rate. Track quality over time without paying full eval cost.

Pattern 4: agent trajectory analysis. For agents, use trajectory evaluators alongside string evaluators. Trajectory catches process issues; string catches output issues.

---

## Cost Optimization

Each evaluator that uses an LLM judge costs money. For large datasets, costs add up.

Use cheaper judges where possible. GPT-4o-mini is acceptable for low-stakes graders.

Cache results by input hash. If the same example has been evaluated before with the same code, reuse the score.

Sample production traces rather than evaluating all. 10% sampling is usually enough.

Run light suites on PRs and full suites nightly.

---

## Common Pitfalls

Inconsistent judge models. The default judge for criteria evaluators varies by LangChain version. Pin the judge explicitly for reproducibility.

Treating embedding distance as ground truth. Embeddings capture meaning, not correctness. A confident lie can have high embedding similarity to the truth.

Skipping reference data for labeled evaluators. Without a reference, the judge falls back to its own knowledge, which may be wrong.

Forgetting to filter LangSmith experiments. Once you run many experiments, the dashboard gets noisy. Use tags to filter.

---

## Migrating from Other Frameworks

If you currently use Ragas or OpenAI Evals and want to move to LangChain evaluators:

Datasets convert easily. Ragas datasets are HF Datasets; OpenAI Evals datasets are JSONL. Both map to LangSmith datasets.

Graders need to be reimplemented. Most have direct equivalents. Custom graders need to be ported to the StringEvaluator interface.

Production monitoring is more turnkey with LangSmith. If you previously exported scores to your own dashboard, LangSmith may save you the work.

---

## Further Resources

- LangChain evaluator documentation.
- LangSmith dashboard tour at /blog (LangSmith Evaluation Platform Guide).
- Browse LLM evaluation skills at /skills.

---

## Conclusion

LangChain evaluators are the path of least resistance for LangChain users. Three evaluator categories, dozens of built-in types, and seamless LangSmith integration cover most evaluation needs without leaving the ecosystem. Start with the criteria evaluator on a small dataset, layer in pairwise comparisons as you iterate on prompts, and configure online evaluators when you ship to production. For deeper resources, browse [/skills](/skills) and the [/blog](/blog).
`,
};
