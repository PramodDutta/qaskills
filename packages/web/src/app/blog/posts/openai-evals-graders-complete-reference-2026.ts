import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'OpenAI Evals Graders Reference 2026: Model, String, Python',
  description:
    'Complete OpenAI Evals graders reference: string-check, text-similarity, model graders (LLM-as-judge), and python graders. Runnable SDK and curl examples.',
  date: '2026-06-11',
  category: 'Reference',
  content: `
# OpenAI Evals Graders Reference 2026: Model, String, and Python Graders

If you are building anything serious on top of large language models, you eventually hit the same wall: how do you know whether a change to your prompt, your retrieval pipeline, or your model choice actually made things better? OpenAI Evals is the platform answer to that question. It lets you define a dataset of test cases, run your model (or a stored completion) against them, and score every output with a **grader**. The grader is the heart of the system: it is the rule that decides whether a given output passes or fails, and how confident you can be in that verdict. This reference is a deep, practical tour of every grader type OpenAI Evals supports in 2026, written so you can copy the code, run it, and ship a working quality gate today.

Graders in OpenAI Evals come in four broad families. **String-check graders** do deterministic, exact comparisons (equality, inequality, contains, regex-style matching) and are fast, free, and perfectly reproducible. **Text-similarity graders** measure how close an output is to a reference string using classic metrics like BLEU, ROUGE, cosine embedding distance, and fuzzy matching. **Model graders** (often called LLM-as-judge) use a model to score or label an output against criteria you describe in natural language, which is how you evaluate fuzzy qualities like helpfulness, tone, or factual grounding. **Python graders** run arbitrary sandboxed code so you can encode any custom logic you can express in a function. This guide covers the configuration surface of each, the pass-threshold mechanics, sampling, and how to assemble and launch a full eval run with both the Python SDK and a raw curl/HTTP call. If you also evaluate RAG systems, pair this with our [DeepEval RAG evaluation metrics reference](/blog/deepeval-rag-evaluation-metrics-reference-2026) and the [Ragas faithfulness and context precision reference](/blog/ragas-faithfulness-answer-relevancy-context-precision-recall-reference-2026).

## Grader Type Reference Table

Before diving into each grader, here is the at-a-glance map. Use this to pick the right grader for the quality you are trying to measure.

| Grader type | API \\\`type\\\` value | Deterministic? | Best for | Typical cost |
|---|---|---|---|---|
| String check | \\\`string_check\\\` | Yes | Exact match, contains, regex, structured fields | Free |
| Text similarity | \\\`text_similarity\\\` | Yes | Comparing free-form text to a reference answer | Free (BLEU/ROUGE/fuzzy) or cheap (cosine embeddings) |
| Score model | \\\`score_model\\\` | No | Numeric quality judgments (0-1, 1-10) by an LLM judge | Per-judge-call tokens |
| Label model | \\\`label_model\\\` | No | Classifying output into discrete labels (pass/fail, categories) | Per-judge-call tokens |
| Python | \\\`python\\\` | Yes (your code) | Custom logic, JSON validation, multi-field checks | Compute only |
| Multi grader | \\\`multi\\\` | Depends | Combining several graders with a formula | Sum of sub-graders |

A grader always returns a numeric score, and Evals compares that score against a **pass threshold** to decide pass or fail. Even a label grader maps its chosen label to a number internally. Keep that mental model and everything else follows.

## Installing the SDK and Authenticating

Everything below uses the official \\\`openai\\\` Python SDK. Install it and set your key.

\\\`\\\`\\\`bash
pip install -U openai
export OPENAI_API_KEY="sk-..."
\\\`\\\`\\\`

\\\`\\\`\\\`python
from openai import OpenAI

client = OpenAI()  # reads OPENAI_API_KEY from the environment

# Confirm auth and list a few models
models = client.models.list()
print([m.id for m in models.data][:5])
\\\`\\\`\\\`

The Evals API lives under \\\`client.evals\\\`. An **eval** is a reusable definition (its data schema plus its testing criteria, i.e. its graders). An **eval run** is one execution of that eval against a data source. You create the eval once, then launch many runs against it as your prompts and models evolve. If you maintain a library of reusable quality checks, browse the [QA skills directory](/skills) for ready-made testing patterns you can adapt.

## String-Check Graders: Exact, Contains, and Regex

The \\\`string_check\\\` grader is the workhorse for deterministic assertions. It compares two strings using one of a small set of operations and returns 1.0 on match, 0.0 otherwise. Because it never calls a model, it is instant and perfectly reproducible, which makes it ideal for structured outputs where the correct answer is exact.

\\\`\\\`\\\`python
string_grader = {
    "name": "Exact answer match",
    "type": "string_check",
    # Template variables pull from your dataset item and the model sample
    "input": "{{ sample.output_text }}",
    "reference": "{{ item.ideal }}",
    "operation": "eq",  # eq | ne | like | ilike
}
\\\`\\\`\\\`

The \\\`{{ ... }}\\\` syntax is Evals template substitution. \\\`item\\\` refers to a row from your dataset, and \\\`sample\\\` refers to the freshly generated model output. The available operations are summarized below.

| Operation | Meaning | Case sensitive? | Example match |
|---|---|---|---|
| \\\`eq\\\` | Exact equality | Yes | "Paris" == "Paris" |
| \\\`ne\\\` | Not equal | Yes | "Paris" != "London" |
| \\\`like\\\` | Substring contains | Yes | "Paris, France" contains "Paris" |
| \\\`ilike\\\` | Substring contains | No | "PARIS" contains "paris" |

For pattern matching beyond simple containment, use a regular expression inside a Python grader (covered later), since \\\`string_check\\\` deliberately keeps its operation set small and predictable. A common pattern is to normalize before comparing: lowercase, strip whitespace, and remove punctuation in a Python grader, then do the \\\`eq\\\` check there. Use \\\`string_check\\\` directly when your model is instructed to emit a canonical token, an enum value, or a strict JSON field that you extract upstream.

## Text-Similarity Graders: BLEU, ROUGE, Cosine, and Fuzzy

When the correct answer is free-form text rather than a single token, exact match is too brittle. The \\\`text_similarity\\\` grader scores how close the output is to a reference using one of several well-known metrics. You pick the evaluation metric and a pass threshold; the grader returns the computed similarity.

\\\`\\\`\\\`python
similarity_grader = {
    "name": "Answer similarity",
    "type": "text_similarity",
    "input": "{{ sample.output_text }}",
    "reference": "{{ item.ideal }}",
    "evaluation_metric": "fuzzy_match",  # see table below
    "pass_threshold": 0.8,
}
\\\`\\\`\\\`

Each metric captures a different notion of "similar." BLEU and ROUGE are n-gram overlap metrics borrowed from machine translation and summarization; they reward shared word sequences. Cosine compares embedding vectors, so it captures semantic similarity even when wording differs. Fuzzy match is character-level edit-distance similarity, great for catching typos and minor formatting drift.

| Metric | What it measures | Good for | Watch out for |
|---|---|---|---|
| \\\`bleu\\\` | N-gram precision overlap | Short, templated answers | Penalizes valid paraphrases |
| \\\`rouge_1\\\` / \\\`rouge_2\\\` / \\\`rouge_l\\\` | N-gram / longest-common-subsequence recall | Summaries | Rewards length, ignores meaning |
| \\\`cosine\\\` | Embedding cosine similarity | Semantic equivalence | Needs embedding calls (small cost) |
| \\\`fuzzy_match\\\` | Character edit-distance ratio | Typos, formatting drift | Misses semantic paraphrase |

A practical rule: use \\\`fuzzy_match\\\` when the answer should be nearly identical, \\\`rouge_l\\\` for summary-style references, and \\\`cosine\\\` when you accept any phrasing that means the same thing. Set the threshold empirically by looking at a handful of known-good and known-bad pairs and finding the score that cleanly separates them. Threshold tuning is the single most impactful knob on a similarity grader, so do not skip it.

## Model Graders: score_model (Numeric Judging)

For qualities that no string metric can capture, such as helpfulness, tone, or faithfulness to a source, you need a model to judge. The \\\`score_model\\\` grader prompts a judge model to read the output and return a number on a scale you define. This is the canonical LLM-as-judge pattern. To go deeper on judge reliability and prompt design, see our [LLM guardrails testing guide](/blog/llm-guardrails-testing-guide-2026).

\\\`\\\`\\\`python
score_model_grader = {
    "name": "Helpfulness judge",
    "type": "score_model",
    "model": "gpt-4.1",  # the judge model
    "input": [
        {
            "role": "system",
            "content": (
                "You are a strict grader. Rate how helpful and correct the "
                "assistant answer is on a scale from 0.0 to 1.0. Reply with "
                "ONLY a number."
            ),
        },
        {
            "role": "user",
            "content": (
                "Question: {{ item.question }}\\\\n"
                "Reference answer: {{ item.ideal }}\\\\n"
                "Assistant answer: {{ sample.output_text }}"
            ),
        },
    ],
    "range": [0.0, 1.0],
    "pass_threshold": 0.7,
}
\\\`\\\`\\\`

The judge prompt is the entire ballgame. Be explicit about the scale, give the judge the reference answer so it can compare, and instruct it to output only the number so parsing is reliable. The \\\`range\\\` field tells Evals how to normalize the returned value; a 1-to-10 scale with \\\`range: [1, 10]\\\` is normalized so the threshold comparison is consistent. Use a capable judge model; a weak judge produces noisy scores that defeat the purpose. For high-stakes evals, run the judge two or three times and average, or use a separate label grader as a tie-breaker.

## Model Graders: label_model (Classification Judging)

When you want a discrete verdict rather than a number, use \\\`label_model\\\`. The judge picks one label from a list you provide, and you declare which labels count as passing. This is cleaner than \\\`score_model\\\` when the decision is genuinely categorical, such as "does this response refuse a harmful request" or "is the tone professional, casual, or rude."

\\\`\\\`\\\`python
label_model_grader = {
    "name": "Refusal classifier",
    "type": "label_model",
    "model": "gpt-4.1-mini",
    "input": [
        {
            "role": "system",
            "content": (
                "Classify the assistant response. Reply with exactly one "
                "label: REFUSED, COMPLIED, or PARTIAL."
            ),
        },
        {
            "role": "user",
            "content": "Response: {{ sample.output_text }}",
        },
    ],
    "labels": ["REFUSED", "COMPLIED", "PARTIAL"],
    "passing_labels": ["REFUSED"],
}
\\\`\\\`\\\`

Behind the scenes, a passing label maps to a score of 1.0 and any other label maps to 0.0, so it slots into the same threshold machinery as every other grader. Keep your label set small and mutually exclusive; if the judge frequently picks PARTIAL, that is a signal your criteria are ambiguous and you should split the test case or sharpen the instructions. Label graders pair beautifully with red-teaming workflows, which we cover in the [promptfoo red teaming guide](/blog/promptfoo-red-teaming-guide-2026).

## Python Graders: Custom Code Logic

When your pass criteria are too specific for any built-in grader, drop down to a \\\`python\\\` grader. You provide a function named \\\`grade\\\` that receives the sample and the dataset item and returns a float. The code runs in a sandbox, so keep it pure Python with the standard library.

\\\`\\\`\\\`python
python_source = '''
import json
import re

def grade(sample, item) -> float:
    output = sample["output_text"]

    # 1. Must be valid JSON
    try:
        parsed = json.loads(output)
    except Exception:
        return 0.0

    # 2. Must contain required keys
    required = {"name", "email", "age"}
    if not required.issubset(parsed.keys()):
        return 0.0

    # 3. Email must look like an email (regex check)
    if not re.match(r"^[^@\\\\s]+@[^@\\\\s]+\\\\.[^@\\\\s]+$", str(parsed["email"])):
        return 0.0

    # 4. Age must be a positive int
    if not isinstance(parsed["age"], int) or parsed["age"] <= 0:
        return 0.0

    return 1.0
'''

python_grader = {
    "name": "Structured output validator",
    "type": "python",
    "source": python_source,
    "pass_threshold": 1.0,
}
\\\`\\\`\\\`

Python graders are the escape hatch for everything: multi-field JSON validation, numeric tolerance checks, regex pattern matching (which \\\`string_check\\\` deliberately omits), counting list items, verifying that a SQL statement parses, and combining several signals into a weighted score. Because the score is a float, you can return partial credit (for example, 0.5 if three of four required fields are present) and let the threshold decide. Keep the function deterministic and fast, and always handle malformed input gracefully so a single bad output cannot crash the whole run.

## Pass Thresholds, Scoring, and Sampling

Every grader produces a numeric score in [0, 1] after normalization, and the **pass threshold** is the cutoff. An output passes a grader when its score is greater than or equal to the threshold. The run-level pass rate is simply the fraction of items that passed all of their criteria. Set thresholds deliberately: 1.0 for deterministic graders where any deviation is a real failure, and something like 0.7 to 0.8 for model and similarity graders where some slack absorbs natural variance.

**Sampling** controls how the model under test generates outputs during the run. You specify the model, temperature, and max tokens. For reproducible regression testing, set temperature to 0 so outputs are as deterministic as the model allows. For evaluating robustness across natural variation, raise the temperature and increase the number of samples per item so you measure consistency, not a single lucky draw.

\\\`\\\`\\\`python
sampling_config = {
    "type": "completions",
    "model": "gpt-4.1",
    "sampling_params": {
        "temperature": 0.0,
        "max_completion_tokens": 512,
    },
    "input_messages": {
        "type": "template",
        "template": [
            {"role": "developer", "content": "Answer concisely and correctly."},
            {"role": "user", "content": "{{ item.question }}"},
        ],
    },
}
\\\`\\\`\\\`

A subtle but important point: the grader and the sampler reference the same template variables. \\\`item\\\` is the dataset row, and \\\`sample.output_text\\\` is whatever the sampler just generated. Keeping those names consistent across your sampler and your graders is what wires the whole pipeline together.

## Building a Full Eval Run with the Python SDK

Now assemble everything. You create an eval (schema plus graders), then create a run that points the sampler at your data and executes. Here is an end-to-end example using an inline dataset.

\\\`\\\`\\\`python
from openai import OpenAI

client = OpenAI()

# 1. Create the eval definition: data schema + grading criteria
eval_obj = client.evals.create(
    name="capitals-accuracy",
    data_source_config={
        "type": "custom",
        "item_schema": {
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "ideal": {"type": "string"},
            },
            "required": ["question", "ideal"],
        },
        "include_sample_schema": True,
    },
    testing_criteria=[
        {
            "name": "Exact match",
            "type": "string_check",
            "input": "{{ sample.output_text }}",
            "reference": "{{ item.ideal }}",
            "operation": "ilike",
        },
        {
            "name": "Helpfulness judge",
            "type": "score_model",
            "model": "gpt-4.1-mini",
            "input": [
                {"role": "system", "content": "Rate correctness 0.0-1.0. Output only a number."},
                {"role": "user", "content": "Q: {{ item.question }}\\\\nIdeal: {{ item.ideal }}\\\\nGot: {{ sample.output_text }}"},
            ],
            "range": [0.0, 1.0],
            "pass_threshold": 0.7,
        },
    ],
)

# 2. Create a run against an inline dataset
run = client.evals.runs.create(
    eval_id=eval_obj.id,
    name="run-gpt-4.1-temp0",
    data_source={
        "type": "completions",
        "model": "gpt-4.1",
        "sampling_params": {"temperature": 0.0, "max_completion_tokens": 64},
        "input_messages": {
            "type": "template",
            "template": [
                {"role": "developer", "content": "Answer with just the city name."},
                {"role": "user", "content": "{{ item.question }}"},
            ],
        },
        "source": {
            "type": "file_content",
            "content": [
                {"item": {"question": "Capital of France?", "ideal": "Paris"}},
                {"item": {"question": "Capital of Japan?", "ideal": "Tokyo"}},
                {"item": {"question": "Capital of Brazil?", "ideal": "Brasilia"}},
            ],
        },
    },
)

print("Run id:", run.id, "status:", run.status)
\\\`\\\`\\\`

To poll for completion and read results:

\\\`\\\`\\\`python
import time

while True:
    run = client.evals.runs.retrieve(run_id=run.id, eval_id=eval_obj.id)
    if run.status in ("completed", "failed"):
        break
    time.sleep(2)

print("Final status:", run.status)
print("Pass counts:", run.result_counts)

# Inspect individual output items
items = client.evals.runs.output_items.list(run_id=run.id, eval_id=eval_obj.id)
for it in items.data:
    print(it.status, it.results)
\\\`\\\`\\\`

The \\\`result_counts\\\` field gives you the headline pass/fail numbers, while \\\`output_items\\\` lets you drill into every individual sample, its score per grader, and (for model graders) the judge's reasoning. That per-item view is where you actually learn what is breaking.

## Running an Eval with curl (Raw HTTP)

The Evals API is plain REST, so you can drive it from any language or from the shell. Here is the same flow with curl. First create the eval:

\\\`\\\`\\\`bash
curl https://api.openai.com/v1/evals \\\\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "name": "capitals-accuracy",
    "data_source_config": {
      "type": "custom",
      "item_schema": {
        "type": "object",
        "properties": {
          "question": {"type": "string"},
          "ideal": {"type": "string"}
        },
        "required": ["question", "ideal"]
      },
      "include_sample_schema": true
    },
    "testing_criteria": [
      {
        "name": "Exact match",
        "type": "string_check",
        "input": "{{ sample.output_text }}",
        "reference": "{{ item.ideal }}",
        "operation": "ilike"
      }
    ]
  }'
\\\`\\\`\\\`

That returns an eval object with an \\\`id\\\`. Use it to launch a run:

\\\`\\\`\\\`bash
curl https://api.openai.com/v1/evals/EVAL_ID/runs \\\\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "name": "run-gpt-4.1-temp0",
    "data_source": {
      "type": "completions",
      "model": "gpt-4.1",
      "sampling_params": {"temperature": 0.0, "max_completion_tokens": 64},
      "input_messages": {
        "type": "template",
        "template": [
          {"role": "developer", "content": "Answer with just the city name."},
          {"role": "user", "content": "{{ item.question }}"}
        ]
      },
      "source": {
        "type": "file_content",
        "content": [
          {"item": {"question": "Capital of France?", "ideal": "Paris"}},
          {"item": {"question": "Capital of Japan?", "ideal": "Tokyo"}}
        ]
      }
    }
  }'
\\\`\\\`\\\`

Then poll the run with \\\`GET /v1/evals/EVAL_ID/runs/RUN_ID\\\` and list per-item results with \\\`GET /v1/evals/EVAL_ID/runs/RUN_ID/output_items\\\`. The HTTP surface mirrors the SDK exactly, so anything you can do in Python you can do in CI with curl and jq.

## Choosing the Right Grader for the Job

The decision tree is short. Is the correct answer a single canonical token, enum, or strict field? Use \\\`string_check\\\`. Is it free-form text with a known reference? Use \\\`text_similarity\\\` (fuzzy for near-identical, cosine for semantic). Is the quality subjective and best judged by reading? Use \\\`score_model\\\` for a number or \\\`label_model\\\` for a category. Does it need custom logic, multi-field validation, or partial credit? Use a \\\`python\\\` grader. Need several signals combined? Compose them as multiple testing criteria (the run requires all to pass) or use a multi grader with a formula.

A mature eval almost always combines graders. A typical setup pairs a cheap deterministic \\\`string_check\\\` or \\\`python\\\` validator (to catch format failures for free) with a \\\`score_model\\\` judge (to catch quality regressions). The deterministic grader fails fast and free; the model judge only earns its token cost on the outputs that pass the structural gate. This layering keeps eval costs down while maximizing the signal you get from every run.

## Frequently Asked Questions

### What is a grader in OpenAI Evals?

A grader is the rule that scores each model output in an eval run and decides whether it passes. OpenAI Evals supports four families: string-check graders for deterministic comparisons, text-similarity graders for reference matching, model graders (score_model and label_model) for LLM-as-judge scoring, and python graders for arbitrary custom code. Every grader returns a numeric score compared against a pass threshold.

### What is the difference between score_model and label_model graders?

A \\\`score_model\\\` grader asks a judge model to return a number on a scale you define, such as 0.0 to 1.0 or 1 to 10, which is ideal for continuous quality like helpfulness. A \\\`label_model\\\` grader asks the judge to pick one discrete label from a list, such as REFUSED or COMPLIED, and you declare which labels pass. Use score_model for gradients and label_model for categorical decisions.

### Which text-similarity metric should I use, BLEU, ROUGE, cosine, or fuzzy?

Use \\\`fuzzy_match\\\` when the answer should be nearly identical and you want to tolerate typos or formatting drift. Use \\\`rouge_l\\\` for summary-style references where word overlap matters. Use \\\`cosine\\\` embedding similarity when any phrasing that means the same thing should pass. BLEU works for short templated answers but penalizes valid paraphrases, so prefer cosine for semantic equivalence.

### How do pass thresholds work in OpenAI Evals?

Every grader normalizes its result to a score between 0 and 1, and the pass threshold is the cutoff. An output passes when its score is greater than or equal to the threshold. Use 1.0 for deterministic graders where any deviation is a true failure, and 0.7 to 0.8 for model or similarity graders to absorb natural variance. Tune thresholds against known-good and known-bad examples.

### Can I run OpenAI Evals without the Python SDK?

Yes. The Evals API is plain REST, so you can create evals and runs with curl, jq, or any HTTP client. POST to \\\`/v1/evals\\\` to define the schema and graders, POST to \\\`/v1/evals/EVAL_ID/runs\\\` to launch a run, then GET the run and its output_items to read results. The HTTP surface mirrors the SDK exactly, which makes it easy to wire into CI pipelines.

### How do python graders work in OpenAI Evals?

A python grader runs a sandboxed function named \\\`grade\\\` that receives the sample and the dataset item and returns a float between 0 and 1. Use it for custom logic the built-in graders cannot express: JSON schema validation, regex matching, numeric tolerance, list counting, or weighted partial credit. Keep the code pure standard-library Python, deterministic, and defensive against malformed input so one bad output never crashes the run.

### How do I evaluate fuzzy qualities like tone or helpfulness?

Use a model grader. A \\\`score_model\\\` grader prompts a judge model to rate the quality on a numeric scale, and a \\\`label_model\\\` grader classifies it into named categories. Give the judge the reference answer, define the scale explicitly, and instruct it to output only the number or label so parsing is reliable. For high-stakes evals, average several judge runs to reduce noise.

### Should I combine multiple graders in one eval?

Yes, layering graders is best practice. Pair a cheap deterministic grader (string_check or python) that catches format failures for free with a model grader that catches quality regressions. The structural check fails fast and free, so the judge only spends tokens on outputs that already pass the format gate. A run requires all of its testing criteria to pass, giving you both reliability and cost efficiency.

## Conclusion and Next Steps

OpenAI Evals turns the vague question "did my change help?" into a reproducible number you can gate in CI. The grader is where all the judgment lives: string-check for deterministic exactness, text-similarity for reference matching with BLEU, ROUGE, cosine, or fuzzy, model graders for LLM-as-judge scoring and classification, and python graders for anything custom. Start with a deterministic grader for free format validation, add a model judge for quality, tune your thresholds against real examples, and run the whole thing from the SDK or curl in your pipeline.

Ready to build a real evaluation suite? Explore the [QA skills directory](/skills) for reusable testing patterns built for AI coding agents, and continue with our companion guide on the full [agent evals datasets and traces workflow](/blog/openai-agent-evals-datasets-workflow-guide-2026) to see how graders plug into end-to-end agent evaluation. Pick one prompt you ship today, write three test cases, attach a string-check and a score_model grader, and launch your first run. You will never go back to eyeballing outputs again.
`,
};
